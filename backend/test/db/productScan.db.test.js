'use strict';

/**
 * Scan to add products against real Postgres, with the open product
 * databases stubbed: mine → Add stock; shared catalogue without price or
 * stock; private businesses never shared; open-database answers cached
 * (not found too); quick-mode batch save in one transaction.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/products', require('../../routes/products'));
  return app;
}

const realFetch = global.fetch;
let app; let me; let other; let privateSeller;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });
const lookup = (u, code) => request(app).get(`/api/products/lookup/${encodeURIComponent(code)}`).set(auth(u));
// Valid EAN-13s used only here.
const COLA = '5449000000996';
const LOCAL = '4006381333931';
const UNKNOWN = '9780306406157';
const OFF_ONLY = '0036000291452';

beforeAll(async () => {
  app = buildApp();
  [me, other, privateSeller] = [await createUser(), await createUser(), await createUser()];
  const biz = await createPublicBusiness(other.id);
  await pool.query(`UPDATE products SET barcode=$1, title='Coca-Cola 330ml', description='Classic', manufacturer='Coca-Cola', price=40, stock=99 WHERE id=$2`, [COLA, biz.productId]);
  const priv = await createPublicBusiness(privateSeller.id, { visibility: 'private' });
  await pool.query(`UPDATE products SET barcode=$1, title='Secret item' WHERE id=$2`, [LOCAL, priv.productId]);
  await pool.query('DELETE FROM barcode_lookups WHERE gtin = ANY($1::text[])', [[UNKNOWN, OFF_ONLY, LOCAL]]);
});
afterAll(async () => {
  global.fetch = realFetch;
  for (const u of [me, other, privateSeller]) await deleteUser(u.id);
});

describe('GET /api/products/lookup/:code', () => {
  it('suggests from the shared catalogue without price or stock', async () => {
    global.fetch = jest.fn();
    const res = await lookup(me, COLA);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ kind: 'gtin', source: 'nodbusiness', suggestion: { title: 'Coca-Cola 330ml', description: 'Classic', brand: 'Coca-Cola' } });
    expect(res.body.suggestion).not.toHaveProperty("price");
    expect(res.body.suggestion).not.toHaveProperty("stock");
    expect(JSON.stringify(res.body)).not.toMatch(/"price"|"stock"/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('finds my own product first and offers Add stock', async () => {
    const res = await lookup(other, COLA);
    expect(res.body.source).toBe('mine');
    expect(res.body.existing_product).toMatchObject({ title: 'Coca-Cola 330ml', stock: 99 });
  });

  it('never shares products of private businesses', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 0 }) });
    const res = await lookup(me, LOCAL);
    expect(res.body.source).toBe('not_found');
  });

  it('asks the open databases once, then serves the cache', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 1, product: { product_name: 'Diet Soda', brands: 'Acme', quantity: '355 ml', image_front_url: 'https://images.openfoodfacts.org/a.jpg' } }) });
    const first = await lookup(me, OFF_ONLY);
    expect(first.body).toMatchObject({ source: 'open_food_facts', credit: expect.stringMatching(/Open Food Facts/), suggestion: { title: 'Acme Diet Soda', unit: '355 ml' } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const second = await lookup(me, '036000291452'); // same product as 12-digit UPC
    expect(second.body.source).toBe('open_food_facts');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('caches "not found" too, after asking every open database once', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 0 }) });
    expect((await lookup(me, UNKNOWN)).body.source).toBe('not_found');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    await lookup(me, UNKNOWN);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('explains a QR code that is not a product, and rejects a bad barcode on save', async () => {
    expect((await lookup(me, 'https://example.com/menu')).body).toMatchObject({ kind: 'text' });
    const res = await request(app).post('/api/products').set(auth(me)).send({ title: 'X', price: 10, barcode: '1234567890123' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/products/scan-batch', () => {
  it('creates new products and adds stock to mine, in one go', async () => {
    const mine = (await request(app).post('/api/products').set(auth(me)).send({ title: 'Highland Water', price: 15, stock: 5, barcode: '96385074' })).body;
    expect(mine.barcode).toBe('96385074');
    const res = await request(app).post('/api/products/scan-batch').set(auth(me)).send({ items: [
      { product_id: mine.id, add_stock: 3 },
      { title: 'Coca-Cola 330ml', price: 45, stock: 12, barcode: COLA, category: 'Drinks', images: ['https://cdn.example.test/c.jpg'] },
    ] });
    expect(res.status).toBe(201);
    expect(res.body.updated).toEqual([mine.id]);
    expect(res.body.created).toHaveLength(1);
    const { rows: [w] } = await pool.query('SELECT stock FROM products WHERE id=$1', [mine.id]);
    expect(w.stock).toBe(8);
    const { rows: [c] } = await pool.query('SELECT title, price, stock, barcode, images FROM products WHERE id=$1', [res.body.created[0]]);
    expect(c).toMatchObject({ title: 'Coca-Cola 330ml', stock: 12, barcode: COLA });
  });

  it('saves nothing when one item is wrong (price missing, duplicate barcode)', async () => {
    const before = (await pool.query('SELECT COUNT(*)::int AS n FROM products WHERE seller_id=$1', [me.id])).rows[0].n;
    const missingPrice = await request(app).post('/api/products/scan-batch').set(auth(me)).send({ items: [
      { title: 'Good one', price: 10 }, { title: 'No price' },
    ] });
    expect(missingPrice.status).toBe(422);
    expect(missingPrice.body).toMatchObject({ index: 1, message: expect.stringMatching(/price/) });
    const duplicate = await request(app).post('/api/products/scan-batch').set(auth(me)).send({ items: [{ title: 'Again', price: 10, barcode: COLA }] });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.existing_product_id).toBeTruthy();
    const after = (await pool.query('SELECT COUNT(*)::int AS n FROM products WHERE seller_id=$1', [me.id])).rows[0].n;
    expect(after).toBe(before);
  });

  it('refuses another seller’s product and the same barcode on a second normal product', async () => {
    const { rows: [theirs] } = await pool.query('SELECT id FROM products WHERE seller_id=$1 LIMIT 1', [other.id]);
    expect((await request(app).post('/api/products/scan-batch').set(auth(me)).send({ items: [{ product_id: theirs.id, add_stock: 1 }] })).status).toBe(404);
    expect((await request(app).post('/api/products').set(auth(me)).send({ title: 'Water again', price: 15, barcode: '96385074' })).status).toBe(409);
  });
});

describe('POST /api/products/import-image', () => {
  it('only copies photos from the open databases', async () => {
    const res = await request(app).post('/api/products/import-image').set(auth(me)).send({ url: 'https://evil.example.test/x.jpg' });
    expect(res.status).toBe(422);
  });
});
