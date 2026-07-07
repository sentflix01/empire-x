const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Get or create wallet for current user
async function getOrCreateWallet(userId) {
  const existing = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  if (existing.rows.length) return existing.rows[0];
  const { rows } = await pool.query(
    'INSERT INTO wallets (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return rows[0];
}

// Get my wallet
router.get('/me', requireAuth, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    const { rows: txs } = await pool.query(
      'SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 50',
      [wallet.id]
    );
    res.json({ ...wallet, transactions: txs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Top up wallet (admin or Stripe webhook would call this in production)
router.post('/topup', requireAuth, async (req, res) => {
  const { amount, reference } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    await pool.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );
    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
       VALUES ($1, 'credit', $2, 'Wallet top-up', $3)`,
      [wallet.id, amount, reference || null]
    );
    const updated = await pool.query('SELECT * FROM wallets WHERE id = $1', [wallet.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to top up wallet' });
  }
});

// Withdraw (request — admin approves manually)
router.post('/withdraw', requireAuth, async (req, res) => {
  const { amount, bank_name, account_number } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await pool.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );
    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
       VALUES ($1, 'withdrawal', $2, $3)`,
      [wallet.id, amount, `Withdrawal to ${bank_name} ${account_number}`]
    );
    // Create a notification for admin
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body)
       SELECT id, 'order', 'Withdrawal Request', $1
       FROM users WHERE role = 'admin' LIMIT 1`,
      [`User ${req.user.id} requested withdrawal of ${amount} ETB`]
    );
    res.json({ success: true, message: 'Withdrawal request submitted. Processing within 1-3 business days.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Debit wallet (admin only — e.g. commission deduction)
router.post('/debit', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { user_id, amount, description, reference } = req.body;
  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'user_id and a positive amount are required' });
  }
  try {
    const wallet = await getOrCreateWallet(user_id);
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await pool.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );
    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
       VALUES ($1, 'debit', $2, $3, $4)`,
      [wallet.id, amount, description || 'Debit', reference || null]
    );
    const updated = await pool.query('SELECT * FROM wallets WHERE id = $1', [wallet.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process debit' });
  }
});

// Refund wallet (called when a return request is approved)
router.post('/refund', requireAuth, async (req, res) => {
  const { user_id, amount, description, reference } = req.body;
  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'user_id and a positive amount are required' });
  }
  try {
    const wallet = await getOrCreateWallet(user_id);
    await pool.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );
    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
       VALUES ($1, 'refund', $2, $3, $4)`,
      [wallet.id, amount, description || 'Refund', reference || null]
    );
    const updated = await pool.query('SELECT * FROM wallets WHERE id = $1', [wallet.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;
