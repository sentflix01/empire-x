const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord } = require('../utils/crud');
const { collectCommission } = require('./commission');
const { notifyUser } = require('./telegram');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');

// Only initialise Stripe if the key is configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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

module.exports = router;
