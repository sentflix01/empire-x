const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');

const VALID_STATUSES = ['Packed', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed Delivery'];

// GET /api/delivery/:orderId — buyer or seller fetches tracking timeline
router.get('/:orderId', requireAuth, async (req, res) => {
  try {
    // Verify user has access to this order
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [req.params.orderId, req.user.id]
    );
    if (!orders.length && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { rows } = await pool.query(
      `SELECT du.*, u.full_name AS updated_by_name
       FROM delivery_updates du
       LEFT JOIN users u ON u.id = du.created_by
       WHERE du.order_id = $1
       ORDER BY du.created_at ASC`,
      [req.params.orderId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delivery updates' });
  }
});

// POST /api/delivery/:orderId — seller adds a tracking checkpoint
router.post('/:orderId', requireAuth, async (req, res) => {
  const { status, note, location } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    // Only seller can add updates
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND seller_id = $2',
      [req.params.orderId, req.user.id]
    );
    if (!orders.length) return res.status(403).json({ error: 'Only the seller can add delivery updates' });
    const order = orders[0];

    const { rows: [update] } = await pool.query(
      `INSERT INTO delivery_updates (order_id, status, note, location, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.orderId, status, note || null, location || null, req.user.id]
    );

    // Auto-update order status when delivered
    if (status === 'Delivered') {
      await pool.query(
        `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [req.params.orderId]
      );
    }

    // Notify buyer
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read)
       VALUES ($1, 'order', $2, $3, '/orders', false) RETURNING *`,
      [
        order.buyer_id,
        `🚚 Order update: ${status}`,
        `Your order "${order.product_title}" — ${status}${location ? ` · ${location}` : ''}`,
      ]
    );
    emitNotification(order.buyer_id, notif);
    sendPushToUser(
      order.buyer_id,
      `🚚 Order update: ${status}`,
      `"${order.product_title}" — ${status}`,
      '/orders'
    ).catch(() => {});

    res.status(201).json(update);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add delivery update' });
  }
});

module.exports = router;
