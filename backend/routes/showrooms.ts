import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { cacheMiddleware } from '../middleware/cache';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';
import { runDoctor } from '../lib/showroomDoctor';

const router = Router();

router.get('/', optionalAuth, cacheMiddleware('showrooms:list', 30), async (req: Request, res: Response) => {
  try {
    const { owner_id, status, category, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};
    if (owner_id) filter.owner_id = owner_id;
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    res.json(await listRecords('showrooms', { filter, sort, limit }));
  } catch { res.status(500).json({ error: 'Failed to fetch showrooms' }); }
});

router.get('/slug/:slug', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM showrooms WHERE slug=$1', [req.params.slug]);
    if (!rows.length) { res.status(404).json({ error: 'Showroom not found' }); return; }
    await pool.query('UPDATE showrooms SET view_count=view_count+1 WHERE id=$1', [rows[0].id]);
    res.json({ ...rows[0], view_count: rows[0].view_count + 1 });
  } catch { res.status(500).json({ error: 'Failed to fetch showroom' }); }
});

// ── Showroom Doctor (owner or admin) — sector-aware diagnosis ────────────────
router.get('/:id/doctor', requireAuth, async (req: Request, res: Response) => {
  try {
    const showroom = await getRecord<Record<string, unknown>>('showrooms', req.params.id);
    if (!showroom) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (showroom.owner_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const result = await runDoctor(pool, req.params.id);
    if (!result) { res.status(404).json({ error: 'Showroom not found' }); return; }
    res.json(result.report);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'showroom doctor failed');
    res.status(500).json({ error: 'Doctor analysis failed' });
  }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const showroom = await getRecord('showrooms', req.params.id);
    if (!showroom) { res.status(404).json({ error: 'Showroom not found' }); return; }
    res.json(showroom);
  } catch { res.status(500).json({ error: 'Failed to fetch showroom' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, category } = req.body as Record<string, string>;
    if (!title || !category) { res.status(400).json({ error: 'title and category are required' }); return; }
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = (req.body as Record<string, string>).slug ?? `${base}-${Date.now()}`;
    const { rows: existing } = await pool.query('SELECT id FROM showrooms WHERE slug=$1', [slug]);
    const finalSlug = existing.length ? `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : slug;
    const showroom = await createRecord('showrooms', { ...(req.body as Record<string, unknown>), slug: finalSlug, owner_id: req.user!.id });
    res.status(201).json(showroom);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create showroom error');
    res.status(500).json({ error: 'Failed to create showroom: ' + (err as Error).message });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('showrooms', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(await updateRecord('showrooms', req.params.id, req.body as Record<string, unknown>));
  } catch { res.status(500).json({ error: 'Failed to update showroom' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('showrooms', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('showrooms', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete showroom' }); }
});

module.exports = router;
