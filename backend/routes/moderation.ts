import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/report', requireAuth, async (req: Request, res: Response) => {
  const { target_id, target_type, reason, details } = req.body as Record<string, string>;
  if (!target_id || !target_type || !reason) {
    res.status(400).json({ error: 'target_id, target_type, and reason are required' }); return;
  }
  const validTypes = ['user', 'post', 'product', 'comment', 'message'];
  if (!validTypes.includes(target_type)) {
    res.status(400).json({ error: `target_type must be one of: ${validTypes.join(', ')}` }); return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id,target_id,target_type,reason,details) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING *`,
      [req.user!.id, target_id, target_type, reason, details ?? null],
    );
    res.status(201).json({ reported: true, report: rows[0] ?? null });
  } catch { res.status(500).json({ error: 'Failed to submit report' }); }
});

router.get('/reports', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status = 'pending', limit = '50', offset = '0' } = req.query as Record<string, string>;
    const values: unknown[] = [];
    let where = '';
    if (status !== 'all') { values.push(status); where = `WHERE r.status=$${values.length}`; }
    values.push(parseInt(limit)); values.push(parseInt(offset));
    const { rows } = await pool.query(
      `SELECT r.*,u.email AS reporter_email FROM reports r LEFT JOIN users u ON u.id=r.reporter_id
       ${where} ORDER BY r.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch reports' }); }
});

router.put('/reports/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { status, resolution_note } = req.body as Record<string, string>;
  const valid = ['pending', 'reviewed', 'resolved', 'dismissed'];
  if (!valid.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
  try {
    const { rows } = await pool.query(
      `UPDATE reports SET status=$1,resolution_note=$2,resolved_at=NOW() WHERE id=$3 RETURNING *`,
      [status, resolution_note ?? null, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to update report' }); }
});

module.exports = router;
