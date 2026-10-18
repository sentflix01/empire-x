'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

let user = null;
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => { if (!user) { res.status(401).json({ error: 'auth' }); return; } req.user = user; next(); },
  optionalAuth: (req, _res, next) => { if (user) req.user = user; next(); },
}));
jest.mock('../../socket', () => ({ emitNotification: jest.fn() }));
jest.mock('../../utils/mailer', () => ({ sendCustomEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../lib/businessSubscriptionPolicy', () => ({ getBusinessSubscriptionAccess: jest.fn().mockResolvedValue({ hiddenFromPublic: false }) }));
jest.mock('../../services/orderInventory', () => ({
  reserveOrderInventory: jest.fn().mockResolvedValue(undefined),
  releaseOrderInventory: jest.fn().mockResolvedValue(undefined),
  InventoryUnavailableError: class InventoryUnavailableError extends Error {},
}));

const inventory = require('../../services/orderInventory');
const directOrders = require('../../routes/directOrders');
const { hashToken } = directOrders;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/direct-orders', directOrders);
  return app;
}

const PRODUCT = { id: 'p1', seller_id: 'seller-1', business_id: 'biz-1', title: 'Coffee', price: '500', stock: 5, status: 'active', currency: 'ETB' };
const BUYER = { product_id: 'p1', quantity: 2, buyer_name: 'Guest', buyer_phone: '+251922222222', buyer_email: 'Guest@Example.test' };

function mockCreate({ accounts = [{ id: 'a1' }] } = {}) {
  const client = { query: jest.fn(), release: jest.fn() };
  client.query.mockImplementation(async (sql) => (/INSERT INTO orders/.test(sql) ? { rows: [{ id: 'o1', status: 'awaiting_payment', buyer_email: 'guest@example.test', seller_id: 'seller-1', buyer_id: null, currency: 'ETB' }] } : { rows: [] }));
  pool.connect.mockResolvedValueOnce(client);
  pool.query.mockImplementation(async (sql) => {
    if (/FROM products p/.test(sql)) return { rows: [PRODUCT] };
    if (/FROM businesses WHERE id/.test(sql)) return { rows: [{ id: 'biz-1', business_name: 'Shop', public_contact_fields: [], pickup_address: 'Back gate' }] };
    if (/FROM business_payment_accounts/.test(sql)) return { rows: accounts };
    return { rows: [] };
  });
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
  user = null;
});

describe('creating a direct-payment order', () => {
  it('lets a guest order and stores only the hash of the private link token', async () => {
    const client = mockCreate();
    const res = await request(buildApp()).post('/api/direct-orders').send(BUYER);
    expect(res.status).toBe(201);
    expect(res.body.access_token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(res.body.order_url).toMatch(new RegExp(`/order/${res.body.access_token}$`));
    const insert = client.query.mock.calls.find(([sql]) => /INSERT INTO orders/.test(sql));
    const params = insert[1];
    expect(params).toContain(hashToken(res.body.access_token));
    expect(params).not.toContain(res.body.access_token);
    expect(params[11]).toBe('guest@example.test');
    expect(params[8]).toBeNull(); // no account
    expect(inventory.reserveOrderInventory).toHaveBeenCalledWith(client, 'o1', [{ productId: 'p1', quantity: 2 }]);
    expect(res.body.business.pickup_address).toBe('Back gate');
  });

  it('requires valid contact details', async () => {
    const res = await request(buildApp()).post('/api/direct-orders').send({ ...BUYER, buyer_email: 'nope' });
    expect(res.status).toBe(422);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('refuses when the seller has no payment accounts', async () => {
    mockCreate({ accounts: [] });
    const res = await request(buildApp()).post('/api/direct-orders').send(BUYER);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NO_PAYMENT_ACCOUNTS');
  });

  it('stops sellers buying their own product', async () => {
    user = { id: 'seller-1', role: 'user' };
    mockCreate();
    expect((await request(buildApp()).post('/api/direct-orders').send(BUYER)).status).toBe(422);
  });
});

describe('payment reporting and confirmation', () => {
  it('a reported payment cannot be reported again once paid', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', status: 'paid' }] });
    const res = await request(buildApp()).post('/api/direct-orders/link/' + 'a'.repeat(43) + '/report-payment').send({ payment_reference: 'X' });
    expect(res.status).toBe(409);
  });

  it('only the seller (or admin) can confirm', async () => {
    user = { id: 'buyer-1', role: 'user' };
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'seller-1', buyer_id: 'buyer-1', status: 'payment_reported' }] });
    expect((await request(buildApp()).post('/api/direct-orders/o1/confirm-payment')).status).toBe(404);
  });

  it('the seller confirms an open order', async () => {
    user = { id: 'seller-1', role: 'user' };
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'seller-1', buyer_id: null, status: 'payment_reported' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'o1', status: 'paid', buyer_email: 'g@example.test', product_title: 'Coffee' }] })
      .mockResolvedValue({ rows: [] });
    const res = await request(buildApp()).post('/api/direct-orders/o1/confirm-payment');
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('paid');
    expect(res.body.order.buyer_email).toBeUndefined();
    expect(pool.query.mock.calls[1][0]).toMatch(/status IN \('awaiting_payment','payment_reported'\)/);
  });

  it('an unknown link is a 404', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect((await request(buildApp()).get('/api/direct-orders/link/' + 'b'.repeat(43))).status).toBe(404);
  });
});

describe('expiry', () => {
  it('expires open direct orders past their deadline and releases stock', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'o1', seller_id: 'seller-1', buyer_id: null, product_title: 'Coffee' }] }).mockResolvedValue({ rows: [] });
    await expect(directOrders.expireStaleDirectOrders()).resolves.toBe(1);
    expect(pool.query.mock.calls[0][0]).toMatch(/payment_provider='direct' AND status IN \('requested','awaiting_payment','payment_reported'\) AND payment_expires_at < NOW\(\)/);
    expect(inventory.releaseOrderInventory).toHaveBeenCalledWith(expect.anything(), ['o1']);
  });
});
