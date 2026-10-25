'use strict';

/**
 * Live chat over Socket.IO against a real Postgres: only members hear a chat,
 * people removed from a group stop hearing it at once, typing respects blocks
 * and is throttled, refresh tokens can't open a socket, and a ban really
 * closes the connection.
 */
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const request = require('supertest');
const { io: connect } = require('socket.io-client');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

const socketModule = require('../../socket');
let server; let url; let app;
const users = {};
const clients = [];
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });

function open(user, token = accessToken(user.id)) {
  return new Promise((resolve, reject) => {
    const c = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
    clients.push(c);
    c.once('connect', () => resolve(c));
    c.once('connect_error', (err) => reject(err));
  });
}
/** Resolves with the next `event`, or null after `ms`. */
const next = (c, event, ms = 800) => new Promise((resolve) => {
  const t = setTimeout(() => { c.off(event, on); resolve(null); }, ms);
  const on = (payload) => { clearTimeout(t); resolve(payload); };
  c.once(event, on);
});
const settle = (ms = 150) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/messages', require('../../routes/messages'));
  server = http.createServer(app);
  socketModule.initSocket(server, ['http://localhost']);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}`;
  for (const name of ['a', 'b', 'c', 'banned']) users[name] = await createUser();
});

afterEach(() => { while (clients.length) clients.pop().close(); });

afterAll(async () => {
  socketModule.getIO()?.close();
  await new Promise((r) => server.close(r));
  for (const u of Object.values(users)) await deleteUser(u.id);
});

const http_ = (method, path, u) => request(app)[method](`/api/messages${path}`).set(auth(u));

it('refuses a socket without a token or with a refresh token', async () => {
  await expect(open(users.a, '')).rejects.toThrow(/Authentication required/);
  const refresh = jwt.sign({ sub: users.a.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '5m', jwtid: crypto.randomUUID() });
  await expect(open(users.a, refresh)).rejects.toThrow(/Invalid token/);
});

it('delivers a message live only to members who joined the chat', async () => {
  const conv = (await http_('post', '/conversations/find-or-create', users.a).send({ target_user_id: users.b.id })).body;
  const [b, outsider] = [await open(users.b), await open(users.c)];
  b.emit('join_conversation', conv.id);
  outsider.emit('join_conversation', conv.id); // not a member: never joins
  await settle();
  const heardByB = next(b, 'new_message');
  const heardByOutsider = next(outsider, 'new_message');
  const noteForB = next(b, 'new_notification', 2000);
  await http_('post', `/conversations/${conv.id}/messages`, users.a).send({ content: 'live hello' });
  expect((await heardByB)?.content).toBe('live hello');
  expect(await heardByOutsider).toBeNull();
  expect(await noteForB).toMatchObject({ type: 'message', body: 'live hello', link: `/messages/${conv.id}` });
});

it('stops live messages the moment someone is removed from a group', async () => {
  const group = (await http_('post', '/conversations', users.a).send({ name: 'Live group', participant_ids: [users.b.id, users.c.id] })).body;
  const c = await open(users.c);
  c.emit('join_conversation', group.id);
  await settle();
  const first = next(c, 'new_message');
  await http_('post', `/conversations/${group.id}/messages`, users.a).send({ content: 'before' });
  expect((await first)?.content).toBe('before');
  expect((await http_('delete', `/conversations/${group.id}/members/${users.c.id}`, users.a)).status).toBe(200);
  await settle();
  const after = next(c, 'new_message');
  await http_('post', `/conversations/${group.id}/messages`, users.a).send({ content: 'after' });
  expect(await after).toBeNull();
});

it('shows typing, throttles repeats, and hides it when blocked', async () => {
  const conv = (await http_('post', '/conversations/find-or-create', users.b).send({ target_user_id: users.c.id })).body;
  const [b, c] = [await open(users.b), await open(users.c)];
  b.emit('join_conversation', conv.id); c.emit('join_conversation', conv.id);
  await settle();
  const first = next(c, 'typing_updated');
  b.emit('typing', { conversationId: conv.id, isTyping: true });
  expect(await first).toMatchObject({ conversation_id: conv.id, user_id: users.b.id, is_typing: true });
  const repeat = next(c, 'typing_updated', 500);
  b.emit('typing', { conversationId: conv.id, isTyping: true });
  expect(await repeat).toBeNull();
  const stop = next(c, 'typing_updated');
  b.emit('typing', { conversationId: conv.id, isTyping: false });
  expect((await stop)?.is_typing).toBe(false);

  await pool.query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)', [users.c.id, users.b.id]);
  await new Promise((r) => setTimeout(r, 3100));
  const blocked = next(c, 'typing_updated', 600);
  b.emit('typing', { conversationId: conv.id, isTyping: true });
  expect(await blocked).toBeNull();
  await pool.query('DELETE FROM blocks WHERE blocker_id=$1', [users.c.id]);
}, 15000);

it('a ban closes the connection for real', async () => {
  const s = await open(users.banned);
  const closed = new Promise((r) => s.once('disconnect', r));
  socketModule.forceDisconnectUser(users.banned.id);
  await expect(closed).resolves.toBe('io server disconnect');
});

it('tells members and the removed person when the group changes (M6)', async () => {
  const group = (await http_('post', '/conversations', users.a).send({ name: 'Live roles', participant_ids: [users.b.id, users.c.id] })).body;
  const [b, c] = [await open(users.b), await open(users.c)];
  b.emit('join_conversation', group.id);
  c.emit('join_conversation', group.id);
  await settle();
  const bHearsRole = next(b, 'members_changed');
  expect((await http_('put', `/conversations/${group.id}/members/${users.b.id}`, users.a).send({ role: 'admin' })).status).toBe(200);
  expect(await bHearsRole).toEqual({ conversation_id: group.id });
  const cHearsRemoval = next(c, 'members_changed');
  const cListRefresh = next(c, 'conversation_updated');
  expect((await http_('delete', `/conversations/${group.id}/members/${users.c.id}`, users.b)).status).toBe(200);
  expect(await cHearsRemoval).toEqual({ conversation_id: group.id });
  expect(await cListRefresh).toEqual({ conversation_id: group.id });
  // c no longer hears the chat itself.
  const cHearsMessage = next(c, 'new_message');
  await http_('post', `/conversations/${group.id}/messages`, users.a).send({ content: 'after removal' });
  expect(await cHearsMessage).toBeNull();
});
