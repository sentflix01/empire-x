jest.mock('../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  optionalAuth: (req, _res, next) => { if (req.user === undefined) req.user = null; next(); },
  requireAdmin: (_req, _res, next) => next(),
}));

jest.mock('../lib/featureFlags', () => ({
  isEnabled: jest.fn(),
  getAllFlags: jest.fn(),
  setFlag: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { isEnabled } = require('../lib/featureFlags');
const flagsRouter = require('../routes/flags');

describe('public page guided tours flag endpoint', () => {
  const app = express();
  app.use('/api/flags', flagsRouter);

  beforeEach(() => jest.clearAllMocks());

  it('returns only the guide availability for a guest', async () => {
    isEnabled.mockResolvedValue(false);

    const response = await request(app).get('/api/flags/page-guided-tours');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: 'page_guided_tours', enabled_for_user: false });
    expect(isEnabled).toHaveBeenCalledWith('page_guided_tours', null);
  });

  it('returns enabled availability for an authenticated user', async () => {
    isEnabled.mockResolvedValue(true);
    const authenticatedApp = express();
    authenticatedApp.use('/api/flags', (req, _res, next) => { req.user = { id: 'user-1' }; next(); }, flagsRouter);

    const response = await request(authenticatedApp).get('/api/flags/page-guided-tours');

    expect(response.status).toBe(200);
    expect(response.body.enabled_for_user).toBe(true);
    expect(isEnabled).toHaveBeenCalledWith('page_guided_tours', 'user-1');
  });
});
