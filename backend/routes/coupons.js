const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Create coupon (seller only)
router.post('/', requireAuth, async (req, res) => {
  const { code, discount_type, discount_value, min_order, usage_limit, expires_at } = req.body;
  if (!code || !discount_type || discount_value == null) {
    return res.status(400).json({ error: 'code, discount_type, and discount_value are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO coupons (seller_id, code, discount_type, discount_value, min_order, usage_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, code.toUpperCase(), discount_type, discount_value, min_order || 0, usage_limit || null, expires_at || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// List my coupons
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM coupons WHERE seller_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Validate / apply a coupon code
router.post('/validate', async (req, res) => {
  const { code, seller_id, order_total } = req.body;
  if (!code || !seller_id) return res.status(400).json({ error: 'code and seller_id are required' });

  try {
    const { rows } = await pool.query(
      `SELECT * FROM coupons
       WHERE code = $1 AND seller_id = $2 AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      [code.toUpperCase(), seller_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired coupon code' });

    const coupon = rows[0];
    if (order_total && coupon.min_order && order_total < coupon.min_order) {
      return res.status(400).json({
        error: `Minimum order of ${coupon.min_order} ${coupon.currency || 'ETB'} required for this coupon`
      });
    }

    const discount = coupon.discount_type === 'percentage'
      ? (order_total || 0) * (coupon.discount_value / 100)
      : coupon.discount_value;

    res.json({ valid: true, coupon, discount: Math.min(discount, order_total || discount) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// Use a coupon (increment usage_count)
router.post('/use', requireAuth, async (req, res) => {
  const { coupon_id } = req.body;
  try {
    await pool.query(
      'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1',
      [coupon_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record coupon use' });
  }
});

// Delete coupon
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT seller_id FROM coupons WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Coupon not found' });
    if (rows[0].seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

module.exports = router;
