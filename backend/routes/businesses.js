const router = require('express').Router();
const { cacheMiddleware } = require('../middleware/cache');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');

router.get('/', optionalAuth, cacheMiddleware('businesses:list', 30), async (req, res) => {
  try {
    const { owner_id, sort = '-created_at', limit = 50 } = req.query;
    const filter = {};
    if (owner_id) filter.owner_id = owner_id;
    res.json(await listRecords('businesses', { filter, sort, limit }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const biz = await getRecord('businesses', req.params.id);
    if (!biz) return res.status(404).json({ error: 'Business not found' });
    res.json(biz);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { business_name, business_category } = req.body;
    if (!business_name || !business_category) {
      return res.status(400).json({ error: 'business_name and business_category are required' });
    }
    const biz = await createRecord('businesses', { ...req.body, owner_id: req.user.id });
    res.status(201).json(biz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('businesses', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Business not found' });
    if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('businesses', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update business' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('businesses', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Business not found' });
    if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('businesses', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

module.exports = router;

