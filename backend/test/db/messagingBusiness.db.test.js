'use strict';

/**
 * The business inbox on a real Postgres: a customer messages a business from
 * a product, showroom or order and sees the business (not the owner); the
 * owner answers from Business; context cards are checked against the
 * business; quote requests; quick replies; blocks still apply.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

let app;
const u = {};
let shop; let otherShop; let orderId;
const auth = (x) => ({ Authorization: `Bearer ${accessToken(x.id)}` });
const api = (method, path, who) => request(app)[method](`/api/messages${path}`).set(auth(who));
const open = (who, body) => api('post', '/conversations/business', who).send(body);
const list = async (who, box) => (await api('get', `/conversations?box=${box}`, who)).body;
const messages = async (who, id) => (await api('get', `/conversations/${id}/messages`, who)).body;
const settle = () => new Promise((r) => setTimeout(r, 200));

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/messages', require('../../routes/messages'));
  for (const name of ['owner', 'customer', 'other', 'rival']) u[name] = await createUser();
  // The owner's personal inbox is closed: business chats still reach them.
  await pool.query("UPDATE user_profiles SET message_policy='nobody' WHERE user_id=$1", [u.owner.id]);
  shop = await createPublicBusiness(u.owner.id);
  otherShop = await createPublicBusiness(u.rival.id);
  const { rows: [o] } = await pool.query(
    `INSERT INTO orders (buyer_id, seller_id, business_id, product_id, product_title, total_price, status)
     VALUES ($1, $2, $3, $4, 'DB Test Coffee', 250, 'pending') RETURNING id`,
    [u.customer.id, u.owner.id, shop.businessId, shop.productId],
  );
  orderId = o.id;
});

afterAll(async () => {
  await pool.query('DELETE FROM orders WHERE id=$1', [orderId]);
  for (const x of Object.values(u)) await deleteUser(x.id);
});

describe('a customer messages a business', () => {
  it('from a product: opens one chat with a product card, shown as the business', async () => {
    const res = await open(u.customer, { business_id: shop.businessId, context: { kind: 'product', id: shop.productId } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ business_id: shop.businessId, is_business_side: false, business_name: expect.stringMatching(/DB Test Shop/) });
    const [card] = await messages(u.customer, res.body.id);
    expect(card.type).toBe('context');
    expect(JSON.parse(card.content)).toMatchObject({ kind: 'product', id: shop.productId, url: `/products/${shop.productId}`, title: expect.stringMatching(/DB Test Coffee/) });
    expect(JSON.parse(card.content).price).toBeUndefined();

    // Same product again: same chat, no duplicate card. Another item: a new card.
    const again = await open(u.customer, { business_id: shop.businessId, context: { kind: 'product', id: shop.productId } });
    expect(again.body.id).toBe(res.body.id);
    await open(u.customer, { business_id: shop.businessId, context: { kind: 'showroom', id: shop.siteId } });
    const cards = (await messages(u.customer, res.body.id)).filter((m) => m.type === 'context').map((m) => JSON.parse(m.content).kind);
    expect(cards).toEqual(['product', 'showroom']);
  });

  it('lands in the owner\'s Business inbox (not Chats) even though their personal messages are closed', async () => {
    const conv = (await open(u.customer, { business_id: shop.businessId })).body;
    await api('post', `/conversations/${conv.id}/messages`, u.customer).send({ content: 'Do you deliver to Bole?' });
    const business = await list(u.owner, 'business');
    expect(business.find((c) => c.id === conv.id)).toMatchObject({ is_business_side: true, is_request: false, other_user_id: u.customer.id });
    expect((await list(u.owner, 'chats')).find((c) => c.id === conv.id)).toBeUndefined();
    expect((await api('get', '/unread-count', u.owner)).body.business).toBeGreaterThanOrEqual(1);
    // ...while a personal chat with the owner is still refused.
    expect((await api('post', '/conversations/find-or-create', u.customer).send({ target_user_id: u.owner.id })).status).toBe(403);
  });

  it('the owner replies as the business', async () => {
    const conv = (await open(u.customer, { business_id: shop.businessId })).body;
    const reply = await api('post', `/conversations/${conv.id}/messages`, u.owner).send({ content: 'Yes, 50 ETB' });
    expect(reply.body.sender_name).toMatch(/DB Test Shop/);
    await settle();
    const { rows: [n] } = await pool.query('SELECT title FROM notifications WHERE user_id=$1 AND link=$2 ORDER BY created_at DESC LIMIT 1', [u.customer.id, `/messages/${conv.id}`]);
    expect(n.title).toMatch(/DB Test Shop/);
  });

  it('refuses cards that belong to another business, and blocked people', async () => {
    expect((await open(u.customer, { business_id: shop.businessId, context: { kind: 'product', id: otherShop.productId } })).status).toBe(422);
    expect((await open(u.customer, { business_id: shop.businessId, context: { kind: 'order', id: orderId } })).status).toBe(201);
    expect((await open(u.other, { business_id: shop.businessId, context: { kind: 'order', id: orderId } })).status).toBe(422); // not their order
    expect((await open(u.owner, { business_id: shop.businessId })).status).toBe(422); // customer_id needed
    await pool.query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)', [u.owner.id, u.other.id]);
    expect((await open(u.other, { business_id: shop.businessId })).status).toBe(403);
    await pool.query('DELETE FROM blocks WHERE blocker_id=$1', [u.owner.id]);
  });
});

describe('the owner messages a customer', () => {
  it('only about a real order with that customer', async () => {
    const stranger = await createUser();
    expect((await open(u.owner, { business_id: shop.businessId, customer_id: stranger.id })).status).toBe(403);
    await deleteUser(stranger.id);
    const res = await open(u.owner, { business_id: shop.businessId, customer_id: u.customer.id, context: { kind: 'order', id: orderId } });
    expect(res.status).toBe(201);
    const cards = (await messages(u.owner, res.body.id)).filter((m) => m.type === 'context').map((m) => JSON.parse(m.content));
    expect(cards.at(-1)).toMatchObject({ kind: 'order', status: 'pending', url: `/orders?order=${orderId}` });
    expect((await open(u.rival, { business_id: shop.businessId, customer_id: u.customer.id, context: { kind: 'order', id: orderId } })).status).toBe(403); // not the owner
  });
});

describe('quote requests and quick replies', () => {
  it('a showroom quote request becomes a business chat with a quote card', async () => {
    const res = await api('post', '/inquiry', u.other).send({ receiver_id: u.owner.id, business_id: shop.businessId, subject: 'Catering for 50', body: 'Saturday lunch?' });
    expect(res.status).toBe(201);
    const msgs = await messages(u.owner, res.body.conversation_id);
    expect(JSON.parse(msgs[0].content)).toMatchObject({ kind: 'quote', title: 'Catering for 50' });
    expect(msgs[1].content).toBe('Saturday lunch?');
    expect((await list(u.owner, 'business')).some((c) => c.id === res.body.conversation_id)).toBe(true);
    expect((await api('post', '/inquiry', u.other).send({ receiver_id: u.rival.id, business_id: shop.businessId, body: 'x' })).status).toBe(422);
  });

  it('only the owner manages quick replies', async () => {
    const put = await api('put', '/quick-replies', u.owner).send({ business_id: shop.businessId, replies: ['Yes, it’s in stock', 'Delivery takes 2 days'] });
    expect(put.body.map((r) => r.text)).toEqual(['Yes, it’s in stock', 'Delivery takes 2 days']);
    expect((await api('get', `/quick-replies?business_id=${shop.businessId}`, u.customer)).status).toBe(403);
    expect((await api('put', '/quick-replies', u.owner).send({ business_id: shop.businessId, replies: Array(21).fill('x') })).status).toBe(422);
  });
});
