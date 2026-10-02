'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: () => (_req, _res, next) => next(),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../middleware/tierLimit', () => ({
  checkTierLimit: () => (req, _res, next) => { req.businessId = 'business-1'; next(); },
}));
jest.mock('../../utils/crud', () => ({
  getRecord: jest.fn(),
  createRecord: jest.fn(),
  updateRecord: jest.fn(),
  deleteRecord: jest.fn(),
}));
jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../socket', () => ({ emitNotification: jest.fn() }));

const { getRecord, createRecord } = require('../../utils/crud');
const router = require('../../routes/products');

function buildApp(user = null) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (user) req.user = user; next(); });
  app.use('/api/products', router);
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('product visibility and field authorization', () => {
  it('returns only the authenticated seller inventory from the private inventory route', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'own-product', seller_id: 'seller-1', status: 'draft' }] });

    const response = await request(buildApp({ id: 'seller-1', role: 'user' })).get('/api/products/mine');

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain('WHERE seller_id=$1');
    expect(pool.query.mock.calls[0][1]).toEqual(['seller-1']);
    expect(response.body.products[0].status).toBe('draft');
  });

  it('limits public product feeds to active and sold-out listings and strips internal inventory fields', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{
      id: 'product-1', seller_id: 'seller-2', status: 'active', title: 'Public item', price: '10',
      cost_price: '4', supplier_id: 'supplier-1', batch_number: 'B-1', variant_of: 'product-0',
    }] });

    const response = await request(buildApp()).get('/api/products');

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain("p.status IN ('active','sold_out')");
    expect(response.body.products[0]).toMatchObject({ id: 'product-1', title: 'Public item' });
    expect(response.body.products[0]).not.toHaveProperty('cost_price');
    expect(response.body.products[0]).not.toHaveProperty('supplier_id');
    expect(response.body.products[0]).not.toHaveProperty('batch_number');
    expect(response.body.products[0]).not.toHaveProperty('variant_of');
  });

  it('returns a stable keyset cursor and applies it on the next page', async () => {
    const createdAt = '2026-09-27T10:20:30.000Z';
    const id = 'f8b4a3d2-0b1a-4c3d-8e9f-123456789abc';
    pool.query.mockResolvedValueOnce({ rows: [{ id, created_at: createdAt, status: 'active', seller_id: 'seller-2' }] });
    const firstPage = await request(buildApp()).get('/api/products?limit=1');
    expect(firstPage.body.next_cursor).toBe(`-created_at|${createdAt}|${id}`);

    pool.query.mockResolvedValueOnce({ rows: [] });
    const secondPage = await request(buildApp()).get(`/api/products?limit=1&cursor=${encodeURIComponent(firstPage.body.next_cursor)}`);
    expect(pool.query.mock.calls[1][0]).toContain('(p.created_at,p.id) < ($1,$2::uuid)');
    expect(pool.query.mock.calls[1][0]).toContain('p.id DESC');
    expect(pool.query.mock.calls[1][1].slice(0, 2)).toEqual([new Date(createdAt), id]);
    expect(secondPage.status).toBe(200);
  });

  it('hides another seller’s draft from public product detail', async () => {
    getRecord.mockResolvedValueOnce({ id: 'draft-1', seller_id: 'seller-2', status: 'draft' });

    const response = await request(buildApp()).get('/api/products/draft-1');

    expect(response.status).toBe(404);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('creates products using only permitted fields and the authenticated seller id', async () => {
    createRecord.mockResolvedValueOnce({ id: 'product-new', seller_id: 'seller-1', status: 'draft' });

    const response = await request(buildApp({ id: 'seller-1', role: 'user' }))
      .post('/api/products')
      .send({
        title: ' New item ', price: '12.50', status: 'draft', seller_id: 'victim',
        cost_price: 0.01, view_count: 9000, created_at: '2000-01-01',
      });

    expect(response.status).toBe(201);
    expect(createRecord).toHaveBeenCalledWith('products', {
      title: 'New item', price: 12.5, stock: 0, status: 'draft', seller_id: 'seller-1',
    });
  });

  it('rejects fractional stock instead of truncating it during bulk import', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    pool.connect.mockResolvedValueOnce(client);

    const response = await request(buildApp({ id: 'seller-1', role: 'user' }))
      .post('/api/products/bulk-import')
      .send([{ title: 'Inventory item', price: 12, stock: 1.5 }]);

    expect(response.status).toBe(200);
    expect(response.body.created).toBe(0);
    expect(response.body.errors[0].reason).toContain('stock must be a non-negative integer');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO products'))).toBe(false);
  });

  it('inserts the complete supported inventory schema including tax_rate', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    pool.connect.mockResolvedValueOnce(client);

    const response = await request(buildApp({ id: 'seller-1', role: 'user' }))
      .post('/api/products/bulk-import')
      .send([{ title: 'Inventory item', price: 12, stock: 4, tax_rate: 15 }]);

    expect(response.status).toBe(200);
    expect(response.body.created).toBe(1);
    const insert = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO products'));
    expect(insert[0]).toContain('tax_rate');
    expect(insert[0]).not.toContain('supplier_id');
    expect(insert[1]).toHaveLength(30);
    expect(insert[1][29]).toBe(15);
  });
});
