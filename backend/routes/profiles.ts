import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord } from '../utils/crud';
import { getRedis } from '../lib/redis';

const router = Router();

const COVER_POS_RE = /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;
const COVER_POSITION_FIELDS = ['cover_position', 'business_cover_position'] as const;

function sanitizeCoverPositions(body: Record<string, unknown>): Record<string, unknown> {
  for (const k of COVER_POSITION_FIELDS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === '') continue;
    if (typeof v !== 'string' || !COVER_POS_RE.test(v)) delete body[k];
  }
  return body;
}

async function syncUserName(userId: string, displayName: unknown): Promise<void> {
  if (typeof displayName !== 'string' || !displayName.trim()) return;
  await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [displayName.trim(), userId]);
}

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    if (!rows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.get('/by-user/:userId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT up.*, u.is_seed FROM user_profiles up JOIN users u ON u.id = up.user_id WHERE up.user_id = $1`,
      [req.params.userId],
    );
    if (!rows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.get('/me/follows', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT followed_id FROM follows WHERE follower_id = $1', [req.user!.id]);
    res.json(rows.map((r: { followed_id: string }) => r.followed_id));
  } catch { res.status(500).json({ error: 'Failed to fetch follows' }); }
});

router.get('/follows', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT followed_id FROM follows WHERE follower_id = $1', [req.user!.id]);
    res.json(rows.map((r: { followed_id: string }) => r.followed_id));
  } catch { res.status(500).json({ error: 'Failed to fetch follows' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT up.*, u.is_seed FROM user_profiles up JOIN users u ON u.id = up.user_id WHERE up.id = $1`,
      [req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const redis = getRedis();
  const { user_id, profile_type, sort = '-created_at', limit = 50 } = req.query as Record<string, string>;
  const cacheKey = `cache:profiles:list:${new URLSearchParams({ ...req.query as Record<string, string>, realOnly: req.realOnly ? '1' : '0' }).toString()}`;
  if (!redis.isNoOp) {
    try {
      const cached = await (redis as RedisClient).get(cacheKey);
      if (cached) { res.set('X-Cache', 'HIT'); res.json(JSON.parse(cached)); return; }
    } catch { /* fall through */ }
  }
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (user_id)      { values.push(user_id);      conditions.push(`up.user_id = $${values.length}`); }
    if (profile_type) { values.push(profile_type); conditions.push(`up.profile_type = $${values.length}`); }
    if (req.realOnly) conditions.push('u.is_seed = FALSE');
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(String(limit), 10) || 50, 500);
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    // Explicit allowlist — never interpolate unsanitized user input as a column name
    const SORT_ALLOWLIST = new Set(['created_at', 'updated_at', 'follower_count', 'following_count', 'display_name']);
    const rawCol = sort.replace(/^-/, '');
    const sortCol = SORT_ALLOWLIST.has(rawCol) ? rawCol : 'created_at';
    values.push(lim);
    const { rows } = await pool.query(
      `SELECT up.*, u.is_seed FROM user_profiles up JOIN users u ON u.id = up.user_id
       ${whereClause} ORDER BY up.${sortCol} ${sortDir} LIMIT $${values.length}`,
      values,
    );
    if (!redis.isNoOp) (redis as RedisClient).setex(cacheKey, 60, JSON.stringify(rows)).catch(() => undefined);
    res.set('X-Cache', 'MISS');
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch profiles' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    if (existing.rows.length) { res.status(409).json({ error: 'Profile already exists. Use PUT to update.' }); return; }
    const profile = await createRecord('user_profiles', { ...(req.body as Record<string, unknown>), user_id: req.user!.id });
    await syncUserName(req.user!.id, (req.body as Record<string, unknown>).display_name);
    res.status(201).json(profile);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create profile error');
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

router.put('/me/upsert', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: existing } = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    const body = sanitizeCoverPositions({ ...(req.body as Record<string, unknown>) });
    let profile;
    if (existing.length) {
      profile = await updateRecord('user_profiles', existing[0].id as string, { ...body, user_id: req.user!.id });
    } else {
      profile = await createRecord('user_profiles', { ...body, user_id: req.user!.id });
    }
    await syncUserName(req.user!.id, body.display_name);
    res.json(profile);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Upsert profile error');
    res.status(500).json({ error: 'Failed to upsert profile' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<Record<string, unknown>>('user_profiles', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Profile not found' }); return; }
    if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const updated = await updateRecord('user_profiles', req.params.id, sanitizeCoverPositions({ ...(req.body as Record<string, unknown>) }));
    if (!updated) { res.status(404).json({ error: 'Profile not found' }); return; }
    await syncUserName(existing.user_id as string, (req.body as Record<string, unknown>).display_name);
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to update profile' }); }
});

router.patch('/me/ticker', requireAuth, async (req: Request, res: Response) => {
  const { ticker_text, ticker_type } = req.body as { ticker_text?: string; ticker_type?: string };
  const VALID_TYPES = ['none', 'contact', 'promo', 'news', 'location', 'custom', 'auto'];
  if (ticker_type !== undefined && !VALID_TYPES.includes(ticker_type)) {
    res.status(400).json({ error: `ticker_type must be one of: ${VALID_TYPES.join(', ')}` }); return;
  }
  try {
    const { rows: existing } = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [req.user!.id]);
    if (!existing.length) { res.status(404).json({ error: 'Profile not found. Create your profile first.' }); return; }
    const fields: string[] = [];
    const values: unknown[] = [];
    if (ticker_type !== undefined) { values.push(ticker_type); fields.push(`ticker_type = $${values.length}`); }
    if (ticker_text !== undefined) { values.push(ticker_text === '' ? null : ticker_text); fields.push(`ticker_text = $${values.length}`); }
    if (!fields.length) { res.status(400).json({ error: 'Provide ticker_text and/or ticker_type' }); return; }
    values.push(existing[0].id);
    const { rows } = await pool.query(
      `UPDATE user_profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, ticker_text, ticker_type`,
      values,
    );
    res.json(rows[0]);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Ticker update error');
    res.status(500).json({ error: 'Failed to update ticker' });
  }
});

router.post('/follow/:targetUserId', requireAuth, async (req: Request, res: Response) => {
  const { targetUserId } = req.params;
  if (targetUserId === req.user!.id) { res.status(400).json({ error: 'Cannot follow yourself' }); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user!.id, targetUserId],
    );
    if (existing.length) {
      await client.query('DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2', [req.user!.id, targetUserId]);
      await Promise.all([
        client.query('UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = $1', [req.user!.id]),
        client.query('UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = $1', [targetUserId]),
      ]);
      await client.query('COMMIT');
      res.json({ following: false }); return;
    }
    await client.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)', [req.user!.id, targetUserId]);
    await Promise.all([
      client.query('UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = $1', [req.user!.id]),
      client.query('UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = $1', [targetUserId]),
    ]);
    await client.query('COMMIT');
    res.json({ following: true });
  } catch (err) {
    // A dead connection makes ROLLBACK itself throw — swallow it so the
    // original failure still reaches the client as a 500.
    try { await client.query('ROLLBACK'); } catch { /* connection already gone */ }
    res.status(500).json({ error: 'Failed to toggle follow' });
  } finally {
    client.release();
  }
});

module.exports = router;
