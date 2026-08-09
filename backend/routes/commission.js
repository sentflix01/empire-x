const router = require('express').Router();
const logger = require('../lib/logger');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '0.03'); // 3% default

/**
 * Collect commission when an order is marked completed.
 * Called internally from orders route.
 */
async function collectCommission(orderId, sellerId, totalPrice) {
  const amount = parseFloat((totalPrice * COMMISSION_RATE).toFixed(2));
  try {
    await pool.query(
      `INSERT INTO commissions (order_id, seller_id, gross, rate, amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [orderId, sellerId, totalPrice, COMMISSION_RATE, amount]
    );
    // Deduct from seller wallet, only if they have enough balance
    const wallet = await pool.query('SELECT id, balance FROM wallets WHERE user_id = $1', [sellerId]);
    if (wallet.rows.length) {
      const currentBalance = parseFloat(wallet.rows[0].balance || 0);
      const deductAmount = Math.min(amount, currentBalance); // never go negative
      if (deductAmount > 0) {
        await pool.query(
          'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
          [deductAmount, wallet.rows[0].id]
        );
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
           VALUES ($1, 'debit', $2, $3)`,
          [wallet.rows[0].id, deductAmount, `Platform commission (${(COMMISSION_RATE * 100).toFixed(0)}%) for order`]
        );
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Commission collection failed');
  }
}

// Get commission summary for a seller
router.get('/my-commissions', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, o.product_title
       FROM commissions c
       JOIN orders o ON o.id = c.order_id
       WHERE c.seller_id = $1
       ORDER BY c.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    const total = rows.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    res.json({ commissions: rows, total_paid: total, rate: COMMISSION_RATE });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// Admin: total platform revenue from commissions
router.get('/admin/summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) as total_orders,
         SUM(gross) as total_gross,
         SUM(amount) as total_commission,
         AVG(rate) as avg_rate
       FROM commissions WHERE status = 'collected'`
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commission summary' });
  }
});

module.exports = router;
module.exports.collectCommission = collectCommission;
