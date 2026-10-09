'use strict';

const request = require('supertest');
const express = require('express');
const mockPool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = req.user || { id: 'demo-user', role: 'user', is_demo: true };
    next();
  },
  optionalAuth: (req, _res, next) => {
    req.realOnly = mockPool.getCurrentDatabaseEnvironment() === 'real';
    next();
  },
}));
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: () => (_req, _res, next) => next(),
}));

const showrooms = require('../../routes/showrooms');
const search = require('../../routes/search');

function showroomApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/showrooms', showrooms);
  return app;
}

function searchApp() {
  const app = express();
  app.use('/api/search', search);
  return app;
}

beforeEach(() => {
  mockPool.query.mockReset().mockResolvedValue({ rows: [] });
});

describe('public showroom visibility and expiry', () => {
  it('serves a public slug only when published and unexpired', async () => {
    const response = await request(showroomApp()).get('/api/showrooms/slug/demo-shop');

    expect(response.status).toBe(404);
    expect(mockPool.query.mock.calls[0][0]).toContain("status='published'");
    expect(mockPool.query.mock.calls[0][0]).toContain('(expires_at IS NULL OR expires_at > NOW())');
  });

  it('hides draft showrooms from anonymous direct-ID requests', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'draft-id', owner_id: 'owner', status: 'draft', expires_at: null }] });

    const response = await request(showroomApp()).get('/api/showrooms/draft-id');

    expect(response.status).toBe(404);
    expect(mockPool.query.mock.calls[0][0]).toContain('(showrooms.expires_at IS NULL OR showrooms.expires_at > NOW())');
  });

  it('restarts the 24-hour window when an active Demo showroom is republished', async () => {
    const startedAt = Date.now();
    let updateValues;
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ owner_id: 'demo-user', status: 'published', expires_at: new Date(startedAt + 60_000) }] })
      .mockImplementationOnce(async (_sql, values) => {
        updateValues = values;
        return { rows: [{ id: 'showroom-id', status: 'published' }] };
      });

    const response = await request(showroomApp()).put('/api/showrooms/showroom-id').send({ status: 'published' });

    expect(response.status).toBe(200);
    const expiry = updateValues.find((value) => value instanceof Date);
    expect(expiry).toBeInstanceOf(Date);
    expect(expiry.getTime()).toBeGreaterThanOrEqual(startedAt + 23 * 60 * 60 * 1000 + 59 * 60 * 1000);
    expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
  });

  it('searches only published, unexpired showrooms', async () => {
    const response = await request(searchApp()).get('/api/search?q=orchard&type=showrooms');

    expect(response.status).toBe(200);
    const showroomQuery = mockPool.query.mock.calls.find(([sql]) => sql.includes('FROM showrooms s'))?.[0];
    expect(showroomQuery).toContain("s.status='published'");
    expect(showroomQuery).toContain('(s.expires_at IS NULL OR s.expires_at > NOW())');
    expect(showroomQuery).toContain('s.owner_id IN');
  });
});
