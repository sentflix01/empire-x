'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  optionalAuth: (_req, _res, next) => next(),
}));

const maps = require('../../routes/maps');

function buildApp(realOnly = false) {
  const app = express();
  app.use((req, _res, next) => { req.realOnly = realOnly; next(); });
  app.use('/api/maps', maps);
  return app;
}

beforeEach(() => {
  pool.query.mockReset();
});

describe('nearby product map search', () => {
  it('rejects invalid inputs without querying the database', async () => {
    const response = await request(buildApp()).get('/api/maps/nearby/product-search?q=x&lat=91&lon=10');

    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns in-radius product and seller results with distance and real-mode filtering', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [
        { id: 'product-near', seller_id: '00000000-0000-0000-0000-000000000001', title: 'Coffee', category: 'cafe', latitude: '9.01', longitude: '38.76' },
        { id: 'product-far', seller_id: '00000000-0000-0000-0000-000000000002', title: 'Coffee', category: 'cafe', latitude: '10.5', longitude: '39.5' },
      ] })
      .mockResolvedValueOnce({ rows: [
        { id: 'business-1', owner_id: '00000000-0000-0000-0000-000000000001', business_name: 'Coffee House', business_category: 'cafe', latitude: '9.01', longitude: '38.76' },
      ] });

    const response = await request(buildApp(true))
      .get('/api/maps/nearby/product-search?q=coffee&lat=9&lon=38.75&radius_km=10&category=cafe');

    expect(response.status).toBe(200);
    expect(response.body.geo_products).toHaveLength(1);
    expect(response.body.geo_products[0]).toMatchObject({ id: 'product-near', distance_km: expect.any(Number) });
    expect(response.body.businesses).toHaveLength(1);
    expect(response.body.businesses[0].matched_products[0].id).toBe('product-near');
    expect(response.body.total_matches).toBe(1);
    expect(pool.query.mock.calls[0][0]).toContain('is_demo=FALSE');
    expect(pool.query.mock.calls[1][0]).toContain('is_seed=FALSE');
  });

  it('returns a controlled error when the database query fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await request(buildApp()).get('/api/maps/nearby/product-search?q=coffee&lat=9&lon=38.75');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to search nearby products' });
  });
});
