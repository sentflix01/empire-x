'use strict';

/**
 * Card messages are made by the server from real records:
 *   - the normal send route refuses 'product', 'order_update' and 'context'
 *     (a sender could invent a product price or an order status);
 *   - POST /share-product builds the product card from the product and now
 *     saves (the messages CHECK used to reject the 'product' type).
 * Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

let app; let owner; let customer; let shop; let convId;
const auth = (x) => ({ Authorization: `Bearer ${accessToken(x.id)}` });

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/messages', require('../../routes/messages'));
  owner = await createUser();
  customer = await createUser();
  shop = await createPublicBusiness(owner.id);
  const res = await request(app).post('/api/messages/conversations/business').set(auth(customer)).send({ business_id: shop.businessId });
  convId = res.body.id ?? res.body.conversation?.id;
});

afterAll(async () => {
  await deleteUser(owner.id);
  await deleteUser(customer.id);
});

describe('card messages', () => {
  it('opens the business chat for the test', () => {
    expect(convId).toBeTruthy();
  });

  it.each([
    ['product', { product_id: '00000000-0000-4000-8000-000000000001', name: 'Free iPhone', price: 1 }],
    ['order_update', { order_id: '00000000-0000-4000-8000-000000000002', status: 'paid' }],
    ['context', {}],
  ])('refuses a %s card sent through the normal route', async (type, metadata) => {
    const res = await request(app).post(`/api/messages/conversations/${convId}/messages`).set(auth(customer))
      .send({ type, content: JSON.stringify(metadata), metadata });
    expect(res.status).toBe(422);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM messages WHERE conversation_id=$1 AND type=$2', [convId, type]);
    expect(rows[0].n).toBe(0);
  });

  it('still sends normal text', async () => {
    const res = await request(app).post(`/api/messages/conversations/${convId}/messages`).set(auth(customer)).send({ content: 'Is this in stock?' });
    expect(res.status).toBe(201);
  });

  it('shares a real product as a card built from the product', async () => {
    const res = await request(app).post('/api/messages/share-product').set(auth(customer)).send({ conversation_id: convId, product_id: shop.productId });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('product');
    const { rows: [msg] } = await pool.query("SELECT metadata FROM messages WHERE conversation_id=$1 AND type='product'", [convId]);
    expect(msg.metadata.product_id).toBe(shop.productId);
    expect(Number(msg.metadata.price)).toBe(250);
  });
});
