import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import { cacheMiddleware } from '../middleware/cache';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord, withoutProtectedFields } from '../utils/crud';
import { getBusinessSubscriptionAccess, isBusinessOwnerBlocked } from '../lib/businessSubscriptionPolicy';

const router = Router();

router.get('/', optionalAuth, cacheMiddleware('businesses:list', 30), async (req: Request, res: Response) => {
  try {
    const { owner_id, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const filter: Record<string, string> = {};
    if (owner_id) filter.owner_id = owner_id;
    if (owner_id && req.user?.id === owner_id && await isBusinessOwnerBlocked(owner_id)) {
      res.status(423).json({ error: 'business_profile_blocked', message: 'This business profile is blocked until its subscription is renewed.' });
      return;
    }
    res.json(await listRecords('businesses', {
      filter, sort, limit, realOnly: req.realOnly,
      paidBusinessGrace: !owner_id || owner_id !== req.user?.id,
    }));
  } catch { res.status(500).json({ error: 'Failed to fetch businesses' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const biz = await getRecord('businesses', req.params.id, { realOnly: req.realOnly });
    if (!biz) { res.status(404).json({ error: 'Business not found' }); return; }
    const ownerId = String((biz as Record<string, unknown>).owner_id ?? '');
    const access = await getBusinessSubscriptionAccess(req.params.id);
    const isOwner = req.user?.id === ownerId;
    if (!isOwner && (!access || access.hiddenFromPublic)) { res.status(404).json({ error: 'Business not found' }); return; }
    if (isOwner && access?.blockedForOwner) {
      res.status(423).json({ error: 'business_profile_blocked', message: 'This business profile is blocked until its subscription is renewed.' });
      return;
    }
    res.json(biz);
  } catch { res.status(500).json({ error: 'Failed to fetch business' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (await isBusinessOwnerBlocked(req.user!.id)) {
      res.status(423).json({ error: 'business_creation_blocked', message: 'You can create a new business profile after the restriction period ends.' });
      return;
    }
    const { business_name, business_category } = req.body as Record<string, string>;
    if (!business_name || !business_category) {
      res.status(400).json({ error: 'business_name and business_category are required' }); return;
    }
    const fields = withoutProtectedFields(req.body as Record<string, unknown>, 'owner_id');
    const biz = await createRecord('businesses', { ...fields, owner_id: req.user!.id });
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
    const access = await getBusinessSubscriptionAccess(req.params.id);
    if (existing.owner_id === req.user!.id && access?.blockedForOwner) {
      res.status(423).json({ error: 'business_profile_blocked', message: 'This business profile is blocked until its subscription is renewed.' });
      return;
    }
    const updates = withoutProtectedFields(req.body as Record<string, unknown>, 'owner_id');
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable business fields provided' }); return; }
    res.json(await updateRecord('businesses', req.params.id, updates));
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
