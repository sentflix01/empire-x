'use strict';

const request = require('supertest');
const express = require('express');
const mockPool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  optionalAuth: (req, _res, next) => {
    req.realOnly = mockPool.getCurrentDatabaseEnvironment() === 'real';
    next();
  },
}));
jest.mock('../../lib/redis', () => ({
  cached: jest.fn((_key, _ttl, loader) => loader()),
}));

const { cached } = require('../../lib/redis');
const router = require('../../routes/trending');

function buildApp() {
  const app = express();
  app.use('/api/trending', router);
  return app;
}

beforeEach(() => {
  mockPool.query.mockReset().mockResolvedValue({ rows: [] });
  cached.mockClear();
});

it('uses the isolated Demo cache namespace and hides expired showrooms', async () => {
  const response = await mockPool.runWithDatabaseEnvironment(
    { environment: 'demo' },
    () => request(buildApp()).get('/api/trending'),
  );

  expect(response.status).toBe(200);
  expect(cached.mock.calls[0][0]).toBe('trending:demo:all-users');
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.headers.vary).toContain('X-Account-Mode');
  const showroomQuery = mockPool.query.mock.calls.find(([sql]) => sql.includes('FROM showrooms'))?.[0];
  expect(showroomQuery).toContain('(expires_at IS NULL OR expires_at > NOW())');
});

it('keeps Real trending data in its own cache namespace', async () => {
  const response = await request(buildApp()).get('/api/trending');

  expect(response.status).toBe(200);
  expect(cached.mock.calls[0][0]).toBe('trending:real:real-only');
});
