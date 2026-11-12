'use strict';

/**
 * Expiry of unpaid direct-payment orders (audit F-051), real Postgres:
 * orders past their 7-day window expire and their reserved stock goes back to
 * the product exactly once; orders still in their window, and confirmed
 * orders, are untouched.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');
const { runDirectOrderExpiry } = require('../../lib/directOrderExpiry');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/direct-orders', require('../../routes/directOrders'));
  return app;
}

let app; let seller; let biz;
const guest = (n) => ({ buyer_name: `Expiry Buyer ${n}`, buyer_phone: '+251911000555', buyer_email: `expiry-${n}@example.test` });
const stockOf = async (id) => (await pool.query('SELECT stock, status FROM products WHERE id = $1', [id])).rows[0];
const order = async (id) => (await pool.query('SELECT status FROM orders WHERE id = $1', [id])).rows[0];
const reservation = async (id) => (await pool.query('SELECT status FROM order_inventory_reservations WHERE order_id = $1', [id])).rows.map((r) => r.status);
const tokens = {};
const placeOrder = async (quantity, n) => {
  const res = await request(app).post('/api/direct-orders').send({ product_id: biz.productId, quantity, ...guest(n) });
  expect(res.status).toBe(201);
  tokens[res.body.order.id] = res.body.access_token;
  return res.body.order.id;
};
const backdate = (id) => pool.query("UPDATE orders SET payment_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1", [id]);

beforeAll(async () => {
  app = buildApp();
  seller = await createUser();
  biz = await createPublicBusiness(seller.id);
  await pool.query(
    `INSERT INTO business_payment_accounts (business_id, method, provider_name, account_name, account_number)
     VALUES ($1, 'mobile_money', 'telebirr', 'DB Test', '0911000666')`, [biz.businessId],
  );
  await pool.query('UPDATE products SET stock = 5 WHERE id = $1', [biz.productId]);
});

afterAll(async () => {
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [seller.id]);
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [seller.id]);
  await deleteUser(seller.id);
});

describe('direct order expiry', () => {
  let overdue; let current; let confirmed;

  it('reserves stock when orders are placed', async () => {
    overdue = await placeOrder(2, 1);
    current = await placeOrder(1, 2);
    confirmed = await placeOrder(1, 3);
    expect((await stockOf(biz.productId)).stock).toBe(1);
    expect(await reservation(overdue)).toEqual(['reserved']);
  });

  it('expires only overdue unpaid orders and returns their stock', async () => {
    await pool.query("UPDATE orders SET status = 'confirmed' WHERE id = $1", [confirmed]);
    await backdate(overdue);
    await backdate(confirmed); // past the window, but already confirmed
    await runDirectOrderExpiry();
    expect((await order(overdue)).status).toBe('expired');
    expect((await order(current)).status).toBe('awaiting_payment');
    expect((await order(confirmed)).status).toBe('confirmed');
    expect(await reservation(overdue)).toEqual(['released']);
    expect((await stockOf(biz.productId)).stock).toBe(3);
  });

  it('is idempotent: a second run releases nothing more', async () => {
    await runDirectOrderExpiry();
    expect((await stockOf(biz.productId)).stock).toBe(3);
    expect((await order(current)).status).toBe('awaiting_payment');
  });

  it('puts a sold-out product back on sale when stock returns', async () => {
    const last = await placeOrder(3, 4);
    expect(await stockOf(biz.productId)).toEqual({ stock: 0, status: 'sold_out' });
    await backdate(last);
    await runDirectOrderExpiry();
    expect(await stockOf(biz.productId)).toEqual({ stock: 3, status: 'active' });
  });

  it('refuses a payment report on an expired order, and accepts one on an open order', async () => {
    const closed = await request(app).post(`/api/direct-orders/link/${tokens[overdue]}/report-payment`).send({ payment_reference: 'TX-EXPIRED-1' });
    expect(closed.status).toBe(409);
    expect((await order(overdue)).status).toBe('expired');
    const open = await request(app).post(`/api/direct-orders/link/${tokens[current]}/report-payment`).send({ payment_reference: 'TX-OPEN-1' });
    expect(open.status).toBe(200);
    expect((await order(current)).status).toBe('payment_reported');
  });
});
