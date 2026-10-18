/**
 * routes/social.ts — how you relate to another person, and your privacy.
 *
 *   GET    /api/social/relationship/:userId   following / muted / restricted / blocked
 *   PUT    /api/social/mute/:userId           their posts leave your feed (they aren't told)
 *   DELETE /api/social/mute/:userId
 *   PUT    /api/social/restrict/:userId       their comments on your posts are seen only by them
 *   DELETE /api/social/restrict/:userId
 *   PUT    /api/social/block/:userId          neither of you sees or interacts with the other
 *   DELETE /api/social/block/:userId
 *   GET    /api/social/privacy                my privacy settings
 *   PUT    /api/social/privacy
 *
 * Rules live in lib/socialGraph.ts. Blocks share the `blocks` table with
 * messaging (routes/messages.ts /block).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { invalidateCache } from '../middleware/cache';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function target(req: Request, res: Response): string | null {
  const id = req.params.userId;
  if (!UUID.test(id)) { res.status(422).json({ error: 'Invalid user id' }); return null; }
  if (id === req.user!.id) { res.status(422).json({ error: 'You can’t do that to yourself' }); return null; }
  return id;
}

router.get('/relationship/:userId', requireAuth, async (req: Request, res: Response) => {
  const other = target(req, res); if (!other) return;
  try {
    const me = req.user!.id;
    const { rows: [r] } = await pool.query(
      `SELECT
         EXISTS (SELECT 1 FROM follows WHERE follower_id=$1 AND followed_id=$2) AS following,
         EXISTS (SELECT 1 FROM user_mutes WHERE muter_id=$1 AND muted_id=$2) AS muted,
         EXISTS (SELECT 1 FROM user_restricts WHERE owner_id=$1 AND restricted_id=$2) AS restricted,
         EXISTS (SELECT 1 FROM blocks WHERE blocker_id=$1 AND blocked_id=$2) AS blocked,
         EXISTS (SELECT 1 FROM blocks WHERE blocker_id=$2 AND blocked_id=$1) AS blocked_me`,
      [me, other],
    );
    res.json(r);
  } catch { res.status(500).json({ error: 'Failed to load relationship' }); }
});

function toggle(table: 'user_mutes' | 'user_restricts', a: string, b: string, key: string) {
  return {
    on: async (req: Request, res: Response) => {
      const other = target(req, res); if (!other) return;
      try {
        await pool.query(`INSERT INTO ${table} (${a}, ${b}) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.user!.id, other]);
        invalidateCache('posts:list').catch(() => undefined);
        res.json({ [key]: true });
      } catch { res.status(500).json({ error: `Failed to update` }); }
    },
    off: async (req: Request, res: Response) => {
      const other = target(req, res); if (!other) return;
      try {
        await pool.query(`DELETE FROM ${table} WHERE ${a}=$1 AND ${b}=$2`, [req.user!.id, other]);
        invalidateCache('posts:list').catch(() => undefined);
        res.json({ [key]: false });
      } catch { res.status(500).json({ error: `Failed to update` }); }
    },
  };
}

const mute = toggle('user_mutes', 'muter_id', 'muted_id', 'muted');
router.put('/mute/:userId', requireAuth, mute.on);
router.delete('/mute/:userId', requireAuth, mute.off);

const restrict = toggle('user_restricts', 'owner_id', 'restricted_id', 'restricted');
router.put('/restrict/:userId', requireAuth, restrict.on);
router.delete('/restrict/:userId', requireAuth, restrict.off);

/** Blocking also ends follows both ways, like other social apps. */
router.put('/block/:userId', requireAuth, async (req: Request, res: Response) => {
  const other = target(req, res); if (!other) return;
  const me = req.user!.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [me, other]);
    const { rows: ended } = await client.query(
      'DELETE FROM follows WHERE (follower_id=$1 AND followed_id=$2) OR (follower_id=$2 AND followed_id=$1) RETURNING follower_id, followed_id',
      [me, other],
    );
    for (const f of ended as Array<{ follower_id: string; followed_id: string }>) {
      await client.query('UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = $1', [f.follower_id]);
      await client.query('UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = $1', [f.followed_id]);
    }
    await client.query('COMMIT');
    invalidateCache('posts:list').catch(() => undefined);
    res.json({ blocked: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* connection gone */ }
    logger.error({ err: (err as Error).message }, 'block failed');
    res.status(500).json({ error: 'Failed to block' });
  } finally { client.release(); }
});

router.delete('/block/:userId', requireAuth, async (req: Request, res: Response) => {
  const other = target(req, res); if (!other) return;
  try {
    await pool.query('DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [req.user!.id, other]);
    invalidateCache('posts:list').catch(() => undefined);
    res.json({ blocked: false });
  } catch { res.status(500).json({ error: 'Failed to unblock' }); }
});

/** People I blocked, muted or restricted, to undo from Privacy settings. */
router.get('/people', requireAuth, async (req: Request, res: Response) => {
  const kind = String(req.query.kind ?? '');
  const source: Record<string, [string, string, string]> = {
    blocked: ['blocks', 'blocker_id', 'blocked_id'],
    muted: ['user_mutes', 'muter_id', 'muted_id'],
    restricted: ['user_restricts', 'owner_id', 'restricted_id'],
  };
  const s = source[kind];
  if (!s) { res.status(422).json({ error: 'kind must be blocked, muted or restricted' }); return; }
  try {
    // Table and column names come from the fixed map above, never from the request.
    const { rows } = await pool.query(
      `SELECT t.${s[2]} AS user_id, up.display_name, up.avatar_url FROM ${s[0]} t
         LEFT JOIN user_profiles up ON up.user_id = t.${s[2]}
        WHERE t.${s[1]} = $1 ORDER BY t.created_at DESC LIMIT 500`,
      [req.user!.id],
    );
    res.set('Cache-Control', 'private, no-store');
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to load people' }); }
});

const PRIVACY_FIELDS = {
  profile_visibility: ['public', 'followers', 'private'],
  default_comment_policy: ['everyone', 'followers', 'off'],
  message_policy: ['everyone', 'followers', 'nobody'],
} as const;
const PRIVACY_COLUMNS = 'profile_visibility, searchable, default_comment_policy, message_policy, show_reactions';

router.get('/privacy', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT ${PRIVACY_COLUMNS} FROM user_profiles WHERE user_id=$1`, [req.user!.id]);
    res.set('Cache-Control', 'private, no-store');
    res.json(rows[0] ?? { profile_visibility: 'public', searchable: true, default_comment_policy: 'everyone', message_policy: 'everyone', show_reactions: true });
  } catch { res.status(500).json({ error: 'Failed to load privacy settings' }); }
});

router.put('/privacy', requireAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const sets: string[] = []; const values: unknown[] = [];
  for (const [key, allowed] of Object.entries(PRIVACY_FIELDS)) {
    if (body[key] === undefined) continue;
    if (!(allowed as readonly string[]).includes(String(body[key]))) { res.status(422).json({ error: `${key} must be one of: ${allowed.join(', ')}` }); return; }
    values.push(body[key]); sets.push(`${key} = $${values.length}`);
  }
  for (const key of ['searchable', 'show_reactions']) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'boolean') { res.status(422).json({ error: `${key} must be true or false` }); return; }
    values.push(body[key]); sets.push(`${key} = $${values.length}`);
  }
  if (!sets.length) { res.status(400).json({ error: 'No privacy settings provided' }); return; }
  try {
    values.push(req.user!.id);
    const { rows } = await pool.query(
      `UPDATE user_profiles SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = $${values.length} RETURNING ${PRIVACY_COLUMNS}`,
      values,
    );
    if (!rows.length) { res.status(404).json({ error: 'Profile not found' }); return; }
    invalidateCache('posts:list').catch(() => undefined);
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to save privacy settings' }); }
});

module.exports = router;
