'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requireAdmin: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
}));

const referral = require('../../routes/referral');
const verification = require('../../routes/verification');

function buildApp(router, base, user = { id: '11111111-2222-3333-4444-555555555555', role: 'user' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  app.use(base, router);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
});

describe('referral', () => {
  it('reports stats from independent aggregates and returns the fields the page reads', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ referral_code: 'ABCD1234' }] })
      .mockResolvedValueOnce({ rows: [{ referrals: '3', earned: '150' }] });

    const res = await request(buildApp(referral, '/api/referral')).get('/api/referral/my-code');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 'ABCD1234', referrals: 3, total_referred: 3, earned: 150 });
    expect(res.body.referral_link).toMatch(/\/register\?ref=ABCD1234$/);
    const statsSql = pool.query.mock.calls[1][0];
    expect(statsSql).not.toMatch(/JOIN/i);
    expect(statsSql).toMatch(/SUM\(points\)/);
  });

  it('awards both sides using the real point_transactions columns', async () => {
    const client = { query: jest.fn(), release: jest.fn() };
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'referrer-1' }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValue({ rowCount: 1, rows: [] });
    pool.connect.mockResolvedValueOnce(client);

    const res = await request(buildApp(referral, '/api/referral')).post('/api/referral/apply').send({ code: 'abcd1234' });

    expect(res.status).toBe(200);
    expect(res.body.points_awarded).toBe(20);
    const inserts = client.query.mock.calls.filter(([sql]) => /INSERT INTO point_transactions/.test(sql));
    expect(inserts).toHaveLength(2);
    for (const [sql] of inserts) expect(sql).toMatch(/\(user_id, type, points, reason, reference\)/);
    expect(inserts.map(([, params]) => params[1])).toEqual([50, 20]);
    const balanceUpdates = client.query.mock.calls.filter(([sql]) => /UPDATE user_profiles SET points = points \+/.test(sql));
    expect(balanceUpdates).toHaveLength(2);
    expect(client.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(true);
  });
});

describe('verification', () => {
  const urls = { selfie_url: 'https://cdn.example.test/s.jpg', id_document_url: 'https://cdn.example.test/id.jpg' };

  it('rejects a request without the selfie and ID document the table requires', async () => {
    const res = await request(buildApp(verification, '/api/verification')).post('/api/verification/request').send({ verification_type: 'personal' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('inserts the uploaded document URLs on a first request', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'vr-1', status: 'pending' }] });
    const res = await request(buildApp(verification, '/api/verification')).post('/api/verification/request').send({ verification_type: 'personal', ...urls });
    expect(res.status).toBe(201);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/INSERT INTO verification_requests \(user_id,verification_type,selfie_url,id_document_url/);
    expect(params.slice(2, 4)).toEqual([urls.selfie_url, urls.id_document_url]);
  });

  it('re-opens the existing row after a rejection instead of hitting UNIQUE(user_id)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'vr-1', status: 'rejected' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'vr-1', status: 'pending' }] });
    const res = await request(buildApp(verification, '/api/verification')).post('/api/verification/request').send({ verification_type: 'business', ...urls });
    expect(res.status).toBe(201);
    expect(pool.query.mock.calls[1][0]).toMatch(/UPDATE verification_requests/);
    expect(pool.query.mock.calls[1][1][6]).toBe('vr-1');
  });

  it('still blocks a second request while one is pending', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'vr-1', status: 'pending' }] });
    const res = await request(buildApp(verification, '/api/verification')).post('/api/verification/request').send({ verification_type: 'personal', ...urls });
    expect(res.status).toBe(409);
  });

  it('serves the status shape the profile component reads', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_verified: false, verification_type: null, verified_at: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'vr-1', status: 'rejected', admin_note: 'blurry' }] });
    const res = await request(buildApp(verification, '/api/verification')).get('/api/verification/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      is_verified: false, verification_type: null, verified_at: null,
      request: { id: 'vr-1', status: 'rejected', admin_note: 'blurry' },
    });
  });
});
