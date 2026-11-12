'use strict';

/**
 * GET /api/saves/my-products (Business Analytics "Saves"), real Postgres:
 * a seller sees when their own products were saved, never who saved them,
 * never other sellers' products, and can narrow to one business.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/saves', require('../../routes/saves'));
  return app;
}

let app; let seller; let other; let shopper; let mine; let mine2; let theirs;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });
const save = (u, id) => request(app).post('/api/saves/toggle').set(auth(u)).send({ target_id: id, target_type: 'product' });

beforeAll(async () => {
  app = buildApp();
  seller = await createUser(); other = await createUser(); shopper = await createUser();
  mine = await createPublicBusiness(seller.id);
  mine2 = await createPublicBusiness(seller.id);
  theirs = await createPublicBusiness(other.id);
  for (const id of [mine.productId, mine2.productId, theirs.productId]) expect((await save(shopper, id)).body.saved).toBe(true);
  expect((await save(other, mine.productId)).body.saved).toBe(true);
});

afterAll(async () => {
  await pool.query('DELETE FROM saves WHERE user_id = ANY($1)', [[seller.id, other.id, shopper.id]]);
  for (const u of [seller, other, shopper]) await deleteUser(u.id);
});

describe('GET /api/saves/my-products', () => {
  it("lists saves of the seller's own products only, without who saved them", async () => {
    const res = await request(app).get('/api/saves/my-products').set(auth(seller));
    expect(res.status).toBe(200);
    const counts = res.body.reduce((m, r) => ({ ...m, [r.target_id]: (m[r.target_id] ?? 0) + 1 }), {});
    expect(counts).toEqual({ [mine.productId]: 2, [mine2.productId]: 1 });
    for (const row of res.body) {
      expect(Object.keys(row).sort()).toEqual(['created_at', 'target_id']);
    }
  });

  it('narrows to one business', async () => {
    const res = await request(app).get('/api/saves/my-products').query({ business_id: mine2.businessId }).set(auth(seller));
    expect(res.body.map((r) => r.target_id)).toEqual([mine2.productId]);
    expect((await request(app).get('/api/saves/my-products').query({ business_id: 'nope' }).set(auth(seller))).status).toBe(400);
  });

  it('needs sign-in and shows nothing for a seller with no saved products', async () => {
    expect((await request(app).get('/api/saves/my-products')).status).toBe(401);
    expect((await request(app).get('/api/saves/my-products').set(auth(shopper))).body).toEqual([]);
  });
});
