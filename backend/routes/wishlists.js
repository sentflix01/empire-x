const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Get my wishlist
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.created_at, p.id AS product_id, p.title, p.price, p.currency, p.images, p.stock, p.seller_id
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Check if a product is wishlisted
router.get('/check/:productId', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [req.user.id, req.params.productId]
    );
    res.json({ wishlisted: rows.length > 0 });
  } catch {
    res.json({ wishlisted: false });
  }
});

// Add to wishlist
router.post('/', requireAuth, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *`,
      [req.user.id, product_id]
    );
    res.status(201).json({ wishlisted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Remove from wishlist
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [req.user.id, req.params.productId]
    );
    res.json({ wishlisted: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
