import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';
import { announcementLiveSql, guestPostSql } from '../lib/siteVisibility';

const router = Router();

export function extractHashtags(content: string): string[] {
  return [...new Set((content.match(/#([a-zA-Z0-9_\u00C0-\u024F]+)/g) ?? []).map((t) => t.slice(1).toLowerCase()))];
}

export async function syncHashtags(postId: string, content: string): Promise<void> {
  await linkHashtags(postId, extractHashtags(content));
}

/** Brings a post's hashtag links (and their post counts) in line with edited content. */
export async function resyncHashtags(postId: string, content: string): Promise<void> {
  const tags = extractHashtags(content);
  const { rows: current } = await pool.query<{ id: string; name: string }>(
    'SELECT h.id, h.name FROM post_hashtags ph JOIN hashtags h ON h.id = ph.hashtag_id WHERE ph.post_id = $1',
    [postId],
  );
  await unlinkHashtags(postId, current.filter((row) => !tags.includes(row.name)).map((row) => row.id));
  await linkHashtags(postId, tags.filter((tag) => !current.some((row) => row.name === tag)));
}

/** Removes a post's links to the given hashtags and decrements their post counts. */
export async function unlinkHashtags(postId: string, hashtagIds: string[]): Promise<void> {
  if (!hashtagIds.length) return;
  await pool.query('DELETE FROM post_hashtags WHERE post_id = $1 AND hashtag_id = ANY($2::uuid[])', [postId, hashtagIds]);
  await pool.query('UPDATE hashtags SET post_count = GREATEST(post_count - 1, 0) WHERE id = ANY($1::uuid[])', [hashtagIds]);
}

async function linkHashtags(postId: string, tags: string[]): Promise<void> {
  for (const tag of tags) {
    const { rows } = await pool.query(
      `INSERT INTO hashtags (name, post_count) VALUES ($1, 1) ON CONFLICT (name) DO UPDATE SET post_count=hashtags.post_count+1 RETURNING id`,
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
      `SELECT p.* FROM posts p JOIN post_hashtags ph ON ph.post_id=p.id JOIN hashtags h ON h.id=ph.hashtag_id JOIN users u ON u.id=p.author_id WHERE h.name=$1 ${req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : ''} AND ${req.user ? announcementLiveSql('p') : guestPostSql('p')} ORDER BY p.created_at DESC LIMIT 50`,
      [tag],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch hashtag posts' }); }
});

module.exports = router;
module.exports.syncHashtags = syncHashtags;
module.exports.extractHashtags = extractHashtags;
module.exports.resyncHashtags = resyncHashtags;
module.exports.unlinkHashtags = unlinkHashtags;
