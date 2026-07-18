'use strict';
/**
 * Integration tests for backend/routes/orders.js
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

const { listRecords, getRecord, createRecord, updateRecord } = require('../../utils/crud');
const ordersRouter = require('../../routes/orders');

// Inject a mock user as if requireAuth passed
function buildApp(role = 'user') {
  const app = express();
  app.use(express.json());
  // Inject req.user so requireAuth is bypassed
  app.use((req, _res, next) => { req.user = { id: 'user-1', role }; next(); });
  app.use('/api/orders', ordersRouter);
  return app;
}

describe('GET /api/orders/', () => {
  it('returns list of orders for current user', async () => {
    listRecords.mockResolvedValueOnce([{ id: 'order-1', buyer_id: 'user-1' }]);
    const res = await request(buildApp()).get('/api/orders/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 500 on db failure', async () => {
    listRecords.mockRejectedValueOnce(new Error('db error'));
    const res = await request(buildApp()).get('/api/orders/');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('code', 'INTERNAL_ERROR');
  });
});

describe('POST /api/orders/', () => {
  it('returns 422 when required fields are missing', async () => {
    const res = await request(buildApp()).post('/api/orders/').send({ product_title: 'Test' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 201 on successful order creation', async () => {
    createRecord.mockResolvedValueOnce({ id: 'order-new', buyer_id: 'user-1', product_title: 'Test', total_price: 100 });
    mockPool.query.mockResolvedValueOnce({ rows: [{ email: 'u@b.com' }] });
    const res = await request(buildApp()).post('/api/orders/').send({
      seller_id: 'seller-1',
      product_title: 'Test Product',
      total_price: 100,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});

describe('PUT /api/orders/:id', () => {
  it('returns 404 when order not found', async () => {
    getRecord.mockResolvedValueOnce(null);
    const res = await request(buildApp()).put('/api/orders/nonexistent').send({ status: 'processing' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
  });

  it('returns 200 on successful status update', async () => {
    getRecord.mockResolvedValueOnce({ id: 'order-1', buyer_id: 'user-1', seller_id: 'seller-1', status: 'pending', product_title: 'T', total_price: 100, currency: 'ETB' });
    updateRecord.mockResolvedValueOnce({ id: 'order-1', status: 'processing' });
    const res = await request(buildApp()).put('/api/orders/order-1').send({ status: 'processing' });
    expect(res.status).toBe(200);
  });
});
