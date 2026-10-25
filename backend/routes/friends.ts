import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { personProfileJoin } from '../lib/personProfile';

const router = Router();

router.get('/mutual', requireAuth, async (req: Request, res: Response) => {
  try {
    const realOnlyFilter = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const { rows } = await pool.query(
      `WITH
        follow_back AS (
          SELECT u.id AS user_id, up.display_name, up.avatar_url, up.headline, TRUE AS is_following, 0 AS mutual_count
          FROM follows f_them_to_me
          JOIN follows f_me_to_them ON f_me_to_them.follower_id=$1 AND f_me_to_them.followed_id=f_them_to_me.follower_id
          JOIN users u ON u.id=f_them_to_me.follower_id
          ${personProfileJoin('u.id', 'up', true)}
          WHERE f_them_to_me.followed_id=$1 AND u.id<>$1 ${realOnlyFilter}
        ),
        shared_conn AS (
          SELECT f2.follower_id AS user_id, COUNT(*) AS mutual_count
          FROM follows f1 JOIN follows f2 ON f2.followed_id=f1.followed_id AND f2.follower_id<>$1
          WHERE f1.follower_id=$1 GROUP BY f2.follower_id
        ),
        combined AS (
          SELECT u.id AS user_id, up.display_name, up.avatar_url, up.headline,
                 EXISTS(SELECT 1 FROM follows WHERE follower_id=$1 AND followed_id=u.id) AS is_following,
                 COALESCE(sc.mutual_count,0) AS mutual_count
          FROM shared_conn sc JOIN users u ON u.id=sc.user_id ${personProfileJoin('u.id', 'up', true)} WHERE u.id<>$1 ${realOnlyFilter}
          UNION SELECT * FROM follow_back
        ),
        deduped AS (
          SELECT DISTINCT ON (user_id) user_id, display_name, avatar_url, headline, is_following, mutual_count
          FROM combined ORDER BY user_id, mutual_count DESC
        )
      SELECT user_id, display_name, avatar_url, headline, is_following, mutual_count
      FROM deduped ORDER BY mutual_count DESC, display_name ASC LIMIT 50`,
      [req.user!.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch mutual friends' }); }
});

module.exports = router;
