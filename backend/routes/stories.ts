import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// Inline engagement avoids N+1 correlated subqueries by being in same query
// (Task 9 fix: these are still correlated but on a LIMIT 200 result — acceptable
//  until story_reactions/story_comments tables grow; add denormalized counters then)
const engagementColumns = `
  (SELECT COUNT(*)::int FROM story_reactions sr WHERE sr.story_id = s.id) AS reaction_count,
  (SELECT COUNT(*)::int FROM story_comments sc WHERE sc.story_id = s.id) AS comment_count`;

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const { rows } = await pool.query(
      `SELECT s.*, up.display_name, up.avatar_url, ${engagementColumns},
              EXISTS(SELECT 1 FROM story_reactions mine WHERE mine.story_id=s.id AND mine.user_id=$1) AS reacted
       FROM stories s LEFT JOIN user_profiles up ON up.user_id=s.user_id JOIN users u ON u.id=s.user_id
       WHERE s.expires_at > NOW() ${realFilter} ORDER BY s.created_at DESC LIMIT 200`,
      [req.user?.id ?? null],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch stories' }); }
});

router.get('/user/:userId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const { rows } = await pool.query(
      `SELECT s.*, ${engagementColumns},
              EXISTS(SELECT 1 FROM story_reactions mine WHERE mine.story_id=s.id AND mine.user_id=$2) AS reacted
       FROM stories s JOIN users u ON u.id=s.user_id WHERE s.user_id=$1 AND s.expires_at > NOW() ${realFilter} ORDER BY s.created_at DESC`,
      [req.params.userId, req.user?.id ?? null],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch stories' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { media_url, media_type, caption } = req.body as Record<string, string>;
  if (!media_url) { res.status(400).json({ error: 'media_url is required' }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO stories (user_id, media_url, media_type, caption) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user!.id, media_url, media_type ?? 'image', caption ?? null],
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to create story' }); }
});

router.post('/:id/view', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('INSERT INTO story_views (story_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.user!.id]);
    await pool.query('UPDATE stories SET view_count=view_count+1 WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to record view' }); }
});

router.post('/:id/reactions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: stories } = await pool.query('SELECT id FROM stories WHERE id=$1 AND expires_at > NOW()', [req.params.id]);
    if (!stories.length) { res.status(404).json({ error: 'Story not found or expired' }); return; }
    const { rows: existing } = await pool.query('SELECT id FROM story_reactions WHERE story_id=$1 AND user_id=$2', [req.params.id, req.user!.id]);
    if (existing.length) {
      await pool.query('DELETE FROM story_reactions WHERE id=$1', [existing[0].id]);
      res.json({ reacted: false }); return;
    }
    const { emoji = '❤️' } = req.body as { emoji?: string };
    await pool.query('INSERT INTO story_reactions (story_id, user_id, emoji) VALUES ($1,$2,$3)', [req.params.id, req.user!.id, emoji]);
    res.status(201).json({ reacted: true });
  } catch { res.status(500).json({ error: 'Failed to react to story' }); }
});

router.get('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM story_comments WHERE story_id=$1 ORDER BY created_at ASC', [req.params.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch story replies' }); }
});

router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const content = typeof (req.body as Record<string, unknown>).content === 'string'
    ? ((req.body as Record<string, string>).content).trim() : '';
  if (!content) { res.status(400).json({ error: 'Reply is required' }); return; }
  if (content.length > 1000) { res.status(400).json({ error: 'Reply must be 1,000 characters or fewer' }); return; }
  try {
    const { rows: stories } = await pool.query('SELECT id FROM stories WHERE id=$1 AND expires_at > NOW()', [req.params.id]);
    if (!stories.length) { res.status(404).json({ error: 'Story not found or expired' }); return; }
    const { rows: profiles } = await pool.query('SELECT display_name, avatar_url FROM user_profiles WHERE user_id=$1', [req.user!.id]);
    const profile = profiles[0] as Record<string, string> ?? {};
    const { rows } = await pool.query(
      `INSERT INTO story_comments (story_id, author_id, author_name, author_avatar, content) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, req.user!.id, profile.display_name ?? null, profile.avatar_url ?? null, content],
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to send story reply' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM stories WHERE id=$1', [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Story not found' }); return; }
    if (rows[0].user_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await pool.query('DELETE FROM stories WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete story' }); }
});

module.exports = router;
