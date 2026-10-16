'use strict';
/**
 * Integration tests for backend/routes/orders.ts
 * Feature: professional-grade-upgrade
 * Requirements: 4.1, 4.3, 4.5, 4.7
 */

const request = require('supertest');
const express = require('express');

const mockPool = require('../helpers/mockPool');

// Mock the auth middleware so requireAuth/requireAdmin don't check real tokens
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => { if (!req.user) req.user = { id: 'user-1', role: 'user' }; next(); },
  requireAdmin: (req, res, next) => { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' }); next(); },
  optionalAuth: (_req, _res, next) => next(),
}));

// Mock all dependencies
jest.mock('../../utils/crud', () => ({
  listRecords: jest.fn().mockResolvedValue([]),
  getRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
}));
jest.mock('../../routes/commission', () => ({ collectCommission: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../routes/telegram', () => ({ notifyUser: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../socket', () => ({ emitNotification: jest.fn() }));
jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../utils/mailer', () => ({ sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../lib/featureFlags', () => ({ isEnabled: jest.fn().mockResolvedValue(true) }));

const { getRecord, createRecord, updateRecord } = require('../../utils/crud');
const ordersRouter = require('../../routes/orders');

beforeEach(() => {
  jest.clearAllMocks();
  mockPool.connect.mockImplementation(async () => ({
    query: jest.fn(async (sql) => sql.includes('UPDATE products') ? { rows: [{ id: 'product-1' }] } : { rows: [] }),
    release: jest.fn(),
  }));
});

// Inject a mock user as if requireAuth passed
function buildApp(role = 'user') {
  const app = express();
  app.use(express.json());
  // Inject req.user so requireAuth is bypassed
  app.use((req, _res, next) => { req.user = { id: 'user-1', email: 'u@b.com', role }; next(); });
  app.use('/api/orders', ordersRouter);
  return app;
}

describe('GET /api/orders/', () => {
  it('returns orders with keyset cursor pagination', async () => {
    const order = { id: 'order-1', buyer_id: 'user-1' };
    mockPool.query.mockResolvedValueOnce({ rows: [order] });
    const res = await request(buildApp()).get('/api/orders/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(res.body.orders).toEqual([{ ...order, has_receipt: false }]);
    // Empty page → no next cursor
    expect(res.body.next_cursor).toBeNull();
  });

  it('returns 500 INTERNAL_ERROR on db failure', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('db error'));
    const res = await request(buildApp()).get('/api/orders/');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('code', 'INTERNAL_ERROR');
  });
});

describe('POST /api/orders/ (cash on delivery)', () => {
  it('returns 422 VALIDATION_ERROR when required fields are missing', async () => {
    const res = await request(buildApp()).post('/api/orders/').send({ product_title: 'Test' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 422 when product_id or quantity is invalid', async () => {
    const res = await request(buildApp()).post('/api/orders/')
      .send({ product_id: 'product-1', quantity: -5, total_price: 100 });
    expect(res.status).toBe(422);
  });

  it('returns 201 and derives seller and price from the product record', async () => {
    createRecord.mockResolvedValueOnce({ id: 'order-new', buyer_id: 'user-1', product_title: 'Test Product', total_price: 24 });
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'product-1', seller_id: 'seller-1', business_id: 'business-1', title: 'Test Product', price: '12', stock: 5, status: 'active' }] })
      .mockResolvedValueOnce({ rows: [{ email: 'u@b.com' }] }); // buyer email lookup
    const res = await request(buildApp()).post('/api/orders/').send({
      product_id: 'product-1',
      quantity: 2,
      seller_id: 'attacker-seller',
      product_title: 'Fake Product',
      unit_price: 0.01,
      total_price: 0.02,
      // Attempted mass assignment — must never reach createRecord:
      status: 'paid',
      payment_provider: 'stripe',
      stripe_session_id: 'cs_attacker',
      currency: 'USD',
      buyer_id: 'someone-else',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');

    const data = createRecord.mock.calls[0][1];
    expect(data.buyer_id).toBe('user-1');           // forced server-side
    expect(data.status).toBe('pending');            // forced server-side
    expect(data.payment_provider).toBe('cod');      // forced server-side
    expect(data.currency).toBe('ETB');              // forced server-side
    expect(data.seller_id).toBe('seller-1');          // product owner from DB
    expect(data.product_title).toBe('Test Product');  // product data from DB
    expect(data.unit_price).toBe(12);
    expect(data.quantity).toBe(2);
    expect(data.stripe_session_id).toBeUndefined(); // stripped
    expect(data.total_price).toBe(24);               // server-calculated total
  });
});

describe('PUT /api/orders/:id', () => {
  it('returns 404 NOT_FOUND when order does not exist', async () => {
    getRecord.mockResolvedValueOnce(null);
    const res = await request(buildApp()).put('/api/orders/nonexistent').send({ status: 'cancelled' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
  });

  it('buyer can cancel their own order', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'user-1', seller_id: 'seller-1', status: 'pending', payment_provider: 'cod', product_title: 'T', total_price: 100, currency: 'ETB' });
    const queries = [];
    mockPool.connect.mockResolvedValueOnce({
      query: jest.fn(async (sql) => {
        queries.push(sql);
        if (sql.startsWith('SELECT id FROM orders')) return { rows: [{ id: 'order-1' }] };
        if (sql.startsWith('UPDATE orders')) return { rows: [{ id: 'order-1', status: 'cancelled' }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    const res = await request(buildApp()).put('/api/orders/order-1').send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(queries).toContain('COMMIT');
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it('buyer cannot set seller-only fulfilment statuses', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'user-1', seller_id: 'seller-9', status: 'pending' });
    const res = await request(buildApp()).put('/api/orders/order-1').send({ status: 'shipped' });
    expect(res.status).toBe(403);
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it('buyer cannot complete an order before seller delivery', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'user-1', seller_id: 'seller-9', status: 'pending' });
    const res = await request(buildApp()).put('/api/orders/order-1').send({ status: 'completed' });
    expect(res.status).toBe(403);
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it('allows an idempotent completed update so an interrupted commission write can be retried', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'user-1', seller_id: 'seller-9', status: 'completed' });
    updateRecord.mockResolvedValueOnce({ id: 'order-1', status: 'completed' });
    const res = await request(buildApp()).put('/api/orders/order-1').send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(updateRecord).toHaveBeenCalledWith('orders', 'order-1', { status: 'completed' });
  });

  it('strips money and identity columns from party updates', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'user-1', seller_id: 'seller-9', status: 'delivered' });
    updateRecord.mockResolvedValueOnce({ id: 'order-1', status: 'completed' });
    // "completed" transition fires buyer/seller notification inserts
    mockPool.query.mockResolvedValue({ rows: [{ id: 'notif-1' }] });
    const res = await request(buildApp()).put('/api/orders/order-1').send({
      status: 'completed',
      total_price: 0,
      buyer_id: 'someone-else',
      stripe_session_id: 'cs_hax',
      notes: 'leave at door',
    });
    expect(res.status).toBe(200);
    const data = updateRecord.mock.calls[0][2];
    expect(data.total_price).toBeUndefined();
    expect(data.buyer_id).toBeUndefined();
    expect(data.stripe_session_id).toBeUndefined();
    expect(data.notes).toBe('leave at door');   // safe field still updatable
  });

  it('non-party non-admin gets 403', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'other-buyer', seller_id: 'other-seller', status: 'pending' });
    const res = await request(buildApp()).put('/api/orders/order-1').send({ status: 'cancelled' });
    expect(res.status).toBe(403);
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it('admin may update operational fields but not ownership', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'other-buyer', seller_id: 'other-seller', status: 'pending' });
    updateRecord.mockResolvedValueOnce({ id: 'order-1', status: 'refunded' });
    const res = await request(buildApp('admin')).put('/api/orders/order-1').send({
      status: 'refunded',
      buyer_id: 'hacker',
    });
    expect(res.status).toBe(200);
    const data = updateRecord.mock.calls[0][2];
    expect(data.status).toBe('refunded');
    expect(data.buyer_id).toBeUndefined();
  });
});

describe('order responses never expose private direct-payment fields', () => {
  it('strips the order-link token hash and receipt key from the list', async () => {
    const order = { id: 'order-9', buyer_id: 'user-1', access_token_hash: 'abc', receipt_key: 'receipts/order-9/r.png' };
    mockPool.query.mockResolvedValueOnce({ rows: [order] });
    const res = await request(buildApp()).get('/api/orders/');
    expect(res.body.orders[0]).toEqual({ id: 'order-9', buyer_id: 'user-1', has_receipt: true });
  });
});
