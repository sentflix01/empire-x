const router = require('express').Router();
const { cacheMiddleware } = require('../middleware/cache');
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');

router.get('/', optionalAuth, cacheMiddleware('showrooms:list', 30), async (req, res) => {
  try {
    const { owner_id, status, category, sort = '-created_at', limit = 50 } = req.query;
    const filter = {};
    if (owner_id) filter.owner_id = owner_id;
    if (status) filter.status = status;
    if (category) filter.category = category;
    res.json(await listRecords('showrooms', { filter, sort, limit }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch showrooms' });
  }
});

// Get by slug
router.get('/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM showrooms WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Showroom not found' });
    // Increment view count
    await pool.query('UPDATE showrooms SET view_count = view_count + 1 WHERE id = $1', [rows[0].id]);
    res.json({ ...rows[0], view_count: rows[0].view_count + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch showroom' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const showroom = await getRecord('showrooms', req.params.id);
    if (!showroom) return res.status(404).json({ error: 'Showroom not found' });
    res.json(showroom);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch showroom' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'title and category are required' });
    }
    // Auto-generate slug if not provided
    let slug = req.body.slug;
    if (!slug) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    const showroom = await createRecord('showrooms', { ...req.body, slug, owner_id: req.user.id });
    res.status(201).json(showroom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create showroom' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('showrooms', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Showroom not found' });
    if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('showrooms', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update showroom' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('showrooms', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Showroom not found' });
    if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('showrooms', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete showroom' });
  }
});

module.exports = router;

