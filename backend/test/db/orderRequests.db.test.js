'use strict';

/**
 * Request to order: a guest requests a service typed into a seller's website
 * (no catalogue product), the seller sets the price, and it continues as a
 * normal direct order. Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/direct-orders', require('../../routes/directOrders'));
  return app;
}

let app; let seller; let other; let biz;
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const guest = { buyer_name: 'Guest Buyer', buyer_phone: '+251911000111', buyer_email: 'guest-request@example.test' };

beforeAll(async () => {
  app = buildApp();
  seller = await createUser();
  other = await createUser();
  biz = await createPublicBusiness(seller.id);
  // The website lists services typed by the owner, not catalogue products.
  await pool.query(
    `UPDATE showrooms SET sections = $2 WHERE id = $1`,
    [biz.siteId, JSON.stringify([
      { type: 'hero', title: 'Shop' },
      { type: 'services', items: [
        { name: 'Consultation', desc: 'Advice', price: 'Free' },
        { name: 'Delivery', desc: 'Local', price: 'From $3' },
      ] },
    ])],
  );
  await pool.query(
    `INSERT INTO business_payment_accounts (business_id, method, provider_name, account_name, account_number)
     VALUES ($1, 'mobile_money', 'telebirr', 'DB Test', '0911000222')`,
    [biz.businessId],
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [seller.id]);
  await deleteUser(seller.id);
  await deleteUser(other.id);
});

describe('request to order', () => {
  let order; let token;

  it('lets a guest request a website item, keeping its listed price', async () => {
    const res = await request(app).post('/api/direct-orders/requests')
      .send({ showroom_id: biz.siteId, item_title: 'Delivery', quantity: 2, notes: 'Bole area', ...guest });
    expect(res.status).toBe(201);
    order = res.body.order;
    token = res.body.access_token;
    expect(order).toMatchObject({ status: 'requested', product_id: null, product_title: 'Delivery', listed_price_text: 'From $3', quantity: 2, unit_price: null });
    expect(res.body.payment_accounts).toHaveLength(1);
    const view = await request(app).get(`/api/direct-orders/link/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.order.status).toBe('requested');
  });

  it('refuses items the seller never offered, and requests to yourself', async () => {
    expect((await request(app).post('/api/direct-orders/requests').send({ showroom_id: biz.siteId, item_title: 'Free iPhone', ...guest })).status).toBe(404);
    expect((await request(app).post('/api/direct-orders/requests').set(auth(seller)).send({ showroom_id: biz.siteId, item_title: 'Delivery', ...guest })).status).toBe(422);
  });

  it('finds the item through the business or the seller too', async () => {
    expect((await request(app).post('/api/direct-orders/requests').send({ business_id: biz.businessId, item_title: 'consultation', ...guest })).status).toBe(201);
    expect((await request(app).post('/api/direct-orders/requests').send({ seller_id: seller.id, item_title: 'Consultation', ...guest })).status).toBe(201);
  });

  it('cannot be paid before the seller sets a price', async () => {
    const res = await request(app).post(`/api/direct-orders/link/${token}/report-payment`).send({ payment_reference: 'X1' });
    expect(res.status).toBe(409);
  });

  it('only the seller can set the price, which opens payment', async () => {
    expect((await request(app).post(`/api/direct-orders/${order.id}/set-price`).set(auth(other)).send({ unit_price: 150 })).status).toBe(404);
    expect((await request(app).post(`/api/direct-orders/${order.id}/set-price`).set(auth(seller)).send({ unit_price: 0 })).status).toBe(422);
    const res = await request(app).post(`/api/direct-orders/${order.id}/set-price`).set(auth(seller)).send({ unit_price: 150 });
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({ status: 'awaiting_payment', unit_price: '150.00', total_price: '300.00' });
    expect((await request(app).post(`/api/direct-orders/${order.id}/set-price`).set(auth(seller)).send({ unit_price: 1 })).status).toBe(409);
  });

  it('then follows the normal direct-payment flow', async () => {
    const reported = await request(app).post(`/api/direct-orders/link/${token}/report-payment`).send({ payment_reference: 'TB123' });
    expect(reported.status).toBe(200);
    expect(reported.body.order.status).toBe('payment_reported');
    const confirm = await request(app).post(`/api/direct-orders/${order.id}/confirm-payment`).set(auth(seller));
    expect(confirm.status).toBe(200);
    expect(confirm.body.order.status).toBe('paid');
  });

  it('can be declined while it is a request', async () => {
    const created = await request(app).post('/api/direct-orders/requests').send({ showroom_id: biz.siteId, item_title: 'Consultation', ...guest });
    const res = await request(app).post(`/api/direct-orders/${created.body.order.id}/decline-request`).set(auth(seller));
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('cancelled');
  });

  it('needs a payment account before a price can be set', async () => {
    const created = await request(app).post('/api/direct-orders/requests').send({ showroom_id: biz.siteId, item_title: 'Consultation', ...guest });
    await pool.query('UPDATE business_payment_accounts SET is_active = FALSE WHERE business_id = $1', [biz.businessId]);
    try {
      const res = await request(app).post(`/api/direct-orders/${created.body.order.id}/set-price`).set(auth(seller)).send({ unit_price: 50 });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('NO_PAYMENT_ACCOUNTS');
    } finally {
      await pool.query('UPDATE business_payment_accounts SET is_active = TRUE WHERE business_id = $1', [biz.businessId]);
    }
  });

  it('expires unanswered requests', async () => {
    const created = await request(app).post('/api/direct-orders/requests').send({ showroom_id: biz.siteId, item_title: 'Consultation', ...guest });
    await pool.query(`UPDATE orders SET payment_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`, [created.body.order.id]);
    const { expireStaleDirectOrders } = require('../../routes/directOrders');
    await expireStaleDirectOrders();
    const { rows: [row] } = await pool.query('SELECT status FROM orders WHERE id = $1', [created.body.order.id]);
    expect(row.status).toBe('expired');
  });
});
