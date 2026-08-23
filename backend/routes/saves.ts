import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { target_type } = req.query as Record<string, string>;
    const values: unknown[] = [req.user!.id];
    let query = 'SELECT * FROM saves WHERE user_id=$1';
    if (target_type) { values.push(target_type); query += ` AND target_type=$${values.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch saves' }); }
});

router.post('/toggle', requireAuth, async (req: Request, res: Response) => {
  const { target_id, target_type } = req.body as Record<string, string>;
  if (!target_id || !target_type) { res.status(400).json({ error: 'target_id and target_type are required' }); return; }
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
