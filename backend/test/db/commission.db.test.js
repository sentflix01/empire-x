'use strict';

/**
 * Commission history (audit F-051), real Postgres. NodBusiness stopped
 * charging commission on 2026-10-16; these routes only show what was recorded
 * before. Each seller sees only their own rows; the summary is admin-only;
 * nothing can create new commission.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/commission', require('../../routes/commission'));
  return app;
}

let app; let seller; let other; let admin;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });

async function historicCommission(sellerId, gross, amount) {
  const biz = await createPublicBusiness(sellerId);
  const { rows: [order] } = await pool.query(
    `INSERT INTO orders (buyer_id, seller_id, business_id, product_id, product_title, total_price, status)
     VALUES ($5, $1, $2, $3, 'Commission history probe', $4, 'completed') RETURNING id`,
    [sellerId, biz.businessId, biz.productId, gross, admin.id],
  );
  await pool.query('INSERT INTO commissions (order_id, seller_id, gross, rate, amount, status) VALUES ($1, $2, $3, 0.03, $4, $5)', [order.id, sellerId, gross, amount, 'collected']);
}

beforeAll(async () => {
  app = buildApp();
  admin = await createUser(); seller = await createUser(); other = await createUser();
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
  await historicCommission(seller.id, 1000, 30);
  await historicCommission(seller.id, 500, 15);
  await historicCommission(other.id, 200, 6);
});

afterAll(async () => {
  await pool.query('DELETE FROM commissions WHERE seller_id = ANY($1)', [[seller.id, other.id]]);
  await pool.query('DELETE FROM orders WHERE seller_id = ANY($1)', [[seller.id, other.id]]);
  for (const u of [seller, other, admin]) await deleteUser(u.id);
});

it('shows a seller only their own history, with today\'s rate of 0', async () => {
  const res = await request(app).get('/api/commission/my-commissions').set(auth(seller)).expect(200);
  expect(res.body.commissions).toHaveLength(2);
  expect(res.body.commissions.every((c) => c.seller_id === seller.id)).toBe(true);
  expect(res.body.total_paid).toBe(45);
  expect(res.body.rate).toBe(0);
});

it('keeps the summary admin-only', async () => {
  await request(app).get('/api/commission/admin/summary').set(auth(seller)).expect(403);
  const res = await request(app).get('/api/commission/admin/summary').set(auth(admin)).expect(200);
  expect(Number(res.body.total_orders)).toBeGreaterThanOrEqual(3);
});

it('has no way to create commission', async () => {
  for (const path of ['/', '/charge', '/record']) {
    const res = await request(app).post(`/api/commission${path}`).set(auth(admin)).send({ amount: 10 });
    expect(res.status).toBe(404);
  }
});
