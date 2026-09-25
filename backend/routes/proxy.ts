/**
 * routes/proxy.ts — Public Proxy Route
 *
 * GET /api/proxy/:showroomId/:sectionKey
 *
 * Public endpoint — no auth required.
 * Delegates all business logic to the Proxy Gateway Service (fetchSection).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { getRedis } from '../lib/redis';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/:showroomId/:sectionKey', optionalAuth, async (req: Request, res: Response) => {
  const { showroomId, sectionKey } = req.params;
  // Rate-limit key MUST come from req.ip (Express applies `trust proxy` and
  // validates the socket peer). Trusting a raw x-forwarded-for header lets
  // clients rotate fake values to bypass the quota entirely.
  const ip = req.ip ?? '0.0.0.0';
  const redis = getRedis();

  type FetchResult =
    | unknown[]
    | { rateLimited?: true; ssrfBlocked?: true; upstreamError?: true; timeout?: true; mappingFailed?: true; status?: number | null };

  let result: FetchResult;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchSection } = require('../services/proxyGateway') as { fetchSection: (pool: unknown, redis: unknown, opts: { showroomId: string; sectionKey: string; ip: string }) => Promise<FetchResult> };
    result = await fetchSection(pool, redis, { showroomId, sectionKey, ip });
  } catch {
    res.status(502).json({ error: 'upstream_error', status: null }); return;
  }

  if (Array.isArray(result)) { res.status(200).json(result); return; }

  // Stale-serve: upstream failed but last-known-good data exists (Patent 4 claim 3)
  const r0 = result as { items?: unknown[]; stale?: boolean };
  if (r0?.stale && Array.isArray(r0.items)) {
    res.set('X-Stale', 'true');
    res.set('Warning', '110 - Response is stale');
    res.status(200).json(r0.items);
    return;
  }

  const r = result as Record<string, unknown>;
  if (r.rateLimited)   { res.set('Retry-After', '60'); res.status(429).json({ error: 'rate_limit_exceeded' }); return; }
  if (r.ssrfBlocked)   { res.status(502).json({ error: 'upstream_blocked' }); return; }
  if (r.upstreamError) { res.status(502).json({ error: 'upstream_error', status: r.status ?? null }); return; }
  if (r.timeout)       { res.status(504).json({ error: 'upstream_timeout' }); return; }
  if (r.mappingFailed) { res.status(500).json({ error: 'mapping_failed' }); return; }

  res.status(502).json({ error: 'upstream_error', status: null });
});

module.exports = router;
