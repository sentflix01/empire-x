import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { target_type } = req.query as Record<string, string>;
    const values: unknown[] = [req.user!.id];
    let filter = '';
    if (target_type) { values.push(target_type); filter = ` AND s.target_type=$${values.length}`; }

    // Enrich each save with title + thumbnail from its source table so the
    // Bookmarks page can render meaningful labels without extra API calls.
    const { rows } = await pool.query(
      `SELECT
         s.id,
         s.user_id,
         s.target_id,
         s.target_type,
         s.created_at,
         CASE s.target_type
           WHEN 'post'     THEN p.content
           WHEN 'product'  THEN pr.title
           WHEN 'showroom' THEN sr.title
           ELSE NULL
         END AS title,
         CASE s.target_type
           WHEN 'product'  THEN pr.images
           WHEN 'showroom' THEN sr.cover_image
           ELSE NULL
         END AS thumbnail_url
       FROM saves s
       LEFT JOIN posts     p  ON p.id  = s.target_id AND s.target_type = 'post'
       LEFT JOIN products  pr ON pr.id = s.target_id AND s.target_type = 'product'
       LEFT JOIN showrooms sr ON sr.id = s.target_id AND s.target_type = 'showroom'
       WHERE s.user_id=$1${filter}
       ORDER BY s.created_at DESC`,
      values,
    );

    // Normalise: for products the images column is a JSON array — extract first element
    const enriched = rows.map(r => ({
      ...r,
      thumbnail_url: (() => {
        if (!r.thumbnail_url) return null;
        try {
          const parsed = JSON.parse(r.thumbnail_url);
          return Array.isArray(parsed) ? (parsed[0] ?? null) : r.thumbnail_url;
        } catch {
          return r.thumbnail_url;
        }
      })(),
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saves' });
  }
});

router.post('/toggle', requireAuth, async (req: Request, res: Response) => {
  const { target_id, target_type } = req.body as Record<string, string>;
  if (!target_id || !target_type) { res.status(400).json({ error: 'target_id and target_type are required' }); return; }
  if (!['post', 'product', 'showroom'].includes(target_type)) { res.status(400).json({ error: 'Unsupported bookmark type' }); return; }
  try {
    const existing = await pool.query('SELECT id FROM saves WHERE user_id=$1 AND target_id=$2', [req.user!.id, target_id]);
    if (existing.rows.length) {
      await pool.query('DELETE FROM saves WHERE user_id=$1 AND target_id=$2', [req.user!.id, target_id]);
      res.json({ saved: false }); return;
    }
    await pool.query('INSERT INTO saves (user_id, target_id, target_type) VALUES ($1,$2,$3)', [req.user!.id, target_id, target_type]);
    res.json({ saved: true });
  } catch { res.status(500).json({ error: 'Failed to toggle save' }); }
});

router.get('/check/:targetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT id FROM saves WHERE user_id=$1 AND target_id=$2', [req.user!.id, req.params.targetId]);
    res.json({ saved: rows.length > 0 });
  } catch { res.json({ saved: false }); }
});

module.exports = router;
