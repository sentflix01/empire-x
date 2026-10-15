'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.user = { id: 'owner-1', role: 'user', is_demo: false }; next(); },
  optionalAuth: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: () => (_req, _res, next) => next(),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/crud', () => ({
  listRecords: jest.fn(), getRecord: jest.fn(), createRecord: jest.fn(), deleteRecord: jest.fn(),
  updateRecord: jest.fn(async (_t, id, data) => ({ id, ...data })),
  withoutProtectedFields: (data) => ({ ...data }),
}));
jest.mock('../../lib/businessSubscriptionPolicy', () => ({
  getBusinessSubscriptionAccess: jest.fn().mockResolvedValue({ blockedForOwner: false, hiddenFromPublic: false }),
  getRequiredBusinessTier: jest.fn(() => 'pro'),
  canPublishBusinessSite: jest.fn().mockResolvedValue(false),
  isBusinessOwnerBlocked: jest.fn().mockResolvedValue(false),
}));

const crud = require('../../utils/crud');
const policy = require('../../lib/businessSubscriptionPolicy');
const showrooms = require('../../routes/showrooms');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/showrooms', showrooms);
  return app;
}

function publishedShowroom() {
  pool.query.mockImplementation(async (sql) => {
    if (/SELECT owner_id, status, expires_at, business_id, sections FROM showrooms/.test(sql)) {
      return { rows: [{ owner_id: 'owner-1', status: 'published', expires_at: null, business_id: 'biz-1', sections: '[]' }] };
    }
    if (/SELECT id FROM businesses WHERE id=\$1 AND owner_id=\$2/.test(sql)) return { rows: [{ id: 'biz-1' }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
});

describe('editing a published showroom re-checks section entitlements', () => {
  it('rejects adding sections above the plan without sending status', async () => {
    publishedShowroom();
    const res = await request(buildApp()).put('/api/showrooms/sr-1').send({ sections: '["hero","liveLocation"]' });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('subscription_required');
    expect(policy.canPublishBusinessSite).toHaveBeenCalledWith('biz-1', 'owner-1', '["hero","liveLocation"]');
    expect(crud.updateRecord).not.toHaveBeenCalled();
  });

  it('still allows text edits that do not touch sections', async () => {
    publishedShowroom();
    const res = await request(buildApp()).put('/api/showrooms/sr-1').send({ title: 'New title' });
    expect(res.status).toBe(200);
    expect(policy.canPublishBusinessSite).not.toHaveBeenCalled();
  });

  it('allows section edits the plan covers', async () => {
    publishedShowroom();
    policy.canPublishBusinessSite.mockResolvedValueOnce(true);
    const res = await request(buildApp()).put('/api/showrooms/sr-1').send({ sections: '["hero"]' });
    expect(res.status).toBe(200);
    expect(crud.updateRecord).toHaveBeenCalled();
  });
});
