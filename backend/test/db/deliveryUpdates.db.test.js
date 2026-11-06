'use strict';

/**
 * Delivery tracking (audit F-003): the seller adds updates and the buyer
 * reads them, against the real delivery_updates table. The route used to
 * insert columns that do not exist, so every update failed.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/delivery', require('../../routes/delivery'));
  return app;
}

let app; let seller; let buyer; let stranger; let orderId;
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });

beforeAll(async () => {
  app = buildApp();
  seller = await createUser();
  buyer = await createUser();
  stranger = await createUser();
  const biz = await createPublicBusiness(seller.id);
  const { rows: [order] } = await pool.query(
    `INSERT INTO orders (buyer_id, seller_id, business_id, product_id, product_title, total_price, status)
     VALUES ($1, $2, $3, $4, 'DB Test Coffee', 250, 'confirmed') RETURNING id`,
    [buyer.id, seller.id, biz.businessId, biz.productId],
  );
  orderId = order.id;
});

afterAll(async () => {
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [buyer.id]);
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [seller.id]);
  for (const u of [seller, buyer, stranger]) await deleteUser(u.id);
});

describe('delivery updates', () => {
  it('lets the seller add an update with a note and location, and notifies the buyer', async () => {
    const res = await request(app).post('/api/delivery').set(auth(seller))
      .send({ order_id: orderId, status: 'Packed', note: 'Wrapped and sealed', location: 'Bole' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ order_id: orderId, status: 'Packed', note: 'Wrapped and sealed', location: 'Bole', created_by: seller.id });
    const { rows } = await pool.query(`SELECT title, body FROM notifications WHERE user_id = $1 AND type = 'order'`, [buyer.id]);
    expect(rows).toEqual([expect.objectContaining({ body: 'Wrapped and sealed' })]);
  });

  it('shows the updates to the buyer in order', async () => {
    await request(app).post('/api/delivery').set(auth(seller)).send({ order_id: orderId, status: 'In Transit' }).expect(201);
    const res = await request(app).get(`/api/delivery/order/${orderId}`).set(auth(buyer));
    expect(res.status).toBe(200);
    expect(res.body.map((u) => u.status)).toEqual(['Packed', 'In Transit']);
  });

  it('refuses the buyer and strangers as authors, and strangers as readers', async () => {
    await request(app).post('/api/delivery').set(auth(buyer)).send({ order_id: orderId, status: 'Delivered' }).expect(403);
    await request(app).post('/api/delivery').set(auth(stranger)).send({ order_id: orderId, status: 'Delivered' }).expect(403);
    await request(app).get(`/api/delivery/order/${orderId}`).set(auth(stranger)).expect(403);
  });

  it('rejects unknown statuses and over-long notes', async () => {
    await request(app).post('/api/delivery').set(auth(seller)).send({ order_id: orderId, status: 'Teleported' }).expect(400);
    await request(app).post('/api/delivery').set(auth(seller)).send({ order_id: orderId, status: 'Packed', note: 'x'.repeat(501) }).expect(400);
  });
});
