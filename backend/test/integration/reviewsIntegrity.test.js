'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
}));

const reviews = require('../../routes/reviews');

function buildApp(userId = 'buyer-1') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: userId, role: 'user' }; next(); });
  app.use('/api/reviews', reviews);
  return app;
}

beforeEach(() => { pool.query.mockReset(); });

describe('POST /api/reviews integrity', () => {
  it('rejects fractional ratings before touching the database', async () => {
    const res = await request(buildApp()).post('/api/reviews').send({ product_id: 'p1', rating: 4.5 });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown product', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).post('/api/reviews').send({ product_id: 'missing', rating: 5 });
    expect(res.status).toBe(404);
  });

  it('stops sellers from rating their own product', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ seller_id: 'seller-1' }] });
    const res = await request(buildApp('seller-1')).post('/api/reviews').send({ product_id: 'p1', rating: 5 });
    expect(res.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('rejects an order_id that is not the reviewer\'s order for this product', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'seller-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).post('/api/reviews').send({ product_id: 'p1', order_id: 'someone-elses', rating: 5 });
    expect(res.status).toBe(400);
    expect(pool.query.mock.calls[1][1]).toEqual(['someone-elses', 'buyer-1', 'p1']);
  });

  it('accepts a buyer review and recalculates product stats', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ seller_id: 'seller-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'r1', rating: 4 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).post('/api/reviews').send({ product_id: 'p1', rating: 4, comment: 'Good' });
    expect(res.status).toBe(201);
    expect(pool.query.mock.calls[1][0]).toMatch(/INSERT INTO reviews/);
    expect(pool.query.mock.calls[2][0]).toMatch(/UPDATE products SET average_rating/);
  });
});
