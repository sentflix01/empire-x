/**
 * routes/internalJobs.ts — run scheduled jobs on request.
 *
 * The backend runs on a host that sleeps when idle, so in-process timers can
 * stop for hours. A scheduler (.github/workflows/scheduled-jobs.yml) calls
 * POST /api/internal/jobs/:name every 15 minutes; the request also wakes the
 * server. The in-process timers stay as a fallback: every job is idempotent.
 *
 * Disabled (404) unless JOBS_SECRET is set (32+ characters). Callers send
 * `Authorization: Bearer <JOBS_SECRET>`. A Postgres advisory lock keeps two
 * runs of the same job from overlapping across instances.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import logger from '../lib/logger';
import pool from '../db/pool';
import { runDirectOrderExpiry } from '../lib/directOrderExpiry';
import { deleteExpiredStories } from '../db/cleanupStories';

const { runBusinessSubscriptionLifecycle } = require('../scripts/business-subscription-lifecycle') as {
  runBusinessSubscriptionLifecycle: () => Promise<unknown>;
};

export const JOBS: Record<string, { lockKey: number; run: () => Promise<unknown> }> = {
  'subscription-lifecycle': { lockKey: 7_401_001, run: () => runBusinessSubscriptionLifecycle() },
  'direct-order-expiry': { lockKey: 7_401_002, run: () => runDirectOrderExpiry() },
  'stories-cleanup': { lockKey: 7_401_003, run: () => deleteExpiredStories() },
};

const MIN_SECRET_LENGTH = 32;

/** Constant-time check of the bearer token against JOBS_SECRET. */
export function isAuthorizedJobRequest(header: string | undefined, secret = process.env.JOBS_SECRET): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !header?.startsWith('Bearer ')) return false;
  const given = crypto.createHash('sha256').update(header.slice(7)).digest();
  const expected = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(given, expected);
}

const router = Router();

router.post('/jobs/:name', async (req: Request, res: Response) => {
  const secret = process.env.JOBS_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) { res.status(404).json({ error: 'Not found' }); return; }
  if (!isAuthorizedJobRequest(req.get('authorization'), secret)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const job = JOBS[req.params.name];
  if (!job) { res.status(404).json({ error: 'Unknown job' }); return; }

  const client = await pool.connect();
  const started = Date.now();
  try {
    const { rows } = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [job.lockKey]);
    if (!rows[0]?.locked) { res.status(409).json({ job: req.params.name, status: 'already_running' }); return; }
    try {
      const result = await job.run();
      const ms = Date.now() - started;
      logger.info({ job: req.params.name, ms }, 'Scheduled job finished');
      res.json({ job: req.params.name, status: 'done', ms, result: result ?? null });
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [job.lockKey]).catch(() => undefined);
    }
  } catch (err) {
    logger.error({ job: req.params.name, err: (err as Error).message }, 'Scheduled job failed');
    res.status(500).json({ job: req.params.name, status: 'failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
module.exports.JOBS = JOBS;
module.exports.isAuthorizedJobRequest = isAuthorizedJobRequest;
