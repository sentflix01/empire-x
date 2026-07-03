const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Get reviews for a product
router.get('/product/:productId', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, up.display_name, up.avatar_url
       FROM reviews r
       LEFT JOIN user_profiles up ON up.user_id = r.reviewer_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create review
router.post('/', requireAuth, async (req, res) => {
  const { product_id, order_id, rating, comment } = req.body;
  if (!product_id || !rating) {
    return res.status(400).json({ error: 'product_id and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (product_id, order_id, reviewer_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (product_id, reviewer_id) DO UPDATE
       SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
       RETURNING *`,
      [product_id, order_id || null, req.user.id, rating, comment || null]
    );
    // Update product average rating
    await pool.query(
      `UPDATE products SET
         average_rating = (SELECT AVG(rating) FROM reviews WHERE product_id = $1),
         review_count   = (SELECT COUNT(*) FROM reviews WHERE product_id = $1)
       WHERE id = $1`,
      [product_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Delete review
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT reviewer_id, product_id FROM reviews WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Review not found' });
    if (rows[0].reviewer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    // Recalculate
    await pool.query(
      `UPDATE products SET
         average_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = $1), 0),
         review_count   = (SELECT COUNT(*) FROM reviews WHERE product_id = $1)
       WHERE id = $1`,
      [rows[0].product_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
