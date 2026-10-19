'use strict';

/**
 * Read state on a real Postgres: message requests, unread counts and the
 * badge, "delivered" and "seen" (only when both people allow read receipts),
 * mute, archive, and delete for me.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

let app;
const u = {};
const auth = (x) => ({ Authorization: `Bearer ${accessToken(x.id)}` });
const api = (method, path, who) => request(app)[method](`/api/messages${path}`).set(auth(who));
const send = (who, convId, content) => api('post', `/conversations/${convId}/messages`, who).send({ content });
const list = async (who, box) => (await api('get', `/conversations${box ? `?box=${box}` : ''}`, who)).body;
const find = async (who, convId, box) => (await list(who, box)).find((c) => c.id === convId);
const badge = async (who) => (await api('get', '/unread-count', who)).body;
const follow = (a, b) => pool.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [a.id, b.id]);
const settle = () => new Promise((r) => setTimeout(r, 200));

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/messages', require('../../routes/messages'));
  app.use('/api/social', require('../../routes/social'));
  for (const name of ['buyer', 'seller', 'newcomer', 'friend']) u[name] = await createUser();
  await follow(u.seller, u.buyer); // the seller follows the buyer: the buyer's messages aren't requests
});

afterAll(async () => { for (const x of Object.values(u)) await deleteUser(x.id); });

const openChat = async (from, to) => (await api('post', '/conversations/find-or-create', from).send({ target_user_id: to.id })).body;

describe('message requests', () => {
  it('a first message from someone you don’t follow waits in Requests', async () => {
    const conv = await openChat(u.newcomer, u.seller);
    await send(u.newcomer, conv.id, 'Hello, do you sell wholesale?');
    expect(await find(u.seller, conv.id, 'chats')).toBeUndefined();
    expect(await find(u.seller, conv.id, 'requests')).toMatchObject({ is_request: true, unread_count: 1 });
    expect((await find(u.seller, conv.id)).is_request).toBe(true); // older apps see it too
    expect(await badge(u.seller)).toMatchObject({ requests: 1 });
    await settle();
    const { rows: [n] } = await pool.query('SELECT title FROM notifications WHERE user_id=$1 AND link=$2', [u.seller.id, `/messages/${conv.id}`]);
    expect(n.title).toBe('Message request from DB Test');
    // For the sender it's an ordinary chat.
    expect(await find(u.newcomer, conv.id, 'chats')).toMatchObject({ is_request: false });
  });

  it('accepting, or replying, moves it to Chats', async () => {
    const conv = await openChat(u.newcomer, u.friend);
    await send(u.newcomer, conv.id, 'hi');
    expect((await api('post', `/conversations/${conv.id}/accept`, u.friend)).status).toBe(200);
    expect(await find(u.friend, conv.id, 'chats')).toBeTruthy();

    const other = await openChat(u.newcomer, u.buyer);
    await send(u.newcomer, other.id, 'hey');
    await send(u.buyer, other.id, 'hey yourself');
    expect(await find(u.buyer, other.id, 'chats')).toBeTruthy();
  });

  it('is not a request when you already follow them', async () => {
    const conv = await openChat(u.buyer, u.seller);
    expect((await find(u.seller, conv.id, 'chats'))).toBeTruthy();
  });
});

describe('unread, delivered and seen', () => {
  it('counts unread for the badge and clears it when the chat is opened', async () => {
    const conv = await openChat(u.buyer, u.seller);
    const before = (await badge(u.seller)).messages;
    await send(u.buyer, conv.id, 'one');
    await send(u.buyer, conv.id, 'two');
    expect((await find(u.seller, conv.id)).unread_count).toBe(2);
    expect((await badge(u.seller)).messages).toBe(before + 2);
    await settle();
    const read = await api('post', `/conversations/${conv.id}/read`, u.seller);
    expect(read.status).toBe(200);
    expect((await find(u.seller, conv.id)).unread_count).toBe(0);
    const { rows } = await pool.query('SELECT 1 FROM notifications WHERE user_id=$1 AND link=$2 AND NOT is_read', [u.seller.id, `/messages/${conv.id}`]);
    expect(rows).toHaveLength(0);
    // The buyer sees "seen" and "delivered".
    const mine = await find(u.buyer, conv.id);
    expect(mine.other_last_read_at).not.toBeNull();
    expect(new Date(mine.other_last_read_at) >= new Date(mine.last_message_at)).toBe(true);
    expect(mine.other_last_delivered_at).not.toBeNull();
  });

  it('marks delivered when the app receives messages, before they are read', async () => {
    const conv = await openChat(u.buyer, u.seller);
    await api('post', `/conversations/${conv.id}/read`, u.seller);
    await send(u.buyer, conv.id, 'are you there?');
    const delivered = await api('post', '/delivered', u.seller).send({ conversation_ids: [conv.id] });
    expect(delivered.body.updated).toBe(1);
    const mine = await find(u.buyer, conv.id);
    expect(new Date(mine.other_last_delivered_at) >= new Date(mine.last_message_at)).toBe(true);
    expect(new Date(mine.other_last_read_at) < new Date(mine.last_message_at)).toBe(true);
  });

  it('hides "seen" both ways when either person turns read receipts off', async () => {
    const conv = await openChat(u.buyer, u.seller);
    await send(u.buyer, conv.id, 'receipts?');
    expect((await request(app).put('/api/social/privacy').set(auth(u.seller)).send({ read_receipts: false })).body.read_receipts).toBe(false);
    await api('post', `/conversations/${conv.id}/read`, u.seller);
    expect((await find(u.buyer, conv.id)).other_last_read_at).toBeNull();
    const details = (await api('get', `/conversations/${conv.id}`, u.buyer)).body;
    expect(details.members.find((m) => m.user_id === u.seller.id).last_read_at).toBeNull();
    // ...and the seller can't see the buyer's either.
    await api('post', `/conversations/${conv.id}/read`, u.buyer);
    expect((await find(u.seller, conv.id)).other_last_read_at).toBeNull();
    await request(app).put('/api/social/privacy').set(auth(u.seller)).send({ read_receipts: true });
    expect((await find(u.buyer, conv.id)).other_last_read_at).not.toBeNull();
  });
});

describe('mute and archive', () => {
  it('a muted chat sends no notifications and leaves the badge, but still counts unread', async () => {
    const conv = await openChat(u.buyer, u.seller);
    await api('post', `/conversations/${conv.id}/read`, u.seller);
    expect((await api('put', `/conversations/${conv.id}/mute`, u.seller).send({ duration: '8h' })).body.muted).toBe(true);
    const before = await badge(u.seller);
    await pool.query('DELETE FROM notifications WHERE user_id=$1 AND link=$2', [u.seller.id, `/messages/${conv.id}`]);
    await send(u.buyer, conv.id, 'quiet please');
    await settle();
    const { rows } = await pool.query('SELECT 1 FROM notifications WHERE user_id=$1 AND link=$2', [u.seller.id, `/messages/${conv.id}`]);
    expect(rows).toHaveLength(0);
    expect((await badge(u.seller)).messages).toBe(before.messages);
    expect(await find(u.seller, conv.id)).toMatchObject({ muted: true, unread_count: 1 });
    expect((await api('put', `/conversations/${conv.id}/mute`, u.seller).send({ duration: 'never' })).status).toBe(422);
    await api('put', `/conversations/${conv.id}/mute`, u.seller).send({ duration: 'off' });
  });

  it('archived chats leave the list until a new message arrives (unless muted)', async () => {
    const conv = await openChat(u.buyer, u.seller);
    await api('put', `/conversations/${conv.id}/archive`, u.seller).send({ archived: true });
    expect(await find(u.seller, conv.id, 'chats')).toBeUndefined();
    expect(await find(u.seller, conv.id, 'archived')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    await send(u.buyer, conv.id, 'back again');
    expect(await find(u.seller, conv.id, 'chats')).toBeTruthy();

    await api('put', `/conversations/${conv.id}/archive`, u.seller).send({ archived: true });
    await api('put', `/conversations/${conv.id}/mute`, u.seller).send({ duration: 'always' });
    await new Promise((r) => setTimeout(r, 20));
    await send(u.buyer, conv.id, 'still muted');
    expect(await find(u.seller, conv.id, 'chats')).toBeUndefined();
    expect(await find(u.seller, conv.id, 'archived')).toBeTruthy();
    await api('put', `/conversations/${conv.id}/mute`, u.seller).send({ duration: 'off' });
    await api('put', `/conversations/${conv.id}/archive`, u.seller).send({ archived: false });
  });
});

describe('delete for me', () => {
  it('hides one message for me only', async () => {
    const conv = await openChat(u.buyer, u.seller);
    const msg = (await send(u.buyer, conv.id, 'only the buyer deletes this')).body;
    expect((await api('delete', `/${msg.id}/for-me`, u.seller)).status).toBe(200);
    const sellerView = (await api('get', `/conversations/${conv.id}/messages`, u.seller)).body;
    const buyerView = (await api('get', `/conversations/${conv.id}/messages`, u.buyer)).body;
    expect(sellerView.some((m) => m.id === msg.id)).toBe(false);
    expect(buyerView.some((m) => m.id === msg.id)).toBe(true);
    expect((await api('delete', `/${msg.id}/for-me`, u.newcomer)).status).toBe(404);
  });

  it('deleting the chat for me hides its history until someone writes again', async () => {
    const conv = await openChat(u.friend, u.buyer);
    await send(u.friend, conv.id, 'old news');
    expect((await api('delete', `/conversations/${conv.id}/for-me`, u.buyer)).status).toBe(200);
    expect(await find(u.buyer, conv.id)).toBeUndefined();
    expect((await api('get', `/conversations/${conv.id}/messages`, u.buyer)).body).toHaveLength(0);
    expect((await api('get', `/conversations/${conv.id}/messages`, u.friend)).body.length).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 20));
    await send(u.friend, conv.id, 'fresh start');
    const back = await find(u.buyer, conv.id);
    expect(back).toMatchObject({ last_message: 'fresh start', unread_count: 1 });
    expect((await api('get', `/conversations/${conv.id}/messages`, u.buyer)).body.map((m) => m.content)).toEqual(['fresh start']);
  });

  it('"Clear history" clears it for me, not for the other person', async () => {
    const conv = await openChat(u.buyer, u.seller);
    await send(u.buyer, conv.id, 'keep this for the seller');
    await api('delete', `/conversations/${conv.id}/history`, u.buyer);
    expect((await api('get', `/conversations/${conv.id}/messages`, u.buyer)).body).toHaveLength(0);
    expect((await api('get', `/conversations/${conv.id}/messages`, u.seller)).body.some((m) => m.content === 'keep this for the seller')).toBe(true);
  });
});

describe('privacy settings', () => {
  it('saves read receipts and last seen', async () => {
    const res = await request(app).put('/api/social/privacy').set(auth(u.friend)).send({ read_receipts: false, presence_visibility: 'nobody' });
    expect(res.body).toMatchObject({ read_receipts: false, presence_visibility: 'nobody' });
    expect((await request(app).put('/api/social/privacy').set(auth(u.friend)).send({ presence_visibility: 'contacts' })).status).toBe(422);
    expect((await request(app).get('/api/social/privacy').set(auth(u.friend))).body).toMatchObject({ read_receipts: false, presence_visibility: 'nobody' });
  });
});
