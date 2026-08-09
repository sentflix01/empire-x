/**
 * stripe.test.js — Unit tests for the Stripe Checkout integration
 *
 * Covers the hardened webhook handler + checkout endpoint in routes/orders.js:
 *   1. checkout.session.completed        → order marked paid + commission collected
 *      + coupon usage_count incremented; dedupe row written ONLY after success
 *   2. duplicate event (same event id)   → skipped via webhook_events check
 *   3. processing failure                → 500 (Stripe retries), NO dedupe row
 *   4. payment_intent.payment_failed     → order marked payment_failed
 *   5. checkout.session.expired          → order marked payment_failed
 *   6. charge.refunded (full)            → order refunded, commission reversed,
 *      NO buyer wallet credit (Stripe already refunded the payment method)
 *   7. charge.refunded (partial)         → proportional commission reversal only
 *   8. charge.refunded (wallet top-up)   → proportional credit reversal
 *   9. wallet top-up completion          → payment_status guard + transactional credit
 *  10. multi-seller cart                 → ONE combined Checkout Session, one URL
 *
 * stripe.webhooks.constructEvent and checkout.sessions.create are mocked, so
 * no real Stripe keys are needed. The DB pool is mocked via test/helpers/mockPool.
 *
 * Run: npx jest test/stripe.test.js   (from backend/)
 */

// Must be set BEFORE routes/orders is required so the Stripe client initialises
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_secret';
process.env.JWT_SECRET = 'test_jwt_secret';
delete process.env.REDIS_URL; // keep feature flags on the in-memory defaults

// ── Stripe SDK mock ──────────────────────────────────────────────────────────
const mockConstructEvent = jest.fn();
const mockSessionsCreate = jest.fn();
jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: (...args) => mockConstructEvent(...args) },
    checkout: { sessions: { create: (...args) => mockSessionsCreate(...args) } },
  }))
);

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool'); // mocked via setupTests → helpers/mockPool
const ordersRouter = require('../routes/orders');

const app = express();
// Mirror index.js: Stripe signature verification needs the raw body
app.use('/api/orders/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use('/api/orders', ordersRouter);

// Let fire-and-forget side effects finish before asserting
const flushAsync = async () => {
  for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
};

/** Route every SQL statement to a canned result based on its content. */
function routeQueries(byPattern) {
  pool.query.mockImplementation(async (sql) => {
    for (const [pattern, result] of byPattern) {
      if (sql.includes(pattern)) {
        return typeof result === 'function' ? result(sql) : result;
      }
    }
    return { rows: [] };
  });
}

const postWebhook = (event) =>
  request(app)
    .post('/api/orders/webhook')
    .set('stripe-signature', 't=1,v1=fakesig')
    .send(JSON.stringify(event));

const ORDER = {
  id: 'order-1',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  product_title: 'Test Product',
  total_price: '1000.00',
  currency: 'ETB',
};

const sessionEvent = (id = 'evt_completed_1') => ({
  id,
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      payment_status: 'paid',
      payment_intent: 'pi_test_123',
      metadata: { purpose: 'order', order_ids: 'order-1', coupon_id: 'coupon-9' },
    },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.FF_STRIPE_PAYMENTS;
});

describe('Stripe webhook — checkout.session.completed', () => {
  test('marks the order paid, collects commission, increments coupon usage', async () => {
    mockConstructEvent.mockReturnValue(sessionEvent());
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }], // not seen yet
      ["status = 'paid'", { rows: [ORDER] }],          // orders UPDATE ... RETURNING *
      ['INSERT INTO commissions', { rows: [] }],       // collectCommission
      ['SELECT id, balance FROM wallets', { rows: [] }],
      ['INSERT INTO webhook_events', { rows: [] }],    // dedupe written AFTER success
    ]);

    const res = await postWebhook(sessionEvent());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    await flushAsync();

    // Dedupe ledger insert happened — and only AFTER processing succeeded
    const calls = pool.query.mock.calls;
    const paidIdx = calls.findIndex(c => c[0].includes("status = 'paid'"));
    const dedupeIdx = calls.findIndex(c => c[0].includes('INSERT INTO webhook_events'));
    expect(paidIdx).toBeGreaterThan(-1);
    expect(dedupeIdx).toBeGreaterThan(paidIdx);
    expect(calls[dedupeIdx][1]).toEqual(['evt_completed_1', 'checkout.session.completed']);

    // Order moved to paid with the payment intent recorded
    const paidCall = calls[paidIdx];
    expect(paidCall[1]).toEqual(['pi_test_123', 'cs_test_123']);

    // Coupon usage_count incremented atomically
    const couponCall = calls.find(c => c[0].includes('UPDATE coupons SET usage_count'));
    expect(couponCall).toBeTruthy();
    expect(couponCall[1]).toEqual(['coupon-9']);

    // Commission was collected for the order
    const commissionCall = calls.find(c => c[0].includes('INSERT INTO commissions'));
    expect(commissionCall).toBeTruthy();
    expect(commissionCall[1][0]).toBe('order-1');
    expect(commissionCall[1][1]).toBe('seller-1');
  });

  test('duplicate event ids are skipped (no processing, no new dedupe row)', async () => {
    mockConstructEvent.mockReturnValue(sessionEvent('evt_completed_dup'));
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [{ id: 'evt_completed_dup' }] }], // already processed
    ]);

    const res = await postWebhook(sessionEvent('evt_completed_dup'));
    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);

    const orderUpdates = pool.query.mock.calls.filter(c => /UPDATE orders SET status/i.test(c[0]));
    expect(orderUpdates).toHaveLength(0);
    const commissions = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO commissions'));
    expect(commissions).toHaveLength(0);
    const inserts = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO webhook_events'));
    expect(inserts).toHaveLength(0);
  });

  test('processing failure returns 500 and writes NO dedupe row (Stripe retries)', async () => {
    const event = sessionEvent('evt_flaky');
    mockConstructEvent.mockReturnValue(event);

    // First attempt: the DB blows up mid-processing
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ["status = 'paid'", () => { throw new Error('connection lost'); }],
    ]);
    const fail = await postWebhook(event);
    expect(fail.status).toBe(500);
    expect(pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO webhook_events')))
      .toHaveLength(0); // nothing recorded → Stripe will redeliver

    // Retry: processing succeeds this time and the event is recorded
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ["status = 'paid'", { rows: [ORDER] }],
      ['INSERT INTO commissions', { rows: [] }],
      ['SELECT id, balance FROM wallets', { rows: [] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);
    const retry = await postWebhook(event);
    expect(retry.status).toBe(200);
    await flushAsync();
    expect(pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO webhook_events')))
      .toHaveLength(1);
  });
});

describe('Stripe webhook — payment failures', () => {
  test('payment_intent.payment_failed marks pending orders payment_failed', async () => {
    const event = {
      id: 'evt_failed_1',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test_fail' } },
    };
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const failedCall = pool.query.mock.calls.find(c => c[0].includes("status = 'payment_failed'"));
    expect(failedCall).toBeTruthy();
    expect(failedCall[1]).toEqual(['pi_test_fail']);
  });

  test('checkout.session.expired marks pending orders payment_failed by session id', async () => {
    const event = {
      id: 'evt_expired_1',
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_test_expired', metadata: { purpose: 'order' } } },
    };
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const failedCall = pool.query.mock.calls.find(c => c[0].includes("status = 'payment_failed'"));
    expect(failedCall).toBeTruthy();
    expect(failedCall[1]).toEqual(['cs_test_expired']);
  });
});

describe('Stripe webhook — charge.refunded', () => {
  const refundEvent = (charge) => ({
    id: 'evt_refund_1',
    type: 'charge.refunded',
    data: { object: charge },
  });

  test('full refund: order refunded + commission reversed, NO buyer wallet credit', async () => {
    const event = refundEvent({
      id: 'ch_test_1',
      payment_intent: 'pi_test_refund',
      amount: 100000,
      amount_refunded: 100000,
    });
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ['SELECT * FROM orders', { rows: [ORDER] }],
      ['SELECT id, amount FROM commissions', { rows: [{ id: 'comm-1', amount: '30.00' }] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);
    await flushAsync();

    // Order marked refunded
    const refundCall = pool.query.mock.calls.find(c => c[0].includes("status = 'refunded'"));
    expect(refundCall).toBeTruthy();
    expect(refundCall[1]).toEqual(['order-1']);

    // Commission reversed
    const commCall = pool.query.mock.calls.find(c => c[0].includes("UPDATE commissions SET status = 'refunded'"));
    expect(commCall).toBeTruthy();
    expect(commCall[1]).toEqual(['comm-1']);

    // Seller gets the commission back — NOT the buyer (Stripe already refunded the card)
    const walletCredits = pool.query.mock.calls.filter(c => c[0].includes('balance = balance +'));
    expect(walletCredits).toHaveLength(1);
    expect(walletCredits[0][1]).toEqual([30, 'seller-1']);

    const ledger = pool.query.mock.calls.find(c => c[0].includes("INSERT INTO wallet_transactions"));
    expect(ledger[1]).toContain('Commission reversal (full Stripe refund)');

    // No buyer refund bookkeeping anywhere
    expect(pool.query.mock.calls.find(c => Array.isArray(c[1]) && c[1].includes('buyer-1') && c[0].includes('UPDATE wallets'))).toBeUndefined();
  });

  test('partial refund: proportional commission reversal, order stays paid', async () => {
    const event = refundEvent({
      id: 'ch_test_2',
      payment_intent: 'pi_test_partial',
      amount: 100000,
      amount_refunded: 25000, // 25%
    });
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ['SELECT * FROM orders', { rows: [ORDER] }],
      ['SELECT id, amount FROM commissions', { rows: [{ id: 'comm-1', amount: '30.00' }] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);
    await flushAsync();

    // Order is NOT marked refunded for a partial refund
    const refundCall = pool.query.mock.calls.find(c => c[0].includes("status = 'refunded'"));
    expect(refundCall).toBeUndefined();

    // Commission reduced by 25% (7.50 of 30.00)
    const commCall = pool.query.mock.calls.find(c => c[0].includes('GREATEST(amount - $1, 0)'));
    expect(commCall).toBeTruthy();
    expect(commCall[1]).toEqual([7.5, 'comm-1']);

    // Seller credited the reversed slice only
    const walletCredits = pool.query.mock.calls.filter(c => c[0].includes('balance = balance +'));
    expect(walletCredits).toHaveLength(1);
    expect(walletCredits[0][1]).toEqual([7.5, 'seller-1']);
  });

  test('wallet top-up refund: proportional credit reversal (no double refund)', async () => {
    const event = refundEvent({
      id: 'ch_topup',
      payment_intent: 'pi_topup',
      amount: 400,
      amount_refunded: 200, // 50%
      metadata: { purpose: 'wallet_topup', wallet_id: 'w-1', amount_etb: '500' },
    });
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const debit = pool.query.mock.calls.find(c => c[0].includes('GREATEST(balance - $1, 0)'));
    expect(debit).toBeTruthy();
    expect(debit[1]).toEqual([250, 'w-1']); // 500 ETB × 50%

    const ledger = pool.query.mock.calls.find(c => c[0].includes("INSERT INTO wallet_transactions"));
    expect(ledger[1]).toContain('Stripe top-up refund reversal (partial)');

    // No order-side refund handling for a top-up charge
    expect(pool.query.mock.calls.find(c => c[0].includes('SELECT * FROM orders'))).toBeUndefined();
  });
});

describe('Stripe webhook — wallet top-up completion', () => {
  test('does NOT credit a top-up unless payment_status is paid', async () => {
    const event = {
      id: 'evt_topup_unpaid',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_topup',
          payment_status: 'unpaid',
          metadata: { purpose: 'wallet_topup', wallet_id: 'w-1', amount_etb: '500' },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    expect(pool.connect).not.toHaveBeenCalled(); // never touched the top-up flow
    const walletUpdates = pool.query.mock.calls.filter(c => c[0].includes('UPDATE wallets'));
    expect(walletUpdates).toHaveLength(0);
  });

  test('credits a paid top-up transactionally via the pending_topup claim', async () => {
    const clientQuery = jest.fn().mockImplementation(async (sql) => {
      if (sql.includes('pending_topup')) {
        return { rows: [{ id: 'tx-1', wallet_id: 'w-1', amount: '500.00' }] };
      }
      return { rows: [] };
    });
    const client = { query: clientQuery, release: jest.fn() };
    pool.connect.mockResolvedValue(client);

    const event = {
      id: 'evt_topup_paid',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_topup',
          payment_status: 'paid',
          payment_intent: 'pi_topup_paid',
          metadata: { purpose: 'wallet_topup', wallet_id: 'w-1', amount_etb: '500' },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['SELECT id FROM webhook_events', { rows: [] }],
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const sqls = clientQuery.mock.calls.map(c => c[0]);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[sqls.length - 1]).toBe('COMMIT');

    const creditCall = clientQuery.mock.calls.find(c => c[0].includes('balance = balance +'));
    expect(creditCall[1]).toEqual([500, 'w-1']);
    expect(client.release).toHaveBeenCalled();
  });
});

describe('Stripe checkout — multi-seller cart creates ONE session', () => {
  const auth = () => `Bearer ${jwt.sign({ sub: 'buyer-1' }, 'test_jwt_secret')}`;
  const PRODUCTS = [
    { id: 'prod-1', seller_id: 'seller-1', title: 'Shirt', price: '123.45', status: 'active', stock: null, business_id: 'biz-1' },
    { id: 'prod-2', seller_id: 'seller-2', title: 'Shoes', price: '67.89', status: 'active', stock: null, business_id: null },
  ];

  test('2-seller cart → one session, one URL, both orders linked', async () => {
    const orderIds = ['order-A', 'order-B'];
    let insertIdx = 0;
    routeQueries([
      ['SELECT id, email, role FROM users', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user' }] }],
      ['SELECT * FROM products', { rows: PRODUCTS }],
      ['INSERT INTO orders', () => ({ rows: [{ id: orderIds[insertIdx++] }] })],
      ['UPDATE orders SET stripe_session_id', { rows: [] }],
    ]);
    mockSessionsCreate.mockResolvedValue({
      id: 'cs_test_multi',
      url: 'https://checkout.stripe.com/c/pay/cs_test_multi',
    });

    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', auth())
      .send({ items: [{ product_id: 'prod-1', quantity: 1 }, { product_id: 'prod-2', quantity: 2 }] });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.com/c/pay/cs_test_multi');
    expect(res.body.session_id).toBe('cs_test_multi');
    expect(res.body.order_ids).toEqual(['order-A', 'order-B']);

    // Exactly ONE Stripe session across all sellers
    expect(mockSessionsCreate).toHaveBeenCalledTimes(1);
    const params = mockSessionsCreate.mock.calls[0][0];
    expect(params.line_items).toHaveLength(2); // both sellers in the same session
    expect(params.metadata.purpose).toBe('order');
    expect(params.metadata.order_ids).toBe('order-A,order-B');
    expect(params.metadata.seller_ids).toBe('seller-1,seller-2');
    expect(params.payment_method_types).toBeUndefined(); // automatic methods

    // Integer-cent math: 1×123.45 + 2×67.89 = 259.23 ETB → $2.07
    const sumCents = params.line_items.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0);
    expect(sumCents).toBe(Math.round((123.45 + 2 * 67.89) * 0.008 * 100));
    expect(res.body.display.charge_total).toBe(sumCents / 100);

    // Both orders linked to the SAME session id
    const linkCall = pool.query.mock.calls.find(c => c[0].includes('UPDATE orders SET stripe_session_id'));
    expect(linkCall[1]).toEqual(['cs_test_multi', ['order-A', 'order-B']]);
  });

  test('rounding drift is absorbed by an adjustment line (no off-by-cent)', async () => {
    // 3 × 3.33 ETB each → 3¢ each (9¢) but the converted grand total is 8¢
    const driftProducts = [
      { id: 'prod-a', seller_id: 'seller-1', title: 'A', price: '3.33', status: 'active', stock: null, business_id: null },
      { id: 'prod-b', seller_id: 'seller-2', title: 'B', price: '3.33', status: 'active', stock: null, business_id: null },
      { id: 'prod-c', seller_id: 'seller-2', title: 'C', price: '3.33', status: 'active', stock: null, business_id: null },
    ];
    const orderIds = ['order-X', 'order-Y'];
    let insertIdx = 0;
    routeQueries([
      ['SELECT id, email, role FROM users', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user' }] }],
      ['SELECT * FROM products', { rows: driftProducts }],
      ['INSERT INTO orders', () => ({ rows: [{ id: orderIds[insertIdx++] }] })],
      ['UPDATE orders SET stripe_session_id', { rows: [] }],
    ]);
    mockSessionsCreate.mockResolvedValue({ id: 'cs_test_drift', url: 'https://checkout.stripe.com/c/pay/cs_test_drift' });

    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', auth())
      .send({ items: driftProducts.map(p => ({ product_id: p.id, quantity: 1 })) });

    expect(res.status).toBe(200);
    const params = mockSessionsCreate.mock.calls[0][0];
    const adjustment = params.line_items.find(li => li.price_data.product_data.name === 'Rounding adjustment');
    expect(adjustment).toBeTruthy();
    const sumCents = params.line_items.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0);
    expect(sumCents).toBe(Math.round(9.99 * 0.008 * 100)); // exact grand-total cents
  });

  test('session creation failure marks session-less orders payment_failed (no deletes)', async () => {
    routeQueries([
      ['SELECT id, email, role FROM users', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user' }] }],
      ['SELECT * FROM products', { rows: PRODUCTS }],
      ['INSERT INTO orders', { rows: [{ id: 'order-Z' }] }],
    ]);
    mockSessionsCreate.mockRejectedValue(new Error('stripe is down'));

    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', auth())
      .send({ items: [{ product_id: 'prod-1', quantity: 1 }] });

    expect(res.status).toBe(500);
    await flushAsync();

    // Rollback flags orders instead of deleting them, and only session-less ones
    const rollback = pool.query.mock.calls.find(c => c[0].includes("SET status = 'payment_failed'") && c[0].includes('stripe_session_id IS NULL'));
    expect(rollback).toBeTruthy();
    expect(rollback[1]).toEqual([['order-Z']]);
    const deletes = pool.query.mock.calls.filter(c => /^DELETE FROM orders/i.test(c[0].trim()));
    expect(deletes).toHaveLength(0);
  });
});

describe('Stripe webhook — signature verification', () => {
  test('rejects requests whose signature fails verification', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Signature mismatch');
    });

    const res = await postWebhook(sessionEvent('evt_bad_sig'));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Webhook error/);
    await flushAsync();
    // Nothing was processed
    const ledger = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO webhook_events'));
    expect(ledger).toHaveLength(0);
  });
});
