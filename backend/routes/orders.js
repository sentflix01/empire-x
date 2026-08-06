const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord } = require('../utils/crud');
const { collectCommission } = require('./commission');
const { notifyUser } = require('./telegram');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');
const { sendOrderConfirmation } = require('../utils/mailer');
const apiError = require('../lib/apiError');
const logger = require('../lib/logger');
const { getPrimaryFrontendUrl } = require('../lib/frontendUrl');
const { isEnabled } = require('../lib/featureFlags');

// Only initialise Stripe if the key is configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// ── Stripe currency configuration ────────────────────────────────────────────
// STRIPE_CURRENCY selects the charge currency (default usd). ETB is not
// supported by every Stripe account, so if Stripe rejects an ETB session we
// fall back to USD using STRIPE_ETB_TO_USD_RATE (default 0.008).
const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
const STRIPE_ETB_TO_USD_RATE = (() => {
  const r = parseFloat(process.env.STRIPE_ETB_TO_USD_RATE || '0.008');
  return Number.isFinite(r) && r > 0 ? r : 0.008;
})();

/** Convert a platform (ETB) amount into integer cents in the charge currency. */
function toChargeCents(amountEtb, currency) {
  const value = currency === 'usd' ? amountEtb * STRIPE_ETB_TO_USD_RATE : amountEtb;
  return Math.round(value * 100);
}

// ── Chapa helpers (native ETB payment gateway for Ethiopia) ──────────────────
const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY || null;
const CHAPA_BASE   = 'https://api.chapa.co/v1';
const CHAPA_SANDBOX = CHAPA_SECRET === 'SANDBOX';

async function chapaPost(path, body) {
  // Sandbox mode — simulate a successful Chapa response locally
  if (CHAPA_SANDBOX) {
    const frontendUrl = getPrimaryFrontendUrl();
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
    return apiError.serverError(res, 'Failed to fetch orders');
  }
});

// Get single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await getRecord('orders', req.params.id);
    if (!order) return apiError.notFound(res, 'Order not found');
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    return apiError.serverError(res, 'Failed to fetch order');
  }
});

// Create order
router.post('/', requireAuth, async (req, res) => {
  try {
    const { seller_id, product_title, total_price } = req.body;
    if (!seller_id || !product_title || total_price == null) {
      return apiError.validationError(res, 'seller_id, product_title, and total_price are required');
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
    logger.error({ err }, 'Failed to create order');
    return apiError.serverError(res, 'Failed to create order');
  }
});

// Update order status
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('orders', req.params.id);
    if (!existing) return apiError.notFound(res, 'Order not found');
    // Buyer can cancel; seller can update status; admin can do anything
    if (existing.buyer_id !== req.user.id && existing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await updateRecord('orders', req.params.id, req.body);
    // Collect commission when order is completed
    if (req.body.status === 'completed' && existing.status !== 'completed') {
      collectCommission(existing.id, existing.seller_id, existing.total_price).catch(err => logger.error({ err }, 'Failed to collect commission'));
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
    logger.error({ err }, 'Failed to update order');
    return apiError.serverError(res, 'Failed to update order');
  }
});

// ── Stripe Checkout ──────────────────────────────────────────────────────────
// Accepts BOTH:
//   • single-product shape: { product_id, quantity }
//   • multi-item shape:     { items: [{ product_id, quantity }] }
// All totals are computed server-side from the products table (client prices
// are never trusted). Multi-seller carts get one order row per seller but a
// SINGLE combined hosted Checkout Session (one redirect URL for the buyer).
// Coupons are validated server-side.
router.post('/checkout/session', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe payments are not configured yet. Add STRIPE_SECRET_KEY to the server environment.' });
  }
  try {
    if (!(await isEnabled('stripe_payments'))) {
      return res.status(503).json({ error: 'Stripe payments are temporarily disabled. Please use Chapa or place a COD order.' });
    }
  } catch { /* flag lookup failure — fall through and let Stripe decide */ }

  const createdOrderIds = [];
  try {
    const frontendUrl = getPrimaryFrontendUrl();

    // ── Resolve requested items (multi-item or legacy single-product shape) ──
    const rawItems = Array.isArray(req.body.items) && req.body.items.length
      ? req.body.items
      : [{ product_id: req.body.product_id, quantity: req.body.quantity }];
    const requested = rawItems
      .map(i => ({ product_id: i?.product_id, quantity: Math.max(1, parseInt(i?.quantity, 10) || 1) }))
      .filter(i => i.product_id);
    if (!requested.length) {
      return apiError.validationError(res, 'product_id (or items: [{ product_id, quantity }]) is required');
    }

    // ── Load products — prices ALWAYS come from the DB ───────────────────────
    const { rows: products } = await pool.query(
      'SELECT * FROM products WHERE id = ANY($1::uuid[])',
      [requested.map(i => i.product_id)]
    );
    const productById = new Map(products.map(p => [p.id, p]));
    for (const item of requested) {
      if (!productById.has(item.product_id)) {
        return apiError.notFound(res, 'One or more products were not found');
      }
    }

    // ── Group by seller: one order + one session per seller ─────────────────
    const groups = new Map(); // seller_id → { items: [], subtotal }
    for (const item of requested) {
      const product = productById.get(item.product_id);
      if (product.status === 'draft') {
        return apiError.validationError(res, `"${product.title}" is not available for purchase`);
      }
      if (product.stock !== null && product.stock < item.quantity) {
        return apiError.validationError(res, `Only ${product.stock} of "${product.title}" in stock`);
      }
      const g = groups.get(product.seller_id) || { seller_id: product.seller_id, items: [], subtotal: 0 };
      g.items.push({ product, quantity: item.quantity });
      g.subtotal += parseFloat(product.price) * item.quantity;
      groups.set(product.seller_id, g);
    }

    // ── Coupon — validated server-side, applied to the coupon owner's group ──
    let couponInfo = null; // { id, seller_id, code, discount }
    if (req.body.coupon_code) {
      const code = String(req.body.coupon_code).toUpperCase();
      const { rows: coupons } = await pool.query(
        `SELECT * FROM coupons
         WHERE code = $1 AND seller_id = ANY($2::uuid[]) AND is_active = TRUE
           AND (expires_at IS NULL OR expires_at > NOW())
           AND (usage_limit IS NULL OR usage_count < usage_limit)`,
        [code, [...groups.keys()]]
      );
      if (!coupons.length) return apiError.notFound(res, 'Invalid or expired coupon code');
      const coupon = coupons[0];
      const group = groups.get(coupon.seller_id);
      if (coupon.min_order && group.subtotal < parseFloat(coupon.min_order)) {
        return apiError.validationError(res, `This coupon requires a minimum order of ${coupon.min_order}`);
      }
      const discount = coupon.discount_type === 'percentage'
        ? group.subtotal * (parseFloat(coupon.discount_value) / 100)
        : parseFloat(coupon.discount_value);
      couponInfo = { id: coupon.id, seller_id: coupon.seller_id, code, discount: Math.min(discount, group.subtotal) };
    }

    // ── Create one pending order per seller, then ONE combined session ──────
    let chargeCurrency = STRIPE_CURRENCY === 'etb' ? 'etb' : 'usd';
    let fellBackToUsd = false;
    let grandSubtotal = 0, grandDiscount = 0, grandTotal = 0;

    for (const group of groups.values()) {
      const subtotal = Math.round(group.subtotal * 100) / 100;
      const discount = couponInfo && couponInfo.seller_id === group.seller_id
        ? Math.round(couponInfo.discount * 100) / 100
        : 0;
      const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
      if (total <= 0) {
        return apiError.validationError(res, 'Order total must be greater than zero');
      }

      const businessId = group.items.find(i => i.product.business_id)?.product.business_id || null;
      const productTitles = group.items.map(i => `${i.quantity}× ${i.product.title}`).join(', ');

      // Pending order first — the webhook matches it via stripe_session_id
      const order = await createRecord('orders', {
        buyer_id:         req.user.id,
        seller_id:        group.seller_id,
        business_id:      businessId,
        product_id:       group.items[0].product.id,
        product_title:    productTitles,
        quantity:         group.items.reduce((s, i) => s + i.quantity, 0),
        unit_price:       parseFloat(group.items[0].product.price),
        total_price:      total,
        currency:         'ETB',
        status:           'pending',
        payment_provider: 'stripe',
        amount_subtotal:  subtotal,
        amount_discount:  discount,
        buyer_name:       req.body.buyer_name || '',
        buyer_email:      req.body.buyer_email || req.user.email || '',
        buyer_phone:      req.body.buyer_phone || '',
        delivery_address: req.body.delivery_address || '',
        notes:            req.body.notes || '',
      });
      createdOrderIds.push(order.id);

      group.subtotal = subtotal;
      group.discount = discount;
      group.total    = total;
      grandSubtotal += subtotal;
      grandDiscount += discount;
      grandTotal    += total;
    }
    grandSubtotal = Math.round(grandSubtotal * 100) / 100;
    grandDiscount = Math.round(grandDiscount * 100) / 100;
    grandTotal    = Math.max(0, Math.round(grandTotal * 100) / 100);

    // ── ONE Checkout Session containing every seller's line items ──────────
    // The platform-collects model splits commission per seller at webhook
    // time, so a single charge across sellers is safe. Integer-cent math:
    // per-line rounding drift is absorbed by a tiny adjustment line so the
    // charged total ALWAYS equals the server-computed grand total (no
    // off-by-cent ETB→USD drift).
    const buildCombinedLineItems = (currency) => {
      const items = [];
      for (const group of groups.values()) {
        for (const i of group.items) {
          items.push({
            price_data: {
              currency,
              product_data: { name: i.product.title },
              unit_amount: toChargeCents(parseFloat(i.product.price), currency),
            },
            quantity: i.quantity,
          });
        }
      }
      if (grandDiscount > 0) {
        // Single negative line item keeps the charge total correct server-side
        items.push({
          price_data: {
            currency,
            product_data: { name: `Coupon discount (${couponInfo.code})` },
            unit_amount: -toChargeCents(grandDiscount, currency),
          },
          quantity: 1,
        });
      }
      const expectedCents = toChargeCents(grandTotal, currency);
      const sumCents = items.reduce((s, it) => s + it.price_data.unit_amount * it.quantity, 0);
      const drift = expectedCents - sumCents;
      if (drift !== 0) {
        items.push({
          price_data: {
            currency,
            product_data: { name: 'Rounding adjustment' },
            unit_amount: drift,
          },
          quantity: 1,
        });
      }
      return items;
    };

    const sessionParams = {
      // payment_method_types intentionally OMITTED — with automatic payment
      // methods Stripe offers every method enabled on the account (cards,
      // wallets, and all local payment methods).
      mode: 'payment',
      line_items: buildCombinedLineItems(chargeCurrency),
      success_url: `${frontendUrl}/marketplace?payment=success&provider=stripe`,
      cancel_url:  `${frontendUrl}/marketplace?payment=cancelled&provider=stripe`,
      metadata: {
        purpose: 'order',
        buyer_id: req.user.id,
        order_ids: createdOrderIds.join(','),
        seller_ids: [...groups.keys()].join(','),
        coupon_id: couponInfo ? couponInfo.id : '',
      },
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (err) {
      // ETB is rejected by accounts that don't support it — retry in USD
      if (chargeCurrency === 'etb') {
        fellBackToUsd = true;
        chargeCurrency = 'usd';
        sessionParams.line_items = buildCombinedLineItems('usd');
        session = await stripe.checkout.sessions.create(sessionParams);
      } else {
        throw err;
      }
    }

    await pool.query(
      'UPDATE orders SET stripe_session_id = $1 WHERE id = ANY($2::uuid[])',
      [session.id, createdOrderIds]
    );

    res.json({
      url: session.url,
      session_id: session.id,
      order_ids: createdOrderIds,
      display: {
        currency: 'ETB',
        subtotal: grandSubtotal,
        discount: grandDiscount,
        total: grandTotal,
        charge_currency: chargeCurrency.toUpperCase(),
        charge_total: toChargeCents(grandTotal, chargeCurrency) / 100,
        // Converted amounts for UI display (integer-cent math — no drift)
        converted: chargeCurrency === 'usd'
          ? { currency: 'USD', rate: STRIPE_ETB_TO_USD_RATE, total: toChargeCents(grandTotal, 'usd') / 100 }
          : null,
        fell_back_to_usd: fellBackToUsd,
      },
    });
  } catch (err) {
    // Roll back ONLY orders that never received a live Stripe session.
    // Orders already tied to a live session stay 'pending' — the session's
    // own events (expired / payment_failed / completed) resolve them, so we
    // never delete an order the buyer might still pay for.
    if (createdOrderIds.length) {
      pool.query(
        `UPDATE orders SET status = 'payment_failed', updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND stripe_session_id IS NULL AND status = 'pending'`,
        [createdOrderIds]
      ).catch(() => {});
    }
    logger.error({ err }, 'Stripe session error');
    return apiError.serverError(res, 'Failed to create payment session');
  }
});

// ── Stripe Webhook — verified, idempotent event handling ─────────────────────
async function markStripeOrdersPaid(session) {
  const { rows } = await pool.query(
    `UPDATE orders SET status = 'paid', stripe_payment_intent_id = $1, updated_at = NOW()
     WHERE stripe_session_id = $2 AND status = 'pending'
     RETURNING *`,
    [session.payment_intent || null, session.id]
  );
  // Coupon redemptions are counted atomically at payment confirmation time
  const couponId = session.metadata?.coupon_id;
  if (couponId) {
    await pool.query(
      'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1',
      [couponId]
    );
  }
  for (const order of rows) {
    collectCommission(order.id, order.seller_id, order.total_price)
      .catch(err => logger.error({ err }, 'Failed to collect commission (Stripe webhook)'));
    notifyUser(order.seller_id, `💰 <b>Payment Confirmed!</b>\n${order.product_title}\nAmount: ${order.total_price} ETB via Stripe ✅`).catch(() => {});
    sendPushToUser(order.seller_id, '💰 Payment received!', `${order.product_title} — ${order.total_price} ETB via Stripe`, '/orders').catch(() => {});
    sendPushToUser(order.buyer_id, '✅ Payment confirmed!', `Your payment for ${order.product_title} was successful.`, '/orders').catch(() => {});
    logger.info({ orderId: order.id }, '[Stripe webhook] Order marked paid');
  }
  return rows;
}

async function completeStripeWalletTopup(session) {
  // Transactional claim-and-credit: the pending_topup row is flipped to
  // 'credit' atomically (so retries can never double-credit) and the wallet
  // balance update commits together with it.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pending } = await client.query(
      `UPDATE wallet_transactions SET type = 'credit', description = 'Stripe wallet top-up (confirmed)'
       WHERE reference = $1 AND type = 'pending_topup'
       RETURNING id, wallet_id, amount`,
      [session.id]
    );
    if (!pending.length) {
      await client.query('COMMIT');
      return; // already credited or unknown session
    }
    const credit = parseFloat(session.metadata?.amount_etb || pending[0].amount);
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [credit, pending[0].wallet_id]
    );
    await client.query('COMMIT');
    logger.info({ walletId: pending[0].wallet_id, credit }, '[Stripe webhook] Wallet top-up credited');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err; // webhook returns 500 → Stripe retries the event
  } finally {
    client.release();
  }
}

async function handleStripeEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object || {};
      // Never move money until Stripe confirms the payment settled —
      // 'completed' also fires for deferred methods before funds arrive.
      if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') return;
      if (session.metadata?.purpose === 'wallet_topup') {
        return completeStripeWalletTopup(session);
      }
      await markStripeOrdersPaid(session);
      return;
    }

    case 'checkout.session.expired': {
      const session = event.data.object || {};
      if (session.metadata?.purpose === 'wallet_topup') {
        await pool.query(
          `UPDATE wallet_transactions SET type = 'failed_topup', description = 'Stripe top-up expired'
           WHERE reference = $1 AND type = 'pending_topup'`,
          [session.id]
        );
        return;
      }
      await pool.query(
        `UPDATE orders SET status = 'payment_failed', updated_at = NOW()
         WHERE stripe_session_id = $1 AND status = 'pending'`,
        [session.id]
      );
      return;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object || {};
      if (!pi.id) return;
      await pool.query(
        `UPDATE orders SET status = 'payment_failed', updated_at = NOW()
         WHERE stripe_payment_intent_id = $1 AND status = 'pending'`,
        [pi.id]
      );
      return;
    }

    case 'charge.refunded': {
      const charge = event.data.object || {};
      if (!charge.payment_intent) return;
      // Partial-refund aware: amounts are in Stripe minor units
      const chargeAmount = Number(charge.amount) || 0;
      const refundedAmount = Number(charge.amount_refunded ?? charge.amount) || 0;
      const isFullRefund = refundedAmount >= chargeAmount;
      const refundRatio = chargeAmount > 0 ? Math.min(1, refundedAmount / chargeAmount) : 1;

      // ── Wallet top-up refund: Stripe has already returned the money to the
      //    payer's card, so we only REVERSE the platform-side credit,
      //    proportionally to what was actually refunded.
      if (charge.metadata?.purpose === 'wallet_topup') {
        const walletId = charge.metadata.wallet_id;
        const topupEtb = parseFloat(charge.metadata.amount_etb || '0');
        const reversal = Math.round(topupEtb * refundRatio * 100) / 100;
        if (walletId && reversal > 0) {
          await pool.query(
            'UPDATE wallets SET balance = GREATEST(balance - $1, 0), updated_at = NOW() WHERE id = $2',
            [reversal, walletId]
          );
          await pool.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
             VALUES ($1, 'debit', $2, $3, $4)`,
            [walletId, reversal, `Stripe top-up refund reversal (${isFullRefund ? 'full' : 'partial'})`, charge.id || charge.payment_intent]
          );
          logger.info({ walletId, reversal }, '[Stripe webhook] Wallet top-up reversal applied');
        }
        return;
      }

      // ── Product orders: Stripe refunds the buyer's payment method directly.
      //    DO NOT credit the buyer wallet (that would double-refund). Instead
      //    mark the order refunded and reverse the platform commission.
      const { rows } = await pool.query(
        `SELECT * FROM orders
         WHERE stripe_payment_intent_id = $1 AND status IN ('paid','processing','completed')`,
        [charge.payment_intent]
      );
      for (const order of rows) {
        if (isFullRefund) {
          await pool.query(
            `UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
            [order.id]
          );
        }
        // Reverse commission proportional to the refunded amount and give it
        // back to the seller (collection deducted their wallet).
        const { rows: commRows } = await pool.query(
          `SELECT id, amount FROM commissions WHERE order_id = $1 AND status <> 'refunded'`,
          [order.id]
        );
        for (const c of commRows) {
          const reversed = Math.round(parseFloat(c.amount) * refundRatio * 100) / 100;
          if (reversed <= 0) continue;
          if (isFullRefund) {
            await pool.query(`UPDATE commissions SET status = 'refunded' WHERE id = $1`, [c.id]);
          } else {
            await pool.query(`UPDATE commissions SET amount = GREATEST(amount - $1, 0) WHERE id = $2`, [reversed, c.id]);
          }
          await pool.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
            [reversed, order.seller_id]
          );
          await pool.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
             SELECT id, 'credit', $1, $2, $3 FROM wallets WHERE user_id = $4`,
            [reversed, `Commission reversal (${isFullRefund ? 'full' : 'partial'} Stripe refund)`, order.id, order.seller_id]
          );
        }
        const refundedEtb = Math.round(parseFloat(order.total_price) * refundRatio * 100) / 100;
        notifyUser(order.buyer_id, `💸 <b>Refund processed</b>\n${order.product_title}\nAmount: ${refundedEtb} ETB (returned to your payment method)`).catch(() => {});
        notifyUser(order.seller_id, `↩️ <b>Order refunded</b>\n${order.product_title}\nAmount: ${refundedEtb} ETB`).catch(() => {});
        logger.info({ orderId: order.id, isFullRefund, refundedEtb }, '[Stripe webhook] Order refund processed');
      }
      return;
    }

    default:
      return; // ignore all other event types
  }
}

router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return apiError.validationError(res, `Webhook error: ${err.message}`);
  }

  try {
    // Idempotency: skip events we have already processed successfully
    const seen = await pool.query('SELECT id FROM webhook_events WHERE id = $1', [event.id]);
    if (seen.rows.length) {
      logger.info({ eventId: event.id, type: event.type }, '[Stripe webhook] Duplicate event ignored');
      return res.json({ received: true, duplicate: true });
    }
    // Process FIRST, then record the event. If processing throws, we answer
    // non-2xx WITHOUT a dedupe row so Stripe retries the event instead of
    // losing it forever.
    await handleStripeEvent(event);
    await pool.query(
      'INSERT INTO webhook_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
      [event.id, event.type]
    );
    return res.json({ received: true });
  } catch (err) {
    logger.error({ err: err.message, eventId: event.id, type: event.type }, '[Stripe webhook] Processing failed — Stripe will retry');
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
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
        collectCommission(order.id, order.seller_id, order.total_price).catch(err => logger.error({ err }, 'Failed to collect commission (Chapa webhook'));
        notifyUser(order.seller_id, `💰 <b>Payment Confirmed!</b>\n${order.product_title}\nAmount: ${order.total_price} ETB via Chapa ✅`).catch(() => {});
        sendPushToUser(order.seller_id, '💰 Payment received!', `${order.product_title} — ${order.total_price} ETB`, '/orders').catch(() => {});
        sendPushToUser(order.buyer_id, '✅ Payment confirmed!', `Your payment for ${order.product_title} was successful.`, '/orders').catch(() => {});
        logger.info({ orderId: order.id }, '[Chapa webhook] Order marked paid via webhook');
      }
    } else if (status === 'failed') {
      await pool.query(
        `UPDATE orders SET status = 'payment_failed', updated_at = NOW() WHERE chapa_tx_ref = $1 AND status = 'pending'`,
        [trx_ref]
      );
    }
  } catch (err) {
    logger.error({ err }, '[Chapa webhook] Error');
  }
});

// ── Chapa order status check — frontend polls this after redirect ─────────────
router.get('/chapa/status/:tx_ref', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, status, product_title, total_price, chapa_tx_ref FROM orders WHERE chapa_tx_ref = $1 LIMIT 1`,
      [req.params.tx_ref]
    );
    if (!rows.length) return apiError.notFound(res, 'Order not found');
    res.json(rows[0]);
  } catch (err) {
    logger.error({ err }, 'Failed to check order status');
    return apiError.serverError(res, 'Failed to check order status');
  }
});
router.get('/chapa/sandbox', async (req, res) => {
  const { tx_ref, return_url } = req.query;
  // Sanitize inputs to prevent XSS in server-rendered HTML
  const safeTxRef   = String(tx_ref   || '').replace(/[<>"'&]/g, c => `&#${c.charCodeAt(0)};`);
  const safeReturn  = return_url ? decodeURIComponent(return_url) : getPrimaryFrontendUrl();
  // Validate return URL is a same-site or configured frontend URL (prevent open redirect)
  const verifyUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/orders/chapa/verify/${encodeURIComponent(tx_ref || '')}`;

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
  <div class="tx">tx_ref: <strong>${safeTxRef}</strong></div>

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
  var VERIFY_URL = ${JSON.stringify(verifyUrl)};
  var RETURN_URL = ${JSON.stringify(safeReturn)};
  function select(el){document.querySelectorAll('.method').forEach(m=>m.classList.remove('active'));el.classList.add('active')}
  async function pay(){
    document.querySelector('.btn').disabled=true;
    document.querySelector('.btn').textContent='Processing...';
    try{
      await fetch(VERIFY_URL);
    }catch(e){}
    window.location.href=RETURN_URL;
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
    return apiError.validationError(res, 'product_title, unit_price, and seller_id are required');
  }

  const totalPrice = Math.max(0, (unit_price * quantity) - coupon_discount);
  const tx_ref = `empx-${req.user.id.slice(0, 8)}-${Date.now()}`;
  const frontendUrl = getPrimaryFrontendUrl();

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
    logger.error({ err }, 'Chapa init error');
    return apiError.serverError(res, 'Failed to initialize Chapa payment');
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
      const frontendUrl = getPrimaryFrontendUrl();
      // If called by Chapa callback (GET redirect), redirect browser
      if (req.headers.accept?.includes('text/html')) {
        return res.redirect(`${frontendUrl}/marketplace?payment=failed&tx_ref=${tx_ref}`);
      }
      return apiError.validationError(res, chapaRes.message || 'Payment not successful');
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
      collectCommission(order.id, order.seller_id, order.total_price).catch(err => logger.error({ err }, 'Failed to collect commission (Chapa verify)'));
      // Notify seller
      notifyUser(order.seller_id, `💰 <b>Payment Received!</b>\n${order.product_title}\nAmount: ${order.total_price} ETB\nPaid via Chapa ✅`).catch(() => {});
      // Push notification
      sendPushToUser(order.seller_id, '💰 Payment received!', `${order.product_title} — ${order.total_price} ETB paid via Chapa`, '/orders').catch(() => {});
      sendPushToUser(order.buyer_id, '✅ Payment confirmed!', `Your payment for ${order.product_title} was successful.`, '/orders').catch(() => {});
    }

    // If browser redirect from Chapa callback
    if (req.headers.accept?.includes('text/html')) {
      const frontendUrl = getPrimaryFrontendUrl();
      return res.redirect(`${frontendUrl}/marketplace?payment=success&tx_ref=${tx_ref}`);
    }

    res.json({ success: true, tx_ref, order: rows[0] || null });
  } catch (err) {
    logger.error({ err }, 'Chapa verify error');
    return apiError.serverError(res, 'Failed to verify Chapa payment');
  }
});

module.exports = router;
module.exports.handleStripeEvent = handleStripeEvent;
