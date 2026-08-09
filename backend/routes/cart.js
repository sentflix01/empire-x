const router = require('express').Router();
const logger = require('../lib/logger');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Get my cart
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ci.*, p.title, p.price, p.currency, p.images, p.stock, p.seller_id
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [req.user.id]
    );
    const total = rows.reduce((sum, i) => sum + (parseFloat(i.price) * i.quantity), 0);
    res.json({ items: rows, total, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add item to cart
router.post('/add', requireAuth, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  try {
    // Check product exists and is in stock
    const { rows: products } = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (!products.length) return res.status(404).json({ error: 'Product not found' });
    const product = products[0];
    if (product.stock !== null && product.stock < quantity) {
      return res.status(400).json({ error: `Only ${product.stock} in stock` });
    }
    // Upsert — if already in cart, increment quantity
    const { rows } = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW()
       RETURNING *`,
      [req.user.id, product_id, quantity]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Error');
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Update item quantity
router.put('/:itemId', requireAuth, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ error: 'quantity must be >= 1' });
  try {
    const { rows } = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [quantity, req.params.itemId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Cart item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Remove item
router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.itemId, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
router.delete('/', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
