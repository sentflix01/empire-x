import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';

const router = Router();

export async function syncHashtags(postId: string, content: string): Promise<void> {
  const tags = [...new Set((content.match(/#([a-zA-Z0-9_\u00C0-\u024F]+)/g) ?? []).map((t) => t.slice(1).toLowerCase()))];
  if (!tags.length) return;
  for (const tag of tags) {
    const { rows } = await pool.query(
      `INSERT INTO hashtags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET post_count=hashtags.post_count+1 RETURNING id`,
      [tag],
    );
    await pool.query(
      `INSERT INTO post_hashtags (post_id,hashtag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [postId, rows[0].id],
    );
  }
}

router.get('/trending', async (req: Request, res: Response) => {
  try {
    if (req.realOnly) {
      const { rows } = await pool.query(
        `SELECT h.name, COUNT(DISTINCT p.id)::int AS post_count
         FROM hashtags h JOIN post_hashtags ph ON ph.hashtag_id=h.id
         JOIN posts p ON p.id=ph.post_id JOIN users u ON u.id=p.author_id
         WHERE u.is_seed=FALSE AND u.is_demo=FALSE
         GROUP BY h.id,h.name ORDER BY post_count DESC LIMIT 30`,
      );
      res.json(rows);
      return;
    }
    const { rows } = await pool.query(
      `SELECT name, post_count FROM hashtags ORDER BY post_count DESC LIMIT 30`,
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch trending hashtags' }); }
});

router.get('/:name', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tag = req.params.name.toLowerCase().replace(/^#/, '');
    const { rows: hashtag } = await pool.query('SELECT * FROM hashtags WHERE name=$1', [tag]);
    if (!hashtag.length) { res.status(404).json({ error: 'Hashtag not found' }); return; }
    const realFilter = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const { rows: posts } = await pool.query(
      `SELECT p.* FROM posts p JOIN post_hashtags ph ON ph.post_id=p.id JOIN hashtags h ON h.id=ph.hashtag_id JOIN users u ON u.id=p.author_id WHERE h.name=$1 ${realFilter} ORDER BY p.created_at DESC LIMIT 50`,
      [tag],
    );
    let realTag = hashtag[0];
    if (req.realOnly) {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(DISTINCT p.id)::int AS post_count FROM posts p
         JOIN post_hashtags ph ON ph.post_id=p.id JOIN hashtags h ON h.id=ph.hashtag_id
         JOIN users u ON u.id=p.author_id WHERE h.name=$1 AND u.is_seed=FALSE AND u.is_demo=FALSE`,
        [tag],
      );
      realTag = { ...hashtag[0], post_count: countRows[0]?.post_count ?? 0 };
    }
    res.json({ hashtag: realTag, posts });
  } catch { res.status(500).json({ error: 'Failed to fetch hashtag posts' }); }
});

router.get('/:name/posts', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tag = req.params.name.toLowerCase().replace(/^#/, '');
    const { rows } = await pool.query(
      `SELECT p.* FROM posts p JOIN post_hashtags ph ON ph.post_id=p.id JOIN hashtags h ON h.id=ph.hashtag_id JOIN users u ON u.id=p.author_id WHERE h.name=$1 ${req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : ''} ORDER BY p.created_at DESC LIMIT 50`,
      [tag],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch hashtag posts' }); }
});

module.exports = router;
module.exports.syncHashtags = syncHashtags;
