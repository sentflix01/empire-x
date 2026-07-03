const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Get variants for a product
router.get('/product/:productId', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY name, value',
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// Add variant to a product
router.post('/product/:productId', requireAuth, async (req, res) => {
  const { name, value, price, stock, sku } = req.body;
  if (!name || !value) return res.status(400).json({ error: 'name and value are required' });
  try {
    // Verify product ownership
    const { rows: products } = await pool.query('SELECT seller_id FROM products WHERE id = $1', [req.params.productId]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });
    if (products[0].seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rows } = await pool.query(
      `INSERT INTO product_variants (product_id, name, value, price, stock, sku)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.productId, name, value, price || null, stock || 0, sku || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add variant' });
  }
});

// Update variant
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE product_variants SET
         name = COALESCE($1, name),
         value = COALESCE($2, value),
         price = $3,
         stock = COALESCE($4, stock),
         sku = $5,
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [req.body.name, req.body.value, req.body.price, req.body.stock, req.body.sku, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Variant not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

// Delete variant
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM product_variants WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

module.exports = router;
