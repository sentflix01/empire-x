const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord } = require('../utils/crud');
const { collectCommission } = require('./commission');
const { notifyUser } = require('./telegram');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');
const { sendOrderConfirmation } = require('../utils/mailer');

// Only initialise Stripe if the key is configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// ── Chapa helpers (native ETB payment gateway for Ethiopia) ──────────────────
const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY || null;
const CHAPA_BASE   = 'https://api.chapa.co/v1';
const CHAPA_SANDBOX = CHAPA_SECRET === 'SANDBOX';

async function chapaPost(path, body) {
  // Sandbox mode — simulate a successful Chapa response locally
  if (CHAPA_SANDBOX) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiUrl      = process.env.API_URL      || 'http://localhost:3001';
    const tx_ref      = body.tx_ref || `sandbox-${Date.now()}`;
    if (path === '/transaction/initialize') {
      return {
        status: 'success',
        message: 'Hosted Link',
        data: {
          checkout_url: `${apiUrl}/api/orders/chapa/sandbox?tx_ref=${tx_ref}&return_url=${encodeURIComponent(body.return_url || frontendUrl)}`,
        },
      };
    }
  }
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`${CHAPA_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHAPA_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function chapaGet(path) {
  // Sandbox mode — auto-verify any tx_ref
  if (CHAPA_SANDBOX) {
    const tx_ref = path.split('/').pop();
    return { status: 'success', data: { status: 'success', tx_ref, amount: '0', currency: 'ETB' } };
  }
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`${CHAPA_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${CHAPA_SECRET}` },
  });
  return res.json();
}

// List orders (buyer or seller)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { buyer_id, seller_id, status, sort = '-created_at', limit = 50 } = req.query;
    // Users can only see their own orders unless admin
    const filter = {};
    if (req.user.role !== 'admin') {
      // Must be filtered to the current user
      const requestedBuyer = buyer_id === req.user.id ? buyer_id : null;
      const requestedSeller = seller_id === req.user.id ? seller_id : null;
      if (!requestedBuyer && !requestedSeller) {
        filter.buyer_id = req.user.id;
      } else {
        if (requestedBuyer) filter.buyer_id = requestedBuyer;
        if (requestedSeller) filter.seller_id = requestedSeller;
      }
    } else {
      if (buyer_id) filter.buyer_id = buyer_id;
      if (seller_id) filter.seller_id = seller_id;
    }
    if (status) filter.status = status;
    res.json(await listRecords('orders', { filter, sort, limit }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await getRecord('orders', req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order
router.post('/', requireAuth, async (req, res) => {
  try {
    const { seller_id, product_title, total_price } = req.body;
    if (!seller_id || !product_title || total_price == null) {
      return res.status(400).json({ error: 'seller_id, product_title, and total_price are required' });
    }
    const order = await createRecord('orders', { ...req.body, buyer_id: req.user.id });
    res.status(201).json(order);

    // Send confirmation email to buyer (non-blocking)
    try {
      const { rows: buyers } = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      if (buyers.length && buyers[0].email) {
        sendOrderConfirmation(buyers[0].email, order).catch(() => {});
      }
    } catch { /* email failure should never break the order */ }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('orders', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    // Buyer can cancel; seller can update status; admin can do anything
    if (existing.buyer_id !== req.user.id && existing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await updateRecord('orders', req.params.id, req.body);
    // Collect commission when order is completed
    if (req.body.status === 'completed' && existing.status !== 'completed') {
      collectCommission(existing.id, existing.seller_id, existing.total_price).catch(console.error);
      notifyUser(existing.seller_id, `✅ <b>Order Completed</b>\n${existing.product_title}\nAmount: ${existing.total_price} ${existing.currency}`).catch(() => {});
      notifyUser(existing.buyer_id, `📦 <b>Your order is complete!</b>\n${existing.product_title}\nThank you for shopping on Empire X 👑`).catch(() => {});

      // Real-time notification to buyer and seller
      const [{ rows: [buyerNotif] }, { rows: [sellerNotif] }] = await Promise.all([
        pool.query(
          `INSERT INTO notifications (user_id, type, title, body, link, is_read)
           VALUES ($1, 'order', $2, $3, '/orders', false) RETURNING *`,
          [existing.buyer_id, '📦 Order completed!', `Your order for ${existing.product_title} is complete.`]
        ),
        pool.query(
          `INSERT INTO notifications (user_id, type, title, body, link, is_read)
           VALUES ($1, 'order', $2, $3, '/orders', false) RETURNING *`,
          [existing.seller_id, '✅ Sale completed!', `Order for ${existing.product_title} has been completed.`]
        ),
      ]);
      emitNotification(existing.buyer_id, buyerNotif);
      emitNotification(existing.seller_id, sellerNotif);
      sendPushToUser(existing.buyer_id, '📦 Order completed!', `Your order for ${existing.product_title} is complete.`, '/orders').catch(() => {});
      sendPushToUser(existing.seller_id, '✅ Sale completed!', `Order for ${existing.product_title} has been completed.`, '/orders').catch(() => {});
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ── Stripe Checkout ──────────────────────────────────────────────────────────
router.post('/checkout/session', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment processing is not configured yet. Contact the admin.' });
  }
  const { product_id, product_title, unit_price, quantity = 1, seller_id, currency = 'usd' } = req.body;
  if (!product_title || !unit_price || !seller_id) {
    return res.status(400).json({ error: 'product_title, unit_price, and seller_id are required' });
  }
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase() === 'etb' ? 'usd' : currency.toLowerCase(),
          product_data: { name: product_title },
          unit_amount: Math.round(unit_price * 100),
        },
        quantity,
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/marketplace?payment=success`,
      cancel_url: `${frontendUrl}/marketplace?payment=cancelled`,
      metadata: {
        buyer_id: req.user.id,
        seller_id,
        product_id: product_id || '',
        product_title,
        quantity: String(quantity),
      },
    });

    // Create a pending order
    await createRecord('orders', {
      buyer_id: req.user.id,
      seller_id,
      product_id: product_id || null,
      product_title,
      quantity,
      unit_price,
      total_price: unit_price * quantity,
      currency: currency || 'ETB',
      status: 'pending',
      stripe_session_id: session.id,
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('Stripe session error:', err);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

// Stripe Webhook
router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      await pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE stripe_session_id = $2',
        ['paid', session.id]
      );
    } catch (err) {
      console.error('Webhook DB update failed:', err);
    }
  }

  res.json({ received: true });
});

// ── Chapa Webhook — server-to-server payment notification ────────────────────
// Register this URL in Chapa Dashboard → Settings → Webhooks:
//   http://your-domain.com/api/orders/chapa/webhook
router.post('/chapa/webhook', async (req, res) => {
  // Acknowledge immediately — Chapa expects fast response
  res.json({ received: true });

  try {
    const { trx_ref, status } = req.body;
    if (!trx_ref) return;

    if (status === 'success') {
      const { rows } = await pool.query(
        `UPDATE orders SET status = 'paid', updated_at = NOW()
         WHERE chapa_tx_ref = $1 AND status = 'pending'
         RETURNING *`,
        [trx_ref]
      );
      if (rows.length) {
        const order = rows[0];
        collectCommission(order.id, order.seller_id, order.total_price).catch(console.error);
        notifyUser(order.seller_id, `💰 <b>Payment Confirmed!</b>\n${order.product_title}\nAmount: ${order.total_price} ETB via Chapa ✅`).catch(() => {});
        sendPushToUser(order.seller_id, '💰 Payment received!', `${order.product_title} — ${order.total_price} ETB`, '/orders').catch(() => {});
        sendPushToUser(order.buyer_id, '✅ Payment confirmed!', `Your payment for ${order.product_title} was successful.`, '/orders').catch(() => {});
        console.log(`[Chapa webhook] Order ${order.id} marked paid via webhook.`);
      }
    } else if (status === 'failed') {
      await pool.query(
        `UPDATE orders SET status = 'payment_failed', updated_at = NOW() WHERE chapa_tx_ref = $1 AND status = 'pending'`,
        [trx_ref]
      );
    }
  } catch (err) {
    console.error('[Chapa webhook] Error:', err.message);
  }
});

// ── Chapa order status check — frontend polls this after redirect ─────────────
router.get('/chapa/status/:tx_ref', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, status, product_title, total_price, chapa_tx_ref FROM orders WHERE chapa_tx_ref = $1 LIMIT 1`,
      [req.params.tx_ref]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check order status' });
  }
});
router.get('/chapa/sandbox', async (req, res) => {
  const { tx_ref, return_url } = req.query;
  const safeReturn = return_url ? decodeURIComponent(return_url) : (process.env.FRONTEND_URL || 'http://localhost:3000');
  const verifyUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/orders/chapa/verify/${tx_ref}`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Chapa Sandbox Payment — Empire X</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0fdf4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
    .card{background:#fff;border-radius:1.5rem;padding:2rem;max-width:400px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
    .logo{font-size:2.5rem;margin-bottom:.5rem}
    h1{font-size:1.25rem;font-weight:700;color:#111;margin-bottom:.25rem}
    .badge{display:inline-block;background:#dcfce7;color:#166534;font-size:.7rem;font-weight:700;padding:.2rem .6rem;border-radius:9999px;margin-bottom:1.5rem;letter-spacing:.05em}
    .tx{font-size:.8rem;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;border-radius:.75rem;padding:.75rem;margin-bottom:1.5rem;word-break:break-all}
    .methods{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1.5rem}
    .method{border:2px solid #e5e7eb;border-radius:.75rem;padding:.6rem;cursor:pointer;font-size:.8rem;font-weight:600;transition:all .15s}
    .method.active{border-color:#16a34a;background:#f0fdf4;color:#166534}
    .method:hover{border-color:#16a34a}
    .btn{width:100%;padding:.85rem;border:none;border-radius:9999px;font-size:.95rem;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;transition:opacity .15s}
    .btn:hover{opacity:.9}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .note{font-size:.7rem;color:#9ca3af;margin-top:1rem}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">🇪🇹</div>
  <h1>Chapa Payment</h1>
  <span class="badge">SANDBOX MODE</span>
  <div class="tx">tx_ref: <strong>${tx_ref}</strong></div>

  <p style="font-size:.85rem;color:#374151;margin-bottom:1rem;font-weight:500">Select payment method:</p>
  <div class="methods">
    <div class="method active" onclick="select(this)">📱 TeleBirr</div>
    <div class="method" onclick="select(this)">🏦 CBE Birr</div>
    <div class="method" onclick="select(this)">💚 M-Pesa</div>
    <div class="method" onclick="select(this)">🏛️ Awash Bank</div>
  </div>

  <button class="btn" onclick="pay()">✅ Confirm Payment</button>
  <p class="note">This is a sandbox simulation. No real money is moved.<br/>In production, replace CHAPA_SECRET_KEY with your live key.</p>
</div>
<script>
  function select(el){document.querySelectorAll('.method').forEach(m=>m.classList.remove('active'));el.classList.add('active')}
  async function pay(){
    document.querySelector('.btn').disabled=true;
    document.querySelector('.btn').textContent='Processing...';
    try{
      await fetch('${verifyUrl}');
    }catch(e){}
    window.location.href='${safeReturn}';
  }
</script>
</body>
</html>`);
});

// ── Chapa Checkout — Initialize ──────────────────────────────────────────────
router.post('/checkout/chapa', requireAuth, async (req, res) => {
  if (!CHAPA_SECRET) {
    return res.status(503).json({ error: 'Chapa payments are not configured. Add CHAPA_SECRET_KEY to your .env file.' });
  }

  const {
    product_id, product_title, unit_price, quantity = 1,
    seller_id, buyer_name, buyer_email, buyer_phone,
    delivery_address, notes, coupon_discount = 0,
  } = req.body;

  if (!product_title || !unit_price || !seller_id) {
    return res.status(400).json({ error: 'product_title, unit_price, and seller_id are required' });
  }

  const totalPrice = Math.max(0, (unit_price * quantity) - coupon_discount);
  const tx_ref = `empx-${req.user.id.slice(0, 8)}-${Date.now()}`;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    // Create a pending order first so we have an order ID to reference
    const order = await createRecord('orders', {
      buyer_id:         req.user.id,
      seller_id,
      product_id:       product_id || null,
      product_title,
      quantity,
      unit_price,
      total_price:      totalPrice,
      currency:         'ETB',
      status:           'pending',
      buyer_name:       buyer_name || '',
      buyer_email:      buyer_email || '',
      delivery_address: delivery_address || '',
      notes:            notes || '',
      chapa_tx_ref:     tx_ref,
    });

    // Initialize Chapa transaction
    const chapaRes = await chapaPost('/transaction/initialize', {
      amount:           String(totalPrice),
      currency:         'ETB',
      email:            buyer_email || req.user.email || 'buyer@empirex.app',
      first_name:       (buyer_name || 'Empire').split(' ')[0],
      last_name:        (buyer_name || 'X User').split(' ').slice(1).join(' ') || 'User',
      phone_number:     buyer_phone || '',
      tx_ref,
      callback_url:     `${process.env.API_URL || 'http://localhost:3001'}/api/orders/chapa/verify/${tx_ref}`,
      return_url:       `${frontendUrl}/marketplace?payment=success&tx_ref=${tx_ref}`,
      customization: {
        title:          'Empire X Order',
        description:    `${quantity}× ${product_title}`,
        logo:           `${frontendUrl}/brand/empire-x-logo.png`,
      },
    });

    if (chapaRes.status !== 'success' || !chapaRes.data?.checkout_url) {
      // Roll back the pending order on Chapa failure
      await pool.query('DELETE FROM orders WHERE chapa_tx_ref = $1', [tx_ref]);
      return res.status(502).json({
        error: chapaRes.message || 'Failed to initialize Chapa payment',
        detail: chapaRes,
      });
    }

    res.json({
      checkout_url: chapaRes.data.checkout_url,
      tx_ref,
      order_id: order.id,
    });
  } catch (err) {
    console.error('Chapa init error:', err);
    res.status(500).json({ error: 'Failed to initialize Chapa payment' });
  }
});

// ── Chapa Verify — called by Chapa callback + manually from frontend ──────────
router.get('/chapa/verify/:tx_ref', async (req, res) => {
  const { tx_ref } = req.params;
  if (!CHAPA_SECRET) {
    return res.status(503).json({ error: 'Chapa not configured' });
  }

  try {
    const chapaRes = await chapaGet(`/transaction/verify/${tx_ref}`);

    if (chapaRes.status !== 'success' || chapaRes.data?.status !== 'success') {
      // Mark order as failed
      await pool.query(
        `UPDATE orders SET status = 'payment_failed', updated_at = NOW() WHERE chapa_tx_ref = $1`,
        [tx_ref]
      );
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      // If called by Chapa callback (GET redirect), redirect browser
      if (req.headers.accept?.includes('text/html')) {
        return res.redirect(`${frontendUrl}/marketplace?payment=failed&tx_ref=${tx_ref}`);
      }
      return res.status(400).json({ error: 'Payment not successful', detail: chapaRes });
    }

    // Payment confirmed — update order to paid
    const { rows } = await pool.query(
      `UPDATE orders SET status = 'paid', updated_at = NOW()
       WHERE chapa_tx_ref = $1 AND status = 'pending'
       RETURNING *`,
      [tx_ref]
    );

    if (rows.length) {
      const order = rows[0];
      // Collect platform commission
      collectCommission(order.id, order.seller_id, order.total_price).catch(console.error);
      // Notify seller
      notifyUser(order.seller_id, `💰 <b>Payment Received!</b>\n${order.product_title}\nAmount: ${order.total_price} ETB\nPaid via Chapa ✅`).catch(() => {});
      // Push notification
      sendPushToUser(order.seller_id, '💰 Payment received!', `${order.product_title} — ${order.total_price} ETB paid via Chapa`, '/orders').catch(() => {});
      sendPushToUser(order.buyer_id, '✅ Payment confirmed!', `Your payment for ${order.product_title} was successful.`, '/orders').catch(() => {});
    }

    // If browser redirect from Chapa callback
    if (req.headers.accept?.includes('text/html')) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/marketplace?payment=success&tx_ref=${tx_ref}`);
    }

    res.json({ success: true, tx_ref, order: rows[0] || null });
  } catch (err) {
    console.error('Chapa verify error:', err);
    res.status(500).json({ error: 'Failed to verify Chapa payment' });
  }
});

module.exports = router;
