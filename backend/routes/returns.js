const router = require('express').Router();
const logger = require('../lib/logger');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');

// Helper — create in-app + push notification
async function notify(userId, title, body, link) {
  const { rows: [notif] } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link, is_read)
     VALUES ($1, 'order', $2, $3, $4, false) RETURNING *`,
    [userId, title, body, link]
  );
  emitNotification(userId, notif);
  sendPushToUser(userId, title, body, link).catch(() => {});
}

// POST /api/returns — buyer submits a return request
router.post('/', requireAuth, async (req, res) => {
  const { order_id, reason, details } = req.body;
  if (!order_id || !reason) {
    return res.status(400).json({ error: 'order_id and reason are required' });
  }
  try {
    // Verify order belongs to this buyer
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [order_id, req.user.id]
    );
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];

    // Check for existing open request
    const { rows: existing } = await pool.query(
      `SELECT id FROM return_requests WHERE order_id = $1 AND status NOT IN ('rejected')`,
      [order_id]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'A return request already exists for this order' });
    }

    const { rows: [request] } = await pool.query(
      `INSERT INTO return_requests (order_id, buyer_id, seller_id, reason, details)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [order_id, req.user.id, order.seller_id, reason, details || null]
    );

    // Notify seller
    await notify(
      order.seller_id,
      '↩️ Return request received',
      `Buyer requested a return for "${order.product_title}". Reason: ${reason}`,
      '/orders'
    );

    res.status(201).json(request);
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Error');
    res.status(500).json({ error: 'Failed to submit return request' });
  }
});

// GET /api/returns — list return requests for the current user (as buyer or seller)
router.get('/', requireAuth, async (req, res) => {
  const { role = 'buyer' } = req.query; // 'buyer' | 'seller'
  try {
    const col = role === 'seller' ? 'seller_id' : 'buyer_id';
    const { rows } = await pool.query(
      `SELECT rr.*, o.product_title, o.total_price, o.currency
       FROM return_requests rr
       JOIN orders o ON o.id = rr.order_id
       WHERE rr.${col} = $1
       ORDER BY rr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch return requests' });
  }
});

// PUT /api/returns/:id — seller approves or rejects
router.put('/:id', requireAuth, async (req, res) => {
  const { status, refund_amount } = req.body; // status: 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }
  try {
    const { rows: [rr] } = await pool.query('SELECT * FROM return_requests WHERE id = $1', [req.params.id]);
    if (!rr) return res.status(404).json({ error: 'Return request not found' });
    if (rr.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const newStatus = status === 'approved' && refund_amount ? 'refunded' : status;
    const { rows: [updated] } = await pool.query(
      `UPDATE return_requests SET status = $1, refund_amount = $2, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [newStatus, refund_amount || null, req.params.id]
    );

    // If refunded — credit buyer wallet
    if (newStatus === 'refunded' && refund_amount > 0) {
      await pool.query(
        `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [parseFloat(refund_amount), rr.buyer_id]
      );
      await pool.query(
        `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
         SELECT id, 'refund', $1, $2, $3
         FROM wallets WHERE user_id = $4`,
        [parseFloat(refund_amount), 'Refund: return request approved', req.params.id, rr.buyer_id]
      );
    }

    // Notify buyer
    const msg = status === 'approved'
      ? `✅ Your return request was approved. Refund: ${refund_amount ?? 0} ${updated.currency || 'ETB'}`
      : `❌ Your return request was declined.`;
    await notify(rr.buyer_id, 'Return request update', msg, '/orders');

    res.json(updated);
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Error');
    res.status(500).json({ error: 'Failed to update return request' });
  }
});

module.exports = router;
