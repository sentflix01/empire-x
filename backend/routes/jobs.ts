import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { status = 'open', job_type, category, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};
    if (status)   filter.status   = status;
    if (job_type) filter.job_type = job_type;
    if (category) filter.category = category;
    res.json(await listRecords('jobs', { filter, sort, limit }));
  } catch { res.status(500).json({ error: 'Failed to fetch jobs' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const job = await getRecord('jobs', req.params.id);
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    res.json(job);
  } catch { res.status(500).json({ error: 'Failed to fetch job' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title } = req.body as Record<string, string>;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }
    res.status(201).json(await createRecord('jobs', { ...(req.body as Record<string, unknown>), poster_id: req.user!.id }));
  } catch { res.status(500).json({ error: 'Failed to create job' }); }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ poster_id: string }>('jobs', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Job not found' }); return; }
    if (existing.poster_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(await updateRecord('jobs', req.params.id, req.body as Record<string, unknown>));
  } catch { res.status(500).json({ error: 'Failed to update job' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ poster_id: string }>('jobs', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Job not found' }); return; }
    if (existing.poster_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('jobs', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete job' }); }
});

router.post('/:id/apply', requireAuth, async (req: Request, res: Response) => {
  try {
    const job = await getRecord<{ poster_id: string }>('jobs', req.params.id);
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (job.poster_id === req.user!.id) { res.status(400).json({ error: 'Cannot apply to your own job posting' }); return; }
    const { cover_letter, resume_url } = req.body as Record<string, string>;
    const { rows } = await pool.query(
      `INSERT INTO job_applications (job_id,applicant_id,cover_letter,resume_url) VALUES ($1,$2,$3,$4) ON CONFLICT (job_id,applicant_id) DO NOTHING RETURNING *`,
      [req.params.id, req.user!.id, cover_letter ?? null, resume_url ?? null],
    );
    if (!rows.length) { res.status(409).json({ error: 'Already applied' }); return; }
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to apply' }); }
});

router.get('/:id/applications', requireAuth, async (req: Request, res: Response) => {
  try {
    const job = await getRecord<{ poster_id: string }>('jobs', req.params.id);
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (job.poster_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { rows } = await pool.query(
      `SELECT ja.*, up.display_name, up.avatar_url, up.headline FROM job_applications ja LEFT JOIN user_profiles up ON up.user_id=ja.applicant_id WHERE ja.job_id=$1 ORDER BY ja.created_at DESC`,
      [req.params.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch applications' }); }
});

router.put('/applications/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('UPDATE job_applications SET status=$1 WHERE id=$2 RETURNING *', [(req.body as { status: string }).status, req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Application not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to update application' }); }
});

module.exports = router;
