import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, withoutProtectedFields } from '../utils/crud';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { category, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string | boolean | null> = { is_published: true };
    if (category) filter.category = category;
    res.json(await listRecords('courses', { filter, sort, limit, realOnly: req.realOnly }));
  } catch { res.status(500).json({ error: 'Failed to fetch courses' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const course = await getRecord('courses', req.params.id, { realOnly: req.realOnly });
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
    const { rows: lessons } = await pool.query('SELECT * FROM course_lessons WHERE course_id=$1 ORDER BY position ASC', [req.params.id]);
    res.json({ ...course, lessons });
  } catch { res.status(500).json({ error: 'Failed to fetch course' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title } = req.body as Record<string, string>;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }
    const fields = withoutProtectedFields(req.body as Record<string, unknown>, 'creator_id');
    res.status(201).json(await createRecord('courses', { ...fields, creator_id: req.user!.id }));
  } catch { res.status(500).json({ error: 'Failed to create course' }); }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ creator_id: string }>('courses', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Course not found' }); return; }
    if (existing.creator_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const updates = withoutProtectedFields(req.body as Record<string, unknown>, 'creator_id');
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable course fields provided' }); return; }
    res.json(await updateRecord('courses', req.params.id, updates));
  } catch { res.status(500).json({ error: 'Failed to update course' }); }
});

router.post('/:id/lessons', requireAuth, async (req: Request, res: Response) => {
  try {
    const course = await getRecord<{ creator_id: string }>('courses', req.params.id);
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
    if (course.creator_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { title, description, video_url, duration, position, is_free } = req.body as Record<string, unknown>;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }
    const { rows } = await pool.query(
      `INSERT INTO course_lessons (course_id,title,description,video_url,duration,position,is_free) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, title, description ?? null, video_url ?? null, duration ?? null, position ?? 0, is_free ?? false],
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to add lesson' }); }
});

router.post('/:id/enroll', requireAuth, async (req: Request, res: Response) => {
  try {
    const course = await getRecord('courses', req.params.id);
    if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
    const { rows } = await pool.query(
      `INSERT INTO course_enrollments (course_id,user_id) VALUES ($1,$2) ON CONFLICT (course_id,user_id) DO NOTHING RETURNING *`,
      [req.params.id, req.user!.id],
    );
    if (!rows.length) { res.status(409).json({ error: 'Already enrolled' }); return; }
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to enroll' }); }
});

router.get('/:id/enrolled', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM course_enrollments WHERE course_id=$1 AND user_id=$2', [req.params.id, req.user!.id]);
    res.json({ enrolled: rows.length > 0, enrollment: rows[0] ?? null });
  } catch { res.status(500).json({ error: 'Failed to check enrollment' }); }
});

router.put('/:id/progress', requireAuth, async (req: Request, res: Response) => {
  try {
    const { progress } = req.body as { progress: number };
    await pool.query('UPDATE course_enrollments SET progress=$1 WHERE course_id=$2 AND user_id=$3', [progress, req.params.id, req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to update progress' }); }
});

module.exports = router;
