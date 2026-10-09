'use strict';

const express = require('express');
const request = require('supertest');
const pool = require('../db/pool');

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => { if (!req.user) req.user = { id: 'profile-owner-1', role: 'user' }; next(); },
  optionalAuth: (_req, _res, next) => next(),
}));

const router = require('../routes/profilePartnerships');
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.user = { id: 'profile-owner-1', role: 'user' }; next(); });
app.use('/api/profile-partnerships', router);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('profile-owner partnership commission', () => {
  test('records the order snapshot subtotal after discounts, not total charged', async () => {
    await router.recordProfileOwnerCommission({
      id: 'order-1',
      profile_partnership_id: 'partnership-1',
      profile_owner_id: 'profile-owner-1',
      seller_id: 'business-owner-1',
      profile_commission_rate: '0.10',
      profile_eligible_subtotal: '90.00',
      total_price: '100.00',
      currency: 'ETB',
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('ON CONFLICT (order_id) DO NOTHING');
    expect(pool.query.mock.calls[0][1]).toEqual([
      'partnership-1', 'order-1', 'profile-owner-1', 'business-owner-1', 90, 0.1, 9, 'ETB',
    ]);
  });

  test('uses the after-discount subtotal fallback for older Stripe snapshots', async () => {
    await router.recordProfileOwnerCommission({
      id: 'order-2', profile_partnership_id: 'partnership-1', profile_owner_id: 'profile-owner-1',
      seller_id: 'business-owner-1', profile_commission_rate: 0.2,
      amount_subtotal: 125, amount_discount: 25, total_price: 100, currency: 'ETB',
    });

    expect(pool.query.mock.calls[0][1][4]).toBe(100);
    expect(pool.query.mock.calls[0][1][6]).toBe(20);
  });

  test('does not create a ledger row without an attributed order', async () => {
    await router.recordProfileOwnerCommission({ id: 'order-unattributed', total_price: 90 });
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects an agreement without an explicit selection of offerings', async () => {
    const response = await request(app).post('/api/profile-partnerships').send({
      business_id: '11111111-1111-4111-8111-111111111111',
      profile_owner_id: '22222222-2222-4222-8222-222222222222',
      commission_rate: 10,
      ends_at: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
