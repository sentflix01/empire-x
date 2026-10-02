import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

router.get(
  '/people',
  requireAuth,
  cacheMiddleware('suggestions', 300, { varyByUser: true, varyByQuery: false }),
  async (req: Request, res: Response) => {
    const requesterId = req.user!.id;
    try {
      const { rows: scored } = await pool.query(
        `WITH requester AS (
           SELECT u.id, up.location FROM users u JOIN user_profiles up ON up.user_id=u.id WHERE u.id=$1
         ),
         mutual AS (
           SELECT f2.follower_id AS candidate_id, COUNT(*) AS mutual_count
           FROM follows f1 JOIN follows f2 ON f1.followed_id=f2.followed_id
           WHERE f1.follower_id=(SELECT id FROM requester) AND f2.follower_id<>(SELECT id FROM requester)
           GROUP BY f2.follower_id
         ),
         candidates AS (
           SELECT u.id AS user_id,
             COALESCE(up.display_name,u.full_name,u.email) AS display_name,
             up.avatar_url, up.location, COALESCE(up.follower_count,0) AS follower_count,
             u.is_seed, u.updated_at AS last_active_at, COALESCE(m.mutual_count,0) AS mutual_count,
             LEAST(COALESCE(m.mutual_count,0)*5,50)
               + CASE WHEN up.location=(SELECT location FROM requester) AND up.location IS NOT NULL AND up.location<>'' THEN 10 ELSE 0 END
               + CASE WHEN u.updated_at>=NOW()-INTERVAL '30 days' THEN 5 ELSE 0 END AS suggestion_score
           FROM users u
           LEFT JOIN user_profiles up ON up.user_id=u.id
           LEFT JOIN mutual m ON m.candidate_id=u.id
           WHERE u.id<>$1
             AND u.id NOT IN (SELECT followed_id FROM follows WHERE follower_id=$1)
             AND u.id NOT IN (SELECT target_id FROM dismissed_suggestions WHERE requester_id=$1)
             AND ($2::boolean=FALSE OR (u.is_seed=FALSE AND u.is_demo=FALSE))
         )
         SELECT user_id,display_name,avatar_url,location,follower_count,mutual_count,is_seed
         FROM candidates ORDER BY suggestion_score DESC, follower_count DESC, is_seed ASC, user_id LIMIT 20`,
        [requesterId, !!req.realOnly],
      );

      let results = scored;

      if (results.length < 20) {
        const needed = 20 - results.length;
        const existingIds = results.map((r: { user_id: string }) => r.user_id);
        const placeholders = existingIds.length
          ? existingIds.map((_: unknown, i: number) => `$${i + 3}`).join(',')
          : null;
        const fallbackSql = `
          SELECT u.id AS user_id, COALESCE(up.display_name,u.full_name,u.email) AS display_name,
                 up.avatar_url, up.location, COALESCE(up.follower_count,0) AS follower_count, u.is_seed, 0 AS mutual_count
          FROM users u LEFT JOIN user_profiles up ON up.user_id=u.id
          WHERE u.is_seed=FALSE AND u.is_demo=FALSE AND u.id<>$1
            AND u.id NOT IN (SELECT followed_id FROM follows WHERE follower_id=$1)
            AND u.id NOT IN (SELECT target_id FROM dismissed_suggestions WHERE requester_id=$1)
            ${placeholders ? `AND u.id NOT IN (${placeholders})` : ''}
          ORDER BY u.created_at DESC LIMIT $2`;
        const fallbackParams = [requesterId, needed, ...existingIds];
        const { rows: fallback } = await pool.query(fallbackSql, fallbackParams);
        results = [...results, ...fallback];
      }

      res.json(results);
    } catch { res.status(500).json({ error: 'Failed to fetch suggestions' }); }
  },
);

router.post('/dismiss/:targetUserId', requireAuth, async (req: Request, res: Response) => {
  if (req.params.targetUserId === req.user!.id) {
    res.status(400).json({ error: 'Cannot dismiss yourself' }); return;
  }
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM dismissed_suggestions WHERE requester_id=$1 AND target_id=$2',
      [req.user!.id, req.params.targetUserId],
    );
    if (existing.length) { res.json({ dismissed: true }); return; }
    await pool.query('INSERT INTO dismissed_suggestions (requester_id,target_id) VALUES ($1,$2)', [req.user!.id, req.params.targetUserId]);
    res.json({ dismissed: true });
  } catch { res.status(500).json({ error: 'Failed to dismiss suggestion' }); }
});

module.exports = router;
