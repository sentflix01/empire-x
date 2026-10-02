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
const mockCouponsCreate = jest.fn();
jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: (...args) => mockConstructEvent(...args) },
    checkout: { sessions: { create: (...args) => mockSessionsCreate(...args) } },
    coupons: { create: (...args) => mockCouponsCreate(...args) },
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
let transactionQueries;
let failPaidTransition;

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
  transactionQueries = [];
  failPaidTransition = false;
  pool.connect.mockImplementation(async () => ({
    query: jest.fn(async (sql, values) => {
      transactionQueries.push([sql, values]);
      if (sql.startsWith('SELECT id FROM orders')) return { rows: [{ id: 'order-1' }] };
      if (sql.startsWith('UPDATE orders') && sql.includes("status='paid'") && failPaidTransition) throw new Error('connection lost');
      if (sql.startsWith('UPDATE orders') && sql.includes("status='paid'")) return { rows: [ORDER] };
      if (sql.includes('UPDATE products')) return { rows: [{ id: 'product-1' }] };
      return { rows: [] };
    }),
    release: jest.fn(),
  }));
});

describe('Stripe webhook — checkout.session.completed', () => {
  test('marks the order paid, collects commission, increments coupon usage', async () => {
    mockConstructEvent.mockReturnValue(sessionEvent());
    routeQueries([
      // Atomic claim insert returns the row when the event is new
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_completed_1' }] }],
      ["status='paid'", { rows: [ORDER] }],            // orders UPDATE ... RETURNING *
      ['INSERT INTO commissions', { rows: [] }],       // collectCommission
      ['SELECT id, balance FROM wallets', { rows: [] }],
    ]);

    const res = await postWebhook(sessionEvent());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    await flushAsync();

    // Claim insert happened FIRST (before any processing)
    const calls = pool.query.mock.calls;
    const txnCalls = transactionQueries;
    const claimIdx = calls.findIndex(c => c[0].includes('INSERT INTO webhook_events'));
    const paidIdx = txnCalls.findIndex(c => c[0].includes("status='paid'"));
    expect(claimIdx).toBeGreaterThan(-1);
    expect(paidIdx).toBeGreaterThan(claimIdx);
    expect(calls[claimIdx][1]).toEqual(['evt_completed_1', 'checkout.session.completed']);

    // Order moved to paid with the payment intent recorded
    const paidCall = txnCalls[paidIdx];
    expect(paidCall[1]).toEqual([['order-1'], 'pi_test_123']);

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

  test('duplicate event ids are skipped (no processing)', async () => {
    mockConstructEvent.mockReturnValue(sessionEvent('evt_completed_dup'));
    routeQueries([
      // Atomic claim loses the race → zero rows returned → duplicate
      ['INSERT INTO webhook_events', { rows: [] }],
    ]);

    const res = await postWebhook(sessionEvent('evt_completed_dup'));
    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);

    const orderUpdates = pool.query.mock.calls.filter(c => /UPDATE orders SET status/i.test(c[0]));
    expect(orderUpdates).toHaveLength(0);
    const commissions = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO commissions'));
    expect(commissions).toHaveLength(0);
  });

  test('processing failure returns 500, releases the claim (Stripe retries)', async () => {
    const event = sessionEvent('evt_flaky');
    mockConstructEvent.mockReturnValue(event);

    // First attempt: the DB blows up mid-processing
    routeQueries([['INSERT INTO webhook_events', { rows: [{ id: 'evt_flaky' }] }]]);
    failPaidTransition = true;
    const fail = await postWebhook(event);
    expect(fail.status).toBe(500);
    failPaidTransition = false;
    // The claim was released so Stripe's redelivery is not misread as a duplicate
    expect(pool.query.mock.calls.filter(c => c[0].includes('DELETE FROM webhook_events')))
      .toHaveLength(1);

    // Retry: processing succeeds this time and the event is recorded again
    routeQueries([
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_flaky' }] }],
      ["status='paid'", { rows: [ORDER] }],
      ['INSERT INTO commissions', { rows: [] }],
      ['SELECT id, balance FROM wallets', { rows: [] }],
    ]);
    const retry = await postWebhook(event);
    expect(retry.status).toBe(200);
    await flushAsync();
    // The only DELETE is the claim release from the failed first attempt
    expect(pool.query.mock.calls.filter(c => c[0].includes('DELETE FROM webhook_events')))
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
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_failed_1' }] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const failedCall = transactionQueries.find(c => c[0].includes("status='payment_failed'"));
    expect(failedCall).toBeTruthy();
    expect(failedCall[1]).toEqual([['order-1']]);
  });

  test('checkout.session.expired marks pending orders payment_failed by session id', async () => {
    const event = {
      id: 'evt_expired_1',
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_test_expired', metadata: { purpose: 'order' } } },
    };
    mockConstructEvent.mockReturnValue(event);
    routeQueries([
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_expired_1' }] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const failedCall = transactionQueries.find(c => c[0].includes("status='payment_failed'"));
    expect(failedCall).toBeTruthy();
    expect(failedCall[1]).toEqual([['order-1']]);
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
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_refund_1' }] }],
      ['SELECT * FROM orders', { rows: [ORDER] }],
      ['FROM commissions', { rows: [{ id: 'comm-1', amount: '30.00' }] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);
    await flushAsync();

    // Order marked refunded
    const refundCall = pool.query.mock.calls.find(c => c[0].includes("status='refunded'"));
    expect(refundCall).toBeTruthy();
    expect(refundCall[1]).toEqual(['order-1']);

    // Commission reversed
    const commCall = pool.query.mock.calls.find(c => c[0].includes("UPDATE commissions SET status='refunded'"));
    expect(commCall).toBeTruthy();
    expect(commCall[1]).toEqual(['comm-1']);

    // Seller gets the commission back — NOT the buyer (Stripe already refunded the card)
    const walletCredits = pool.query.mock.calls.filter(c => c[0].includes('balance=balance+$1'));
    expect(walletCredits).toHaveLength(1);
    expect(walletCredits[0][1]).toEqual([30, 'seller-1']);

    const ledger = pool.query.mock.calls.find(c => c[0].includes("INSERT INTO wallet_transactions"));
    expect(ledger[1]).toContain('Commission reversal (full)');

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
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_refund_1' }] }],
      ['SELECT * FROM orders', { rows: [ORDER] }],
      ['FROM commissions', { rows: [{ id: 'comm-1', amount: '30.00' }] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);
    await flushAsync();

    // Order is NOT marked refunded for a partial refund
    const refundCall = pool.query.mock.calls.find(c => c[0].includes("status='refunded'"));
    expect(refundCall).toBeUndefined();

    // Commission reduced by 25% (7.50 of 30.00)
    const commCall = pool.query.mock.calls.find(c => c[0].includes('GREATEST(amount-$1,0)'));
    expect(commCall).toBeTruthy();
    expect(commCall[1]).toEqual([7.5, 'comm-1']);

    // Seller credited the reversed slice only
    const walletCredits = pool.query.mock.calls.filter(c => c[0].includes('balance=balance+$1'));
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
      ['INSERT INTO webhook_events', { rows: [{ id: 'ch_topup' }] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const debit = pool.query.mock.calls.find(c => c[0].includes('GREATEST(balance-$1,0)'));
    expect(debit).toBeTruthy();
    expect(debit[1]).toEqual([250, 'w-1']); // 500 ETB × 50%

    const ledger = pool.query.mock.calls.find(c => c[0].includes("INSERT INTO wallet_transactions"));
    expect(ledger[1]).toContain('Stripe top-up reversal (partial)');

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
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_topup_unpaid' }] }],
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
      ['INSERT INTO webhook_events', { rows: [{ id: 'evt_topup_paid' }] }],
    ]);

    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const sqls = clientQuery.mock.calls.map(c => c[0]);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[sqls.length - 1]).toBe('COMMIT');

    const creditCall = clientQuery.mock.calls.find(c => c[0].includes('balance=balance+$1'));
    expect(creditCall[1]).toEqual([500, 'w-1']);
    expect(client.release).toHaveBeenCalled();
  });
});

describe('Stripe checkout — multi-seller cart creates ONE session', () => {
  // requireAuth enforces type='access' — refresh tokens must not authenticate.
  const auth = () => `Bearer ${jwt.sign({ sub: 'buyer-1', type: 'access' }, 'test_jwt_secret')}`;
  const PRODUCTS = [
    { id: 'prod-1', seller_id: 'seller-1', title: 'Shirt', price: '123.45', status: 'active', stock: null, business_id: 'biz-1' },
    { id: 'prod-2', seller_id: 'seller-2', title: 'Shoes', price: '67.89', status: 'active', stock: null, business_id: null },
  ];

  test('shared Track 1 demo account cannot create a Stripe checkout session', async () => {
    const demoUserId = 'track1-demo-buyer';
    routeQueries([
      ['FROM users WHERE id', { rows: [{ id: demoUserId, email: 'test@nodbusiness.app', role: 'user', is_banned: false, is_demo: true }] }],
    ]);
    const demoAuth = `Bearer ${jwt.sign({ sub: demoUserId, type: 'access' }, 'test_jwt_secret')}`;

    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', demoAuth)
      .send({ items: [{ product_id: 'prod-1', quantity: 1 }] });

    expect(res).toMatchObject({ status: 403, body: { code: 'SHARED_DEMO_PAYMENTS_UNAVAILABLE' } });
    expect(mockSessionsCreate).not.toHaveBeenCalled();
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
  });

  test('Stripe checkout stays disabled when the Stripe feature flag is off', async () => {
    process.env.FF_STRIPE_PAYMENTS = 'false';
    const userId = 'stripe-disabled-buyer';
    routeQueries([
      ['FROM users WHERE id', { rows: [{ id: userId, email: 'buyer@example.test', role: 'user', is_banned: false, is_demo: false }] }],
    ]);
    const userAuth = `Bearer ${jwt.sign({ sub: userId, type: 'access' }, 'test_jwt_secret')}`;

    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', userAuth)
      .send({ items: [{ product_id: 'prod-1', quantity: 1 }] });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
    expect(mockSessionsCreate).not.toHaveBeenCalled();
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
  });

  test('rejects malformed quantities before querying products or creating a session', async () => {
    routeQueries([
      ['FROM users WHERE id', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user', is_banned: false }] }],
    ]);
    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', auth())
      .send({ items: [{ product_id: 'prod-1', quantity: 1.5 }] });

    expect(res.status).toBe(422);
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('SELECT * FROM products'))).toBe(false);
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  test('combines duplicate cart lines before checking available stock', async () => {
    routeQueries([
      ['FROM users WHERE id', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user', is_banned: false }] }],
      ['SELECT * FROM products', { rows: [{
        id: 'prod-1', seller_id: 'seller-1', title: 'Limited stock item', price: '10', status: 'active', stock: 5,
      }] }],
    ]);
    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', auth())
      .send({ items: [{ product_id: 'prod-1', quantity: 3 }, { product_id: 'prod-1', quantity: 3 }] });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Only 5/);
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  test('2-seller cart → one session, one URL, both orders linked', async () => {
    const orderIds = ['order-A', 'order-B'];
    let insertIdx = 0;
    routeQueries([
      // requireAuth → getCachedUser SELECT
      ['FROM users WHERE id', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user', is_banned: false }] }],
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
    expect(params.line_items).toHaveLength(1); // one exact-total cart line for the combined session
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
      ['FROM users WHERE id', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user', is_banned: false }] }],
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
    expect(params.line_items).toHaveLength(1);
    expect(params.line_items[0].price_data.unit_amount).toBe(Math.round(9.99 * 0.008 * 100));
    expect(params.line_items[0].price_data.unit_amount).toBeGreaterThan(0);
  });

  test('internal coupon becomes a positive Stripe discount, never a negative price line', async () => {
    routeQueries([
      ['FROM users WHERE id', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user', is_banned: false }] }],
      ['SELECT * FROM products', { rows: PRODUCTS }],
      ['SELECT * FROM coupons', { rows: [{
        id: 'coupon-db-1', seller_id: 'seller-1', code: 'TENOFF', discount_type: 'fixed',
        discount_value: '10', min_order: '0',
      }] }],
      ['INSERT INTO orders', { rows: [{ id: 'order-coupon' }] }],
      ['UPDATE orders SET stripe_session_id', { rows: [] }],
    ]);
    mockCouponsCreate.mockResolvedValue({ id: 'coupon-stripe-1' });
    mockSessionsCreate.mockResolvedValue({ id: 'cs_coupon', url: 'https://checkout.stripe.com/c/pay/cs_coupon' });

    const res = await request(app)
      .post('/api/orders/checkout/session')
      .set('Authorization', auth())
      .send({ product_id: 'prod-1', quantity: 1, coupon_code: 'TENOFF' });

    expect(res.status).toBe(200);
    expect(mockCouponsCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount_off: 8, currency: 'usd', duration: 'once',
    }));
    const params = mockSessionsCreate.mock.calls[0][0];
    expect(params.line_items).toHaveLength(1);
    expect(params.line_items[0].price_data.unit_amount).toBeGreaterThan(0);
    expect(params.discounts).toEqual([{ coupon: 'coupon-stripe-1' }]);
    expect(params.line_items.some(li => li.price_data.unit_amount < 0)).toBe(false);
    expect(res.body.display.charge_total).toBe(Math.round((123.45 - 10) * 0.008 * 100) / 100);
  });

  test('session creation failure marks session-less orders payment_failed (no deletes)', async () => {
    routeQueries([
      ['FROM users WHERE id', { rows: [{ id: 'buyer-1', email: 'b@x.com', role: 'user', is_banned: false }] }],
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
    const rollback = pool.query.mock.calls.find(c => c[0].includes("SET status='payment_failed'") && c[0].includes('stripe_session_id IS NULL'));
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
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid Stripe webhook signature/);
    await flushAsync();
    // Nothing was processed
    const ledger = pool.query.mock.calls.filter(c => c[0].includes('INSERT INTO webhook_events'));
    expect(ledger).toHaveLength(0);
  });
});
