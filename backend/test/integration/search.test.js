'use strict';

/**
 * GET /api/search with a mocked pool: people get a distance rounded up to
 * 0.5 km and the viewer id is a bound parameter, never part of the SQL text.
 * See project-brain/DECISIONS.md (2026-11-12).
 */
const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  optionalAuth: (req, _res, next) => {
    if (req.headers['x-test-user']) req.user = { id: req.headers['x-test-user'] };
    next();
  },
}));

const search = require('../../routes/search');

const VIEWER = '11111111-2222-4333-8444-555555555555';

function buildApp() {
  const app = express();
  app.use('/api/search', search);
  return app;
}

beforeEach(() => {
  pool.query.mockReset();
});

describe('people search results', () => {
  it('rounds distances up to 0.5 km and marks them approximate', async () => {
    pool.query.mockResolvedValueOnce({ rows: [
      { id: 'p1', user_id: 'u1', display_name: 'Near', distance_km: '0.3' },
      { id: 'p2', user_id: 'u2', display_name: 'Middle', distance_km: '2.2' },
      { id: 'p3', user_id: 'u3', display_name: 'Edge', distance_km: '2.5' },
      { id: 'p4', user_id: 'u4', display_name: 'Unplaced', distance_km: null },
    ] });

    const res = await request(buildApp())
      .get('/api/search?q=sam&type=users&lat=9&lon=38.7&sort=distance&radius_km=5')
      .set('x-test-user', VIEWER);

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([
      expect.objectContaining({ user_id: 'u1', distance_km: 0.5, distance_approx: true }),
      expect.objectContaining({ user_id: 'u2', distance_km: 2.5, distance_approx: true }),
      expect.objectContaining({ user_id: 'u3', distance_km: 2.5, distance_approx: true }),
      expect.objectContaining({ user_id: 'u4', distance_km: null }),
    ]);
    expect(res.body.users[3]).not.toHaveProperty('distance_approx');

    // The radius filter and the order still use the exact distance expression.
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/ASIN\(SQRT\(.*<=\$6::float8/);
    expect(sql).toMatch(/ORDER BY up\.latitude IS NULL,6371\*2\*ASIN/);
  });

  it('binds the viewer id as $3 instead of writing it into the SQL', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await request(buildApp()).get('/api/search?q=sam&type=users').set('x-test-user', VIEWER);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain(VIEWER);
    expect(sql).toContain('up.user_id=$3 OR COALESCE(up.searchable, TRUE)');
    expect(sql).toContain('sb.blocker_id=$3 AND sb.blocked_id=up.user_id');
    expect(sql).toContain('sb.blocker_id=up.user_id AND sb.blocked_id=$3');
    expect(params).toEqual(['sam', 20, VIEWER]); // $1 is the full-text query for 3+ characters
  });

  it('uses no viewer parameter when the user id is not a UUID', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await request(buildApp()).get('/api/search?q=sam&type=users').set('x-test-user', "x' OR '1'='1");

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('$3');
    expect(sql).not.toContain("'1'='1");
    expect(sql).toContain('AND COALESCE(up.searchable, TRUE)');
    expect(params).toEqual(['sam', 20]);
  });
});

describe('coordinates and radius are bound parameters', () => {
  // A negative value written into the SQL once became `col--54.4`, a comment.
  it('binds negative coordinates and the radius after the viewer id for people', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(buildApp())
      .get('/api/search?q=sam&type=users&lat=-54.4&lon=-3.35&radius_km=5')
      .set('x-test-user', VIEWER);

    expect(res.status).toBe(200);
    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual(['sam', 20, VIEWER, -54.4, -3.35, 5]);
    expect(sql).toContain('up.latitude-$4::float8');
    expect(sql).toContain('up.longitude-$5::float8');
    expect(sql).toContain('<=$6::float8');
    expect(sql).not.toContain('54.4');
    expect(sql).not.toContain('3.35');
    expect(sql).not.toContain('--');
  });

  it('binds the coordinates after the price params for products', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await request(buildApp())
      .get('/api/search?q=sam&type=products&lat=-54.4&lon=-3.35&price_min=100')
      .set('x-test-user', VIEWER);

    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual(['sam', 20, 100, -54.4, -3.35]);
    expect(sql).toContain('p.price>=$3');
    expect(sql).toContain('p.latitude-$4::float8');
    expect(sql).toContain('p.longitude-$5::float8');
    expect(sql).not.toContain('--');
  });

  it('gives products a distance at latitude and longitude 0', async () => {
    pool.query.mockResolvedValueOnce({ rows: [
      { id: 'prod-0', title: 'Sambusa', latitude: '0.01', longitude: '0', distance_km: '1.1' },
    ] });

    const res = await request(buildApp())
      .get('/api/search?q=sam&type=products&lat=0&lon=0')
      .set('x-test-user', VIEWER);

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual(['sam', 20, 0, 0]);
    // 1.1 km is sent rounded up to 1.5 km, like every search distance.
    expect(res.body.products[0].distance_km).toBe(1.5);
  });

  it('ignores a radius that is not a positive finite number', async () => {
    for (const radius of ['Infinity', '-5', 'abc', '0']) {
      pool.query.mockReset();
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(buildApp())
        .get(`/api/search?q=sam&type=users&lat=9&lon=38.7&radius_km=${radius}`)
        .set('x-test-user', VIEWER);

      expect(res.status).toBe(200);
      const [sql, params] = pool.query.mock.calls[0];
      expect(params).toEqual(['sam', 20, VIEWER, 9, 38.7]);
      expect(sql).not.toContain('$6');
    }
  });
});

describe('product search results', () => {
  // A product's exact distance could reveal the shop's pin, so it is rounded
  // up to 0.5 km like people (DECISIONS.md "Business location", item 3).
  it('get a distance rounded up to 0.5 km and are not marked approximate', async () => {
    pool.query.mockResolvedValueOnce({ rows: [
      { id: 'prod-1', title: 'Sambusa', latitude: '9.01', longitude: '38.7', distance_km: '1.1' },
    ] });

    const res = await request(buildApp())
      .get('/api/search?q=sam&type=products&lat=9&lon=38.7')
      .set('x-test-user', VIEWER);

    expect(res.status).toBe(200);
    expect(res.body.products[0].distance_km).toBe(1.5);
    expect(res.body.products[0]).not.toHaveProperty('distance_approx');
  });
});
