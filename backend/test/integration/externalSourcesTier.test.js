'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

let user = { id: 'owner-1', role: 'user' };
const tierGate = jest.fn((_req, res) => res.status(403).json({ error: 'upgrade_required', requiredTier: 'premium' }));
jest.mock('../../middleware/auth', () => ({ requireAuth: (req, _res, next) => { req.user = user; next(); } }));
jest.mock('../../middleware/tierLimit', () => ({ checkTierLimit: () => (req, res, next) => tierGate(req, res, next) }));

const externalSources = require('../../routes/externalSources');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/showrooms/:showroomId/external-sources', externalSources);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
  user = { id: 'owner-1', role: 'user' };
  pool.query.mockResolvedValue({ rows: [{ owner_id: 'owner-1' }] }); // ownership lookup
});

describe('external data sources are a paid feature', () => {
  it('blocks creating a source on the free tier', async () => {
    const res = await request(buildApp()).post('/api/showrooms/s1/external-sources').send({ section_key: 'items', url: 'https://example.com/api' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('upgrade_required');
  });

  it('blocks editing and mapping changes on the free tier', async () => {
    expect((await request(buildApp()).put('/api/showrooms/s1/external-sources/src-1').send({ url: 'https://example.com/v2' })).status).toBe(403);
    expect((await request(buildApp()).post('/api/showrooms/s1/external-sources/src-1/mappings').send({ source_path: 'a', target_field: 'name' })).status).toBe(403);
  });

  it('still lets a downgraded owner disable a source', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ owner_id: 'owner-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'src-1', url: 'https://example.com', auth_method: 'none', is_enabled: true, section_key: 'items' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'src-1', is_enabled: false }] });
    const res = await request(buildApp()).put('/api/showrooms/s1/external-sources/src-1').send({ is_enabled: false });
    expect(res.status).toBe(200);
    expect(tierGate).not.toHaveBeenCalled();
  });

  it('lets admins manage sources without the owner tier check', async () => {
    user = { id: 'admin-1', role: 'admin' };
    pool.query.mockResolvedValueOnce({ rows: [{ owner_id: 'owner-1' }] }).mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).post('/api/showrooms/s1/external-sources').send({ section_key: 'items' });
    expect(res.status).toBe(422); // reached validation, not the tier gate
    expect(tierGate).not.toHaveBeenCalled();
  });
});
