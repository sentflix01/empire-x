const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const apiError = require('../lib/apiError');
const logger = require('../lib/logger');
const { getPrimaryFrontendUrl } = require('../lib/frontendUrl');

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
    logger.error({ err }, 'Failed to fetch wallet');
    return apiError.serverError(res, 'Failed to fetch wallet');
  }
});

// Top up wallet.
// In production, direct topup is restricted to admins to avoid balance manipulation.
// In non-production environments, authenticated users may top up directly for local testing.
router.post('/topup', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { amount, reference } = req.body;
  if (!amount || amount <= 0) return apiError.validationError(res, 'Valid amount is required');
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
    logger.error({ err }, 'Failed to top up wallet');
    return apiError.serverError(res, 'Failed to top up wallet');
  }
});

// Withdraw (request — admin approves manually)
router.post('/withdraw', requireAuth, async (req, res) => {
  const { amount, bank_name, account_number } = req.body;
  if (!amount || amount <= 0) return apiError.validationError(res, 'Valid amount is required');
  try {
    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.balance < amount) {
      return apiError.validationError(res, 'Insufficient balance');
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
    logger.error({ err }, 'Failed to process withdrawal');
    return apiError.serverError(res, 'Failed to process withdrawal');
  }
});

// Debit wallet (admin only — e.g. commission deduction)
router.post('/debit', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { user_id, amount, description, reference } = req.body;
  if (!user_id || !amount || amount <= 0) {
    return apiError.validationError(res, 'user_id and a positive amount are required');
  }
  try {
    const wallet = await getOrCreateWallet(user_id);
    if (wallet.balance < amount) {
      return apiError.validationError(res, 'Insufficient balance');
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
    logger.error({ err }, 'Failed to process debit');
    return apiError.serverError(res, 'Failed to process debit');
  }
});

// Refund wallet (called when a return request is approved — admin only)
router.post('/refund', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { user_id, amount, description, reference } = req.body;
  if (!user_id || !amount || amount <= 0) {
    return apiError.validationError(res, 'user_id and a positive amount are required');
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
    logger.error({ err }, 'Failed to process refund');
    return apiError.serverError(res, 'Failed to process refund');
  }
});

// ── Chapa Wallet Top-up — Initialize ────────────────────────────────────────
router.post('/topup/chapa', requireAuth, async (req, res) => {
  const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY || null;
  const CHAPA_SANDBOX = CHAPA_SECRET === 'SANDBOX';
  if (!CHAPA_SECRET) {
    return res.status(503).json({ error: 'Chapa payments are not configured. Add CHAPA_SECRET_KEY to your .env file.' });
  }

  const { amount, email, first_name, last_name, phone_number } = req.body;
  if (!amount || amount <= 0) return apiError.validationError(res, 'Valid amount is required');

  const tx_ref = `empx-wallet-${req.user.id.slice(0, 8)}-${Date.now()}`;
  const frontendUrl = getPrimaryFrontendUrl();
  const apiUrl      = process.env.API_URL      || 'http://localhost:3001';

  try {
    let checkout_url;

    if (CHAPA_SANDBOX) {
      // Local sandbox — point to our own sandbox page
      const returnUrl = `${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}`;
      const verifyUrl = `${apiUrl}/api/wallet/topup/chapa/verify/${tx_ref}`;
      checkout_url = `${apiUrl}/api/wallet/topup/chapa/sandbox?tx_ref=${tx_ref}&amount=${amount}&return_url=${encodeURIComponent(returnUrl)}&verify_url=${encodeURIComponent(verifyUrl)}`;
    } else {
      const fetch = (await import('node-fetch')).default;
      const chapaRes = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CHAPA_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:        String(amount),
          currency:      'ETB',
          email:         email || req.user.email || 'user@empirex.app',
          first_name:    first_name || 'Empire',
          last_name:     last_name  || 'User',
          phone_number:  phone_number || '',
          tx_ref,
          callback_url:  `${apiUrl}/api/wallet/topup/chapa/verify/${tx_ref}`,
          return_url:    `${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}`,
          customization: {
            title:       'Empire X Wallet Top-up',
            description: `Add ${Number(amount).toLocaleString()} ETB to your Empire X wallet`,
          },
        }),
      }).then(r => r.json());

      if (chapaRes.status !== 'success' || !chapaRes.data?.checkout_url) {
        return res.status(502).json({ error: chapaRes.message || 'Failed to initialize Chapa top-up', detail: chapaRes });
      }
      checkout_url = chapaRes.data.checkout_url;
    }

    // Store the pending top-up reference
    const wallet = await getOrCreateWallet(req.user.id);
    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
       VALUES ($1, 'pending_topup', $2, 'Chapa wallet top-up (pending)', $3)`,
      [wallet.id, amount, tx_ref]
    );

    res.json({ checkout_url, tx_ref });
  } catch (err) {
    logger.error({ err }, 'Chapa wallet topup error');
    return apiError.serverError(res, 'Failed to initialize Chapa top-up');
  }
});

// ── Chapa Wallet Sandbox Page ────────────────────────────────────────────────
router.get('/topup/chapa/sandbox', (req, res) => {
  const { tx_ref, amount, return_url, verify_url } = req.query;
  // Sanitize tx_ref for HTML display to prevent XSS
  const safeTxRef  = String(tx_ref  || '').replace(/[<>"'&]/g, c => `&#${c.charCodeAt(0)};`);
  const safeAmount = String(amount  || '0').replace(/[^0-9.]/g, '');
  const safeReturn = return_url ? decodeURIComponent(return_url) : getPrimaryFrontendUrl();
  const safeVerify = verify_url ? decodeURIComponent(verify_url) : '';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Chapa Wallet Top-up — Empire X Sandbox</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0fdf4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    .card{background:#fff;border-radius:1.5rem;padding:2rem;max-width:400px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
    .logo{font-size:2.5rem;margin-bottom:.5rem}
    h1{font-size:1.25rem;font-weight:700;color:#111;margin-bottom:.25rem}
    .badge{display:inline-block;background:#dcfce7;color:#166534;font-size:.7rem;font-weight:700;padding:.2rem .6rem;border-radius:9999px;margin-bottom:1.5rem;letter-spacing:.05em}
    .amount{font-size:2rem;font-weight:900;color:#16a34a;margin-bottom:.25rem}
    .tx{font-size:.75rem;color:#9ca3af;margin-bottom:1.5rem}
    .methods{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1.5rem}
    .method{border:2px solid #e5e7eb;border-radius:.75rem;padding:.6rem;cursor:pointer;font-size:.8rem;font-weight:600;transition:all .15s}
    .method.active{border-color:#16a34a;background:#f0fdf4;color:#166534}
    .method:hover{border-color:#16a34a}
    .btn{width:100%;padding:.85rem;border:none;border-radius:9999px;font-size:.95rem;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .note{font-size:.7rem;color:#9ca3af;margin-top:1rem}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">🇪🇹</div>
  <h1>Wallet Top-up</h1>
  <span class="badge">SANDBOX MODE</span>
  <div class="amount">${safeAmount ? Number(safeAmount).toLocaleString() : '0'} ETB</div>
  <div class="tx">ref: ${safeTxRef}</div>
  <p style="font-size:.85rem;color:#374151;margin-bottom:1rem;font-weight:500">Select payment method:</p>
  <div class="methods">
    <div class="method active" onclick="sel(this)">📱 TeleBirr</div>
    <div class="method" onclick="sel(this)">🏦 CBE Birr</div>
    <div class="method" onclick="sel(this)">💚 M-Pesa</div>
    <div class="method" onclick="sel(this)">🏛️ Awash Bank</div>
  </div>
  <button class="btn" onclick="pay()">✅ Confirm Top-up</button>
  <p class="note">Sandbox simulation — no real money moved.</p>
</div>
<script>
  var VERIFY_URL = ${JSON.stringify(safeVerify)};
  var RETURN_URL = ${JSON.stringify(safeReturn)};
  function sel(el){document.querySelectorAll('.method').forEach(m=>m.classList.remove('active'));el.classList.add('active')}
  async function pay(){
    var btn=document.querySelector('.btn');
    btn.disabled=true;btn.textContent='Processing...';
    try{ if(VERIFY_URL) await fetch(VERIFY_URL); }catch(e){}
    window.location.href=RETURN_URL;
  }
</script>
</body>
</html>`);
});

// ── Chapa Wallet Top-up — Verify ─────────────────────────────────────────────
router.get('/topup/chapa/verify/:tx_ref', async (req, res) => {
  const CHAPA_SECRET  = process.env.CHAPA_SECRET_KEY || null;
  const CHAPA_SANDBOX = CHAPA_SECRET === 'SANDBOX';
  const { tx_ref }    = req.params;
  const frontendUrl   = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!CHAPA_SECRET) return res.status(503).json({ error: 'Chapa not configured' });

  try {
    let paymentSuccess = false;
    let paidAmount = 0;

    if (CHAPA_SANDBOX) {
      paymentSuccess = true;
      // Get amount from pending transaction
      const { rows: pending } = await pool.query(
        `SELECT amount FROM wallet_transactions WHERE reference = $1 AND type = 'pending_topup' LIMIT 1`,
        [tx_ref]
      );
      paidAmount = pending[0] ? parseFloat(pending[0].amount) : 0;
    } else {
      const fetch = (await import('node-fetch')).default;
      const chapaRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
        headers: { 'Authorization': `Bearer ${CHAPA_SECRET}` },
      }).then(r => r.json());
      paymentSuccess = chapaRes.status === 'success' && chapaRes.data?.status === 'success';
      paidAmount = parseFloat(chapaRes.data?.amount || 0);

      if (!paymentSuccess) {
        await pool.query(
          `UPDATE wallet_transactions SET description = 'Chapa top-up FAILED', type = 'failed_topup'
           WHERE reference = $1 AND type = 'pending_topup'`,
          [tx_ref]
        );
        if (req.headers.accept?.includes('text/html')) {
          return res.redirect(`${frontendUrl}/wallet?topup=failed&tx_ref=${tx_ref}`);
        }
        return apiError.validationError(res, 'Payment not successful');
      }
    }

    // Find wallet from pending transaction
    const { rows: pending } = await pool.query(
      `SELECT wt.wallet_id, wt.amount FROM wallet_transactions wt
       WHERE wt.reference = $1 AND wt.type = 'pending_topup' LIMIT 1`,
      [tx_ref]
    );

    if (!pending.length) {
      if (req.headers.accept?.includes('text/html')) {
        return res.redirect(`${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}`);
      }
      return res.json({ success: true, already_processed: true });
    }

    const walletId    = pending[0].wallet_id;
    const creditAmount = paidAmount || parseFloat(pending[0].amount);

    // Credit the wallet
    await pool.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [creditAmount, walletId]
    );

    // Mark as completed credit
    await pool.query(
      `UPDATE wallet_transactions
       SET type = 'credit', description = $1
       WHERE reference = $2 AND type = 'pending_topup'`,
      [CHAPA_SANDBOX ? 'Chapa wallet top-up (sandbox)' : 'Chapa wallet top-up (confirmed)', tx_ref]
    );

    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(`${frontendUrl}/wallet?topup=success&tx_ref=${tx_ref}`);
    }
    res.json({ success: true, amount_credited: creditAmount });
  } catch (err) {
    logger.error({ err }, 'Chapa wallet verify error');
    return apiError.serverError(res, 'Failed to verify Chapa top-up');
  }
});

module.exports = router;
