const router = require('express').Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');

// List
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { seller_id, business_id, showroom_id, status, sort = '-created_at', limit = 50 } = req.query;
    const filter = {};
    if (seller_id) filter.seller_id = seller_id;
    if (business_id) filter.business_id = business_id;
    if (showroom_id) filter.showroom_id = showroom_id;
    if (status) filter.status = status;
    res.json(await listRecords('products', { filter, sort, limit }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await getRecord('products', req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, price } = req.body;
    if (!title || price == null) return res.status(400).json({ error: 'title and price are required' });
    const product = await createRecord('products', { ...req.body, seller_id: req.user.id });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('products', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    if (existing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await updateRecord('products', req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('products', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    if (existing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('products', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
