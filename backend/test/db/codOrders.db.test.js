'use strict';

/**
 * Cash-on-delivery orders (audit F-051), real Postgres: stock is reserved on
 * order, returned once on cancel, kept on completion; each side can only make
 * its own status changes; nobody else can touch the order.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', require('../../routes/orders'));
  return app;
}

let app; let seller; let buyer; let stranger; let biz;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });
const stock = async () => Number((await pool.query('SELECT stock FROM products WHERE id = $1', [biz.productId])).rows[0].stock);
const reservation = async (id) => (await pool.query('SELECT status FROM order_inventory_reservations WHERE order_id = $1', [id])).rows.map((r) => r.status);
const order = (quantity, u = buyer) => request(app).post('/api/orders').set(auth(u)).send({ product_id: biz.productId, quantity, buyer_name: 'COD Buyer', buyer_phone: '+251911000777' });
const setStatus = (id, status, u) => request(app).put(`/api/orders/${id}`).set(auth(u)).send({ status });

beforeAll(async () => {
  app = buildApp();
  seller = await createUser(); buyer = await createUser(); stranger = await createUser();
  biz = await createPublicBusiness(seller.id);
  await pool.query('UPDATE products SET stock = 5 WHERE id = $1', [biz.productId]);
});

afterAll(async () => {
  await pool.query('DELETE FROM notifications WHERE user_id = ANY($1)', [[seller.id, buyer.id]]);
  await pool.query('DELETE FROM orders WHERE seller_id = $1', [seller.id]);
  for (const u of [seller, buyer, stranger]) await deleteUser(u.id);
});

describe('placing a COD order', () => {
  it('reserves stock and stores the server price, not the client\'s', async () => {
    const res = await request(app).post('/api/orders').set(auth(buyer)).send({ product_id: biz.productId, quantity: 2, total_price: 1, unit_price: 1, seller_id: buyer.id });
    expect(res.status).toBe(201);
    expect(Number(res.body.total_price)).toBe(500); // 2 × 250 from createPublicBusiness
    expect(res.body.seller_id).toBe(seller.id);
    expect(await stock()).toBe(3);
    expect(await reservation(res.body.id)).toEqual(['reserved']);
    await setStatus(res.body.id, 'cancelled', buyer);
  });

  it('refuses more than the stock, your own product, and bad quantities', async () => {
    expect((await order(99)).status).toBe(422);
    expect((await order(1, seller)).status).toBe(422);
    for (const q of [0, -1, 1.5, 'two']) expect((await order(q)).status).toBe(422);
    expect(await stock()).toBe(5);
  });
});

describe('order lifecycle', () => {
  it('returns stock exactly once when cancelled, even by two requests at once', async () => {
    const { body } = await order(2);
    expect(await stock()).toBe(3);
    const [a, b] = await Promise.all([setStatus(body.id, 'cancelled', buyer), setStatus(body.id, 'cancelled', seller)]);
    // One cancel wins; the other finds the order already changed (409) or no
    // longer cancellable (403).
    const statuses = [a.status, b.status].sort();
    expect(statuses[0]).toBe(200);
    expect([403, 409]).toContain(statuses[1]);
    expect(await stock()).toBe(5);
    expect(await reservation(body.id)).toEqual(['released']);
  });

  it('follows seller and buyer steps, and keeps the stock sold on completion', async () => {
    const { body } = await order(1);
    expect((await setStatus(body.id, 'shipped', buyer)).status).toBe(403);
    expect((await setStatus(body.id, 'completed', seller)).status).toBe(403);
    for (const s of ['confirmed', 'processing', 'shipped', 'delivered']) expect((await setStatus(body.id, s, seller)).status).toBe(200);
    expect((await setStatus(body.id, 'cancelled', seller)).status).toBe(403);
    expect((await setStatus(body.id, 'completed', buyer)).status).toBe(200);
    expect(await reservation(body.id)).toEqual(['committed']);
    expect(await stock()).toBe(4);
  });

  it('lists orders with the product photos for the order card', async () => {
    await pool.query('UPDATE products SET images = $2 WHERE id = $1', [biz.productId, JSON.stringify(['/uploads/cod-photo.jpg'])]);
    const { body } = await order(1);
    const list = await request(app).get('/api/orders').query({ buyer_id: buyer.id }).set(auth(buyer));
    expect(list.status).toBe(200);
    const row = list.body.orders.find((o) => o.id === body.id);
    expect(JSON.parse(row.product_images)).toEqual(['/uploads/cod-photo.jpg']);
    expect(row.access_token_hash).toBeUndefined();
    await setStatus(body.id, 'cancelled', buyer);
  });

  it('keeps strangers out', async () => {
    const { body } = await order(1);
    expect((await setStatus(body.id, 'cancelled', stranger)).status).toBe(403);
    expect((await request(app).get(`/api/orders/${body.id}`).set(auth(stranger))).status).toBe(403);
    await setStatus(body.id, 'cancelled', buyer);
  });
});
