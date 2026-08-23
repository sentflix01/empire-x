import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { cacheMiddleware } from '../middleware/cache';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';

const router = Router();

router.get('/', optionalAuth, cacheMiddleware('businesses:list', 30), async (req: Request, res: Response) => {
  try {
    const { owner_id, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};
    if (owner_id) filter.owner_id = owner_id;
    res.json(await listRecords('businesses', { filter, sort, limit }));
  } catch { res.status(500).json({ error: 'Failed to fetch businesses' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const biz = await getRecord('businesses', req.params.id);
    if (!biz) { res.status(404).json({ error: 'Business not found' }); return; }
    res.json(biz);
  } catch { res.status(500).json({ error: 'Failed to fetch business' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { business_name, business_category } = req.body as Record<string, string>;
    if (!business_name || !business_category) {
      res.status(400).json({ error: 'business_name and business_category are required' }); return;
    }
    const biz = await createRecord('businesses', { ...(req.body as Record<string, unknown>), owner_id: req.user!.id });
    res.status(201).json(biz);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create business error');
    res.status(500).json({ error: 'Failed to create business' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('businesses', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Business not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(await updateRecord('businesses', req.params.id, req.body as Record<string, unknown>));
  } catch { res.status(500).json({ error: 'Failed to update business' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ owner_id: string }>('businesses', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Business not found' }); return; }
    if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('businesses', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete business' }); }
});

module.exports = router;
