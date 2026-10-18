'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

let user = null;
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => { if (!user) { res.status(401).json({ error: 'auth' }); return; } req.user = user; next(); },
  optionalAuth: (req, _res, next) => { if (user) req.user = user; next(); },
}));
jest.mock('../../middleware/cache', () => ({ cacheMiddleware: () => (_req, _res, next) => next() }));
jest.mock('../../utils/crud', () => ({
  listRecords: jest.fn(), getRecord: jest.fn(), createRecord: jest.fn(), updateRecord: jest.fn(async (_t, _id, data) => data), deleteRecord: jest.fn(),
  withoutProtectedFields: (data) => ({ ...data }),
}));
jest.mock('../../lib/businessSubscriptionPolicy', () => ({
  getBusinessSubscriptionAccess: jest.fn().mockResolvedValue({ hiddenFromPublic: false }),
  isBusinessOwnerBlocked: jest.fn().mockResolvedValue(false),
}));

const crud = require('../../utils/crud');
const policy = require('../../lib/businessSubscriptionPolicy');
const businesses = require('../../routes/businesses');
const { redactContactFields } = require('../../lib/contactPrivacy');

const BUSINESS = {
  id: 'biz-1', owner_id: 'owner-1', business_name: 'Abebe Coffee', business_category: 'cafe',
  business_contact_phone: '+251900000001', business_contact_email: 'hello@abebe.test', business_address: 'House 12, Bole',
  pickup_address: 'Back door, House 12', public_contact_fields: ['business_contact_phone', 'business_contact_email'],
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.realOnly = true; next(); });
  app.use('/api/businesses', businesses);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
  user = null;
  crud.getRecord.mockResolvedValue({ ...BUSINESS });
  policy.getBusinessSubscriptionAccess.mockResolvedValue({ hiddenFromPublic: false });
});

describe('contact-field privacy', () => {
  it('hides the address and pickup address from visitors by default', () => {
    const out = redactContactFields({ ...BUSINESS }, false);
    expect(out.business_contact_phone).toBe('+251900000001');
    expect(out.business_contact_email).toBe('hello@abebe.test');
    expect(out.business_address).toBeNull();
    expect(out).not.toHaveProperty('pickup_address');
  });

  it('shows everything to the owner', () => {
    expect(redactContactFields({ ...BUSINESS }, true)).toEqual(BUSINESS);
  });

  it('GET /api/businesses/:id redacts for visitors and not for the owner', async () => {
    const visitor = await request(buildApp()).get('/api/businesses/biz-1');
    expect(visitor.body.business_address).toBeNull();
    expect(visitor.body.pickup_address).toBeUndefined();
    user = { id: 'owner-1', role: 'user' };
    const owner = await request(buildApp()).get('/api/businesses/biz-1');
    expect(owner.body.business_address).toBe('House 12, Bole');
    expect(owner.body.pickup_address).toBe('Back door, House 12');
  });

  it('rejects unknown public contact fields', async () => {
    user = { id: 'owner-1', role: 'user' };
    const res = await request(buildApp()).put('/api/businesses/biz-1').send({ public_contact_fields: ['business_contact_phone', 'phone'] });
    expect(res.status).toBe(422);
    expect(crud.updateRecord).not.toHaveBeenCalled();
  });
});

describe('seller payment accounts', () => {
  it('only the owner can add an account', async () => {
    user = { id: 'stranger', role: 'user' };
    const res = await request(buildApp()).post('/api/businesses/biz-1/payment-accounts').send({ method: 'bank', provider_name: 'CBE', account_name: 'Abebe', account_number: '1000' });
    expect(res.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('validates input', async () => {
    user = { id: 'owner-1', role: 'user' };
    const res = await request(buildApp()).post('/api/businesses/biz-1/payment-accounts').send({ method: 'crypto', provider_name: 'X', account_name: 'Y', account_number: '1' });
    expect(res.status).toBe(422);
  });

  it('adds an account for the owner', async () => {
    user = { id: 'owner-1', role: 'user' };
    pool.query.mockResolvedValueOnce({ rows: [{ n: 0 }] }).mockResolvedValueOnce({ rows: [{ id: 'acct-1', method: 'mobile_money' }] });
    const res = await request(buildApp()).post('/api/businesses/biz-1/payment-accounts').send({ method: 'mobile_money', provider_name: 'telebirr', account_name: 'Abebe Kebede', account_number: '0911000000' });
    expect(res.status).toBe(201);
    expect(pool.query.mock.calls[1][1]).toEqual(['biz-1', 'mobile_money', 'telebirr', 'Abebe Kebede', '0911000000', null, true, 0]);
  });

  it('caps the number of accounts', async () => {
    user = { id: 'owner-1', role: 'user' };
    pool.query.mockResolvedValueOnce({ rows: [{ n: 10 }] });
    const res = await request(buildApp()).post('/api/businesses/biz-1/payment-accounts').send({ method: 'bank', provider_name: 'CBE', account_name: 'A', account_number: '1' });
    expect(res.status).toBe(422);
  });

  it('checkout-info shows active accounts and public contact only, never the pickup address', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'acct-1', method: 'bank', provider_name: 'CBE', account_name: 'Abebe', account_number: '1000', instructions: null }] });
    const res = await request(buildApp()).get('/api/businesses/biz-1/checkout-info');
    expect(res.status).toBe(200);
    expect(res.body.business.business_address).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('Back door');
    expect(res.body.payment_accounts).toHaveLength(1);
    expect(res.body.payment_options).toEqual({ direct: true, providers: [] });
    expect(pool.query.mock.calls[0][0]).toMatch(/is_active=TRUE/);
  });

  it('checkout-info hides a lapsed business from visitors', async () => {
    policy.getBusinessSubscriptionAccess.mockResolvedValueOnce({ hiddenFromPublic: true });
    expect((await request(buildApp()).get('/api/businesses/biz-1/checkout-info')).status).toBe(404);
  });
});
