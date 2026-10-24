'use strict';

/**
 * Products from the normal "Add Product" form must be buyable (audit FUNC-03):
 * they belong to the seller's business, checkout finds its payment details,
 * and older unlinked products are backfilled by migrate77. Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser, tag } = require('./helpers');
const migrate77 = require('../../db/migrate77');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/products', require('../../routes/products'));
  app.use('/api/direct-orders', require('../../routes/directOrders'));
  return app;
}

async function createBusiness(ownerId, { paid = true } = {}) {
  const { rows: [biz] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category, visibility) VALUES ($1, $2, 'shop', 'public') RETURNING id`,
    [ownerId, `DB Test Shop ${tag()}`],
  );
  // Checkout shows only businesses on a paid plan, like createPublicBusiness.
  if (paid) await pool.query(
    `INSERT INTO business_subscriptions (business_id, tier, status, current_period_start, current_period_end)
     VALUES ($1, 'normal', 'active', NOW(), NOW() + INTERVAL '30 days')`,
    [biz.id],
  );
  return biz.id;
}

async function addPaymentAccount(businessId) {
  await pool.query(
    `INSERT INTO business_payment_accounts (business_id, method, provider_name, account_name, account_number)
     VALUES ($1, 'mobile_money', 'telebirr', 'DB Test', '0911000333')`,
    [businessId],
  );
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const product = (extra = {}) => ({ title: `DB Test Beans ${tag()}`, price: 120, stock: 5, category: 'food', ...extra });
const guest = { quantity: 1, buyer_name: 'Guest Buyer', buyer_phone: '+251911000444', buyer_email: 'guest-buy@example.test' };

let app; let seller; let multiSeller; let unpaidSeller; let sellerBiz; let multiBizA; let multiBizB; let unpaidBiz;

beforeAll(async () => {
  app = buildApp();
  seller = await createUser();
  multiSeller = await createUser();
  sellerBiz = await createBusiness(seller.id);
  multiBizA = await createBusiness(multiSeller.id);
  multiBizB = await createBusiness(multiSeller.id);
  unpaidSeller = await createUser();
  unpaidBiz = await createBusiness(unpaidSeller.id, { paid: false });
});

afterAll(async () => {
  await pool.query('DELETE FROM orders WHERE seller_id = ANY($1)', [[seller.id, multiSeller.id, unpaidSeller.id]]);
  await deleteUser(seller.id);
  await deleteUser(multiSeller.id);
  await deleteUser(unpaidSeller.id);
});

describe('product to business link (FUNC-03)', () => {
  it('attaches a new product to the seller\'s only business and warns that buyers cannot pay yet', async () => {
    const res = await request(app).post('/api/products').set(auth(seller)).send(product());
    expect(res.status).toBe(201);
    expect(res.body.business_id).toBe(sellerBiz);
    expect(res.body.payment_ready).toBe(false);
    expect(res.body.checkout_blocker).toBe('no_payment_method');
  });

  it('reports payment_ready once the business has an active payment account', async () => {
    await addPaymentAccount(sellerBiz);
    const res = await request(app).post('/api/products').set(auth(seller)).send(product());
    expect(res.status).toBe(201);
    expect(res.body.payment_ready).toBe(true);
    expect(res.body.checkout_blocker).toBeNull();
  });

  it('tells a seller whose business has no paid plan that buyers cannot order yet', async () => {
    await addPaymentAccount(unpaidBiz);
    const res = await request(app).post('/api/products').set(auth(unpaidSeller)).send(product());
    expect(res.status).toBe(201);
    expect(res.body.business_id).toBe(unpaidBiz);
    expect(res.body.payment_ready).toBe(false);
    expect(res.body.checkout_blocker).toBe('no_plan');
  });

  it('leaves the choice to a seller with several businesses', async () => {
    const unchosen = await request(app).post('/api/products').set(auth(multiSeller)).send(product());
    expect(unchosen.status).toBe(201);
    expect(unchosen.body.business_id).toBeNull();
    expect(unchosen.body.payment_ready).toBe(false);
    expect(unchosen.body.checkout_blocker).toBe('no_business');

    const chosen = await request(app).post('/api/products').set(auth(multiSeller)).send(product({ business_id: multiBizB }));
    expect(chosen.status).toBe(201);
    expect(chosen.body.business_id).toBe(multiBizB);
  });

  it('still refuses another owner\'s business', async () => {
    const res = await request(app).post('/api/products').set(auth(seller)).send(product({ business_id: multiBizA }));
    expect(res.status).toBe(403);
  });

  it('lets a guest order an older unlinked product through the seller\'s business', async () => {
    const { rows: [legacy] } = await pool.query(
      `INSERT INTO products (seller_id, business_id, title, price, currency, stock, status, category)
       VALUES ($1, NULL, $2, 90, 'ETB', 3, 'active', 'food') RETURNING id`,
      [seller.id, `DB Test Legacy ${tag()}`],
    );
    const info = await request(app).get(`/api/direct-orders/checkout-info?product_id=${legacy.id}`);
    expect(info.status).toBe(200);
    expect(info.body.business.id).toBe(sellerBiz);
    expect(info.body.payment_accounts.length).toBeGreaterThan(0);

    const order = await request(app).post('/api/direct-orders').send({ product_id: legacy.id, ...guest });
    expect(order.status).toBe(201);
    expect(order.body.order.business_id).toBe(sellerBiz);
  });

  it('migrate77 backfills only sole-business sellers and is idempotent', async () => {
    const insert = (sellerId) => pool.query(
      `INSERT INTO products (seller_id, business_id, title, price, currency, stock, status, category)
       VALUES ($1, NULL, $2, 50, 'ETB', 1, 'active', 'food') RETURNING id`,
      [sellerId, `DB Test Backfill ${tag()}`],
    ).then(({ rows }) => rows[0].id);
    const single = await insert(seller.id);
    const multi = await insert(multiSeller.id);

    await migrate77(pool);
    const after = async (id) => (await pool.query('SELECT business_id FROM products WHERE id=$1', [id])).rows[0].business_id;
    expect(await after(single)).toBe(sellerBiz);
    expect(await after(multi)).toBeNull();

    await expect(migrate77(pool)).resolves.toBeUndefined();
    expect(await after(single)).toBe(sellerBiz);
  });
});
