'use strict';

/**
 * Coupons (audit F-051), real Postgres: creation rules, validation of the
 * discount a buyer is shown, ownership of edits, and the retired /use route.
 * (The discount charged is applied server-side in routes/orders.ts.)
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/coupons', require('../../routes/coupons'));
  return app;
}

let app; let seller; let other;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });
const create = (body, u = seller) => request(app).post('/api/coupons').set(auth(u)).send(body);
const validate = (body) => request(app).post('/api/coupons/validate').send(body);

beforeAll(async () => { app = buildApp(); seller = await createUser(); other = await createUser(); });
afterAll(async () => {
  await pool.query('DELETE FROM coupons WHERE seller_id = ANY($1)', [[seller.id, other.id]]);
  for (const u of [seller, other]) await deleteUser(u.id);
});

describe('creating coupons', () => {
  it('stores the code upper-case and refuses a duplicate for the same seller', async () => {
    const res = await create({ code: ' save10 ', discount_type: 'percentage', discount_value: 10, min_order: 100 });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('SAVE10');
    expect((await create({ code: 'SAVE10', discount_type: 'fixed', discount_value: 5 })).status).toBe(409);
    expect((await create({ code: 'SAVE10', discount_type: 'fixed', discount_value: 5 }, other)).status).toBe(201);
  });

  it.each([
    [{ code: 'X', discount_type: 'fixed', discount_value: 5 }],
    [{ code: 'BAD CODE', discount_type: 'fixed', discount_value: 5 }],
    [{ code: 'P101', discount_type: 'percentage', discount_value: 101 }],
    [{ code: 'NEG', discount_type: 'fixed', discount_value: -1 }],
    [{ code: 'TYPE', discount_type: 'free', discount_value: 5 }],
    [{ code: 'LIMIT', discount_type: 'fixed', discount_value: 5, usage_limit: 0 }],
    [{ code: 'DATE', discount_type: 'fixed', discount_value: 5, expires_at: 'not-a-date' }],
  ])('rejects %p with 400', async (body) => {
    expect((await create(body)).status).toBe(400);
  });
});

describe('validating a coupon for a buyer', () => {
  beforeAll(async () => {
    await create({ code: 'FLAT50', discount_type: 'fixed', discount_value: 50 });
    await create({ code: 'OLD', discount_type: 'fixed', discount_value: 5, expires_at: '2020-01-01T00:00:00Z' });
    const used = await create({ code: 'USEDUP', discount_type: 'fixed', discount_value: 5, usage_limit: 1 });
    await pool.query('UPDATE coupons SET usage_count = 1 WHERE id = $1', [used.body.id]);
  });

  it('computes a percentage discount', async () => {
    const res = await validate({ code: 'save10', seller_id: seller.id, order_total: 250 });
    expect(res.status).toBe(200);
    expect(res.body.discount).toBe(25);
  });

  it('never discounts more than the order', async () => {
    expect((await validate({ code: 'FLAT50', seller_id: seller.id, order_total: 30 })).body.discount).toBe(30);
  });

  it('enforces the minimum order', async () => {
    expect((await validate({ code: 'SAVE10', seller_id: seller.id, order_total: 99 })).status).toBe(400);
  });

  it.each([['OLD'], ['USEDUP']])('refuses the expired or used-up coupon %s', async (code) => {
    expect((await validate({ code, seller_id: seller.id, order_total: 500 })).status).toBe(404);
  });

  it('refuses another seller\'s code for this seller', async () => {
    await create({ code: 'OTHERS', discount_type: 'fixed', discount_value: 5 }, other);
    expect((await validate({ code: 'OTHERS', seller_id: seller.id, order_total: 500 })).status).toBe(404);
  });

  it('refuses a coupon the seller switched off', async () => {
    const { body } = await request(app).get('/api/coupons/mine').set(auth(seller));
    const flat = body.find((c) => c.code === 'FLAT50');
    await request(app).patch(`/api/coupons/${flat.id}/toggle`).set(auth(seller)).expect(200);
    expect((await validate({ code: 'FLAT50', seller_id: seller.id, order_total: 500 })).status).toBe(404);
  });

  it.each([
    [{ code: 'SAVE10', seller_id: 'not-a-uuid', order_total: 250 }],
    [{ code: 12345, seller_id: '00000000-0000-0000-0000-000000000000', order_total: 250 }],
    [{ code: 'SAVE10', order_total: 250 }],
    [{ code: 'SAVE10', seller_id: '00000000-0000-0000-0000-000000000000', order_total: 'abc' }],
    [{ code: 'SAVE10', seller_id: '00000000-0000-0000-0000-000000000000', order_total: -10 }],
    [{ code: 'SAVE10', seller_id: '00000000-0000-0000-0000-000000000000', order_total: { $gt: 0 } }],
  ])('answers 400, not 500 or a NaN discount, for %p', async (body) => {
    expect((await validate(body)).status).toBe(400);
  });
});

describe('managing coupons', () => {
  it('only the owner can switch off or delete a coupon', async () => {
    const { body } = await request(app).get('/api/coupons/mine').set(auth(seller));
    const save = body.find((c) => c.code === 'SAVE10');
    await request(app).patch(`/api/coupons/${save.id}/toggle`).set(auth(other)).expect(403);
    await request(app).delete(`/api/coupons/${save.id}`).set(auth(other)).expect(403);
    await request(app).delete(`/api/coupons/${save.id}`).set(auth(seller)).expect(200);
  });

  it('usage cannot be bumped by clients (410)', async () => {
    expect((await request(app).post('/api/coupons/use').set(auth(seller)).send({ code: 'SAVE10' })).status).toBe(410);
  });
});
