'use strict';

/**
 * Messages against a real Postgres: who can message whom, content limits,
 * edit/delete windows, the /api/messages/:id paths the app calls, groups,
 * channels, inquiries, forwarding, and that recipients really get a
 * notification row (it silently failed on every send until October 2026).
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

let app;
const users = {};
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });
const api = (method, path, u) => request(app)[method](`/api/messages${path}`).set(auth(u));

async function waitFor(check, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > end) return value;
    await new Promise((r) => setTimeout(r, 50));
  }
}
const setPolicy = (u, policy) => pool.query('UPDATE user_profiles SET message_policy=$1 WHERE user_id=$2', [policy, u.id]);
const follow = (a, b) => pool.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [a.id, b.id]);
const blockRow = (a, b) => pool.query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [a.id, b.id]);
const dm = async (a, b) => (await api('post', '/conversations/find-or-create', a).send({ target_user_id: b.id })).body;
const send = (u, convId, body) => api('post', `/conversations/${convId}/messages`, u).send(typeof body === 'string' ? { content: body } : body);

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/messages', require('../../routes/messages'));
  for (const name of ['buyer', 'seller', 'friend', 'stranger', 'quiet', 'fan']) users[name] = await createUser();
});

afterAll(async () => {
  for (const u of Object.values(users)) await deleteUser(u.id);
});

describe('starting a one-to-one chat', () => {
  it('creates it once and reopens the same chat after that', async () => {
    const first = await api('post', '/conversations/find-or-create', users.buyer).send({ target_user_id: users.seller.id });
    expect(first.status).toBe(201);
    expect(first.body.type).toBe('dm');
    const again = await api('post', '/conversations/find-or-create', users.seller).send({ target_user_id: users.buyer.id });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    const { rows } = await pool.query('SELECT user_id FROM conversation_participants WHERE conversation_id=$1', [first.body.id]);
    expect(rows.map((r) => r.user_id).sort()).toEqual([users.buyer.id, users.seller.id].sort());
  });

  it('follows "who can message me" and explains why not', async () => {
    await setPolicy(users.quiet, 'nobody');
    const nobody = await api('post', '/conversations/find-or-create', users.buyer).send({ target_user_id: users.quiet.id });
    expect(nobody.status).toBe(403);
    expect(nobody.body).toMatchObject({ error: 'messages_not_allowed', message: expect.stringMatching(/isn.t taking new messages/) });

    await setPolicy(users.fan, 'followers');
    const notFollowing = await api('post', '/conversations/find-or-create', users.buyer).send({ target_user_id: users.fan.id });
    expect(notFollowing.status).toBe(403);
    await follow(users.buyer, users.fan);
    const following = await api('post', '/conversations/find-or-create', users.buyer).send({ target_user_id: users.fan.id });
    expect(following.status).toBe(201);
  });

  it('answers 404 for someone who does not exist and 422 for yourself', async () => {
    expect((await api('post', '/conversations/find-or-create', users.buyer).send({ target_user_id: '00000000-0000-4000-8000-000000000000' })).status).toBe(404);
    expect((await api('post', '/conversations/find-or-create', users.buyer).send({ target_user_id: users.buyer.id })).status).toBe(422);
  });
});

describe('sending', () => {
  it('saves the message, updates the chat list and notifies the other person', async () => {
    const conv = await dm(users.buyer, users.seller);
    const res = await send(users.buyer, conv.id, '  Is the coffee still available?  ');
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Is the coffee still available?');
    const { rows: [c] } = await pool.query('SELECT last_message, last_message_at FROM conversations WHERE id=$1', [conv.id]);
    expect(c.last_message).toBe('Is the coffee still available?');
    expect(c.last_message_at).not.toBeNull();
    const note = await waitFor(async () => (await pool.query(
      "SELECT * FROM notifications WHERE user_id=$1 AND type='message' AND link=$2", [users.seller.id, `/messages/${conv.id}`],
    )).rows[0]);
    expect(note).toMatchObject({ title: 'DB Test', body: 'Is the coffee still available?', is_read: false });
    const { rows: own } = await pool.query("SELECT 1 FROM notifications WHERE user_id=$1 AND link=$2", [users.buyer.id, `/messages/${conv.id}`]);
    expect(own).toHaveLength(0);
  });

  it('refuses empty, too long, unsafe attachments and replies from another chat', async () => {
    const conv = await dm(users.buyer, users.seller);
    expect((await send(users.buyer, conv.id, '   ')).status).toBe(422);
    expect((await send(users.buyer, conv.id, 'x'.repeat(4001))).status).toBe(422);
    expect((await send(users.buyer, conv.id, { type: 'image', content: 'javascript:alert(1)' })).status).toBe(422);
    expect((await send(users.buyer, conv.id, { type: 'image', content: 'https://cdn.example.test/p.jpg' })).status).toBe(201);
    const other = await dm(users.buyer, users.friend);
    const elsewhere = (await send(users.buyer, other.id, 'hello friend')).body;
    expect((await send(users.buyer, conv.id, { content: 'replying', reply_to_id: elsewhere.id })).status).toBe(422);
  });

  it('keeps outsiders out', async () => {
    const conv = await dm(users.buyer, users.seller);
    expect((await send(users.stranger, conv.id, 'let me in')).status).toBe(403);
    expect((await api('get', `/conversations/${conv.id}/messages`, users.stranger)).status).toBe(403);
    expect((await api('get', '/conversations/not-a-uuid/messages', users.buyer)).status).toBe(404);
  });

  it('stops a one-to-one chat when either person blocks the other', async () => {
    const conv = await dm(users.friend, users.stranger);
    await blockRow(users.stranger, users.friend);
    const res = await send(users.friend, conv.id, 'hi?');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('messages_not_allowed');
    const status = await api('get', `/block/${users.stranger.id}`, users.friend);
    expect(status.body).toEqual({ blocked: false, blocked_me: true });
    await pool.query('DELETE FROM blocks WHERE blocker_id=$1', [users.stranger.id]);
  });
});

describe('editing and deleting (the paths the app calls)', () => {
  it('edits your own text within 15 minutes at /api/messages/:id', async () => {
    const conv = await dm(users.buyer, users.seller);
    const msg = (await send(users.buyer, conv.id, 'Price?')).body;
    expect((await api('put', `/${msg.id}`, users.seller).send({ content: 'hacked' })).status).toBe(403);
    const edited = await api('put', `/${msg.id}`, users.buyer).send({ content: 'What is the price?' });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ content: 'What is the price?', edited: true });
    const { rows: [c] } = await pool.query('SELECT last_message FROM conversations WHERE id=$1', [conv.id]);
    expect(c.last_message).toBe('What is the price?');
    await pool.query("UPDATE messages SET created_at = NOW() - INTERVAL '16 minutes' WHERE id=$1", [msg.id]);
    expect((await api('put', `/${msg.id}`, users.buyer).send({ content: 'late' })).status).toBe(422);
  });

  it('deletes for everyone within 24 hours and refreshes the chat list', async () => {
    const conv = await dm(users.buyer, users.seller);
    await send(users.buyer, conv.id, 'first');
    const second = (await send(users.buyer, conv.id, 'second')).body;
    expect((await api('delete', `/${second.id}`, users.seller)).status).toBe(403);
    expect((await api('delete', `/${second.id}`, users.buyer)).status).toBe(200);
    const { rows: [c] } = await pool.query('SELECT last_message FROM conversations WHERE id=$1', [conv.id]);
    expect(c.last_message).toBe('first');
    const old = (await send(users.buyer, conv.id, 'old')).body;
    await pool.query("UPDATE messages SET created_at = NOW() - INTERVAL '25 hours' WHERE id=$1", [old.id]);
    expect((await api('delete', `/${old.id}`, users.buyer)).status).toBe(422);
  });

  it('still answers at the older /api/messages/messages/:id path', async () => {
    const conv = await dm(users.buyer, users.seller);
    const msg = (await send(users.buyer, conv.id, 'old path')).body;
    expect((await api('put', `/messages/${msg.id}`, users.buyer).send({ content: 'old path, edited' })).status).toBe(200);
    expect((await api('delete', `/messages/${msg.id}`, users.buyer)).status).toBe(200);
  });
});

describe('groups and channels', () => {
  it('creates a group with real members and roles, never a disguised one-to-one chat', async () => {
    expect((await api('post', '/conversations', users.buyer).send({ type: 'dm', participant_ids: [users.seller.id] })).status).toBe(422);
    expect((await api('post', '/conversations', users.buyer).send({ name: 'G', participant_ids: ['00000000-0000-4000-8000-000000000000'] })).status).toBe(422);
    expect((await api('post', '/conversations', users.buyer).send({ participant_ids: [users.seller.id] })).status).toBe(422); // no name
    const res = await api('post', '/conversations', users.buyer).send({ name: 'Coffee lovers', participant_ids: [users.seller.id, users.friend.id] });
    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT user_id, role FROM conversation_participants WHERE conversation_id=$1', [res.body.id]);
    expect(Object.fromEntries(rows.map((r) => [r.user_id, r.role]))).toEqual({ [users.buyer.id]: 'admin', [users.seller.id]: 'member', [users.friend.id]: 'member' });
    expect(JSON.parse(res.body.participant_ids)).toHaveLength(3);
  });

  it('can only add people you could message', async () => {
    await setPolicy(users.quiet, 'nobody');
    const create = await api('post', '/conversations', users.buyer).send({ name: 'Quiet', participant_ids: [users.quiet.id] });
    expect(create.status).toBe(403);
    const group = (await api('post', '/conversations', users.buyer).send({ name: 'Open', participant_ids: [users.seller.id] })).body;
    expect((await api('post', `/conversations/${group.id}/members`, users.seller).send({ user_id: users.friend.id })).status).toBe(403); // not admin
    expect((await api('post', `/conversations/${group.id}/members`, users.buyer).send({ user_id: users.quiet.id })).status).toBe(403);
    expect((await api('post', `/conversations/${group.id}/members`, users.buyer).send({ user_id: users.friend.id })).status).toBe(200);
    expect((await api('post', `/conversations/${group.id}/members`, users.buyer).send({ user_id: users.friend.id })).status).toBe(409);
  });

  it('notifies every member and names the group', async () => {
    const group = (await api('post', '/conversations', users.buyer).send({ name: 'Market day', participant_ids: [users.seller.id, users.friend.id] })).body;
    await send(users.seller, group.id, 'See you at 9');
    const notes = await waitFor(async () => {
      const { rows } = await pool.query('SELECT user_id, title FROM notifications WHERE link=$1', [`/messages/${group.id}`]);
      return rows.length === 2 ? rows : null;
    });
    expect(notes.map((n) => n.user_id).sort()).toEqual([users.buyer.id, users.friend.id].sort());
    expect(notes[0].title).toBe('DB Test in Market day');
  });

  it('hands the group to someone else when the last admin leaves; removed people lose access', async () => {
    const group = (await api('post', '/conversations', users.buyer).send({ name: 'Handover', participant_ids: [users.seller.id, users.friend.id] })).body;
    expect((await api('post', `/conversations/${group.id}/leave`, users.buyer)).status).toBe(200);
    const { rows } = await pool.query("SELECT user_id FROM conversation_participants WHERE conversation_id=$1 AND role='admin'", [group.id]);
    expect(rows).toHaveLength(1);
    const newAdmin = Object.values(users).find((u) => u.id === rows[0].user_id);
    const other = newAdmin.id === users.seller.id ? users.friend : users.seller;
    expect((await api('delete', `/conversations/${group.id}/members/${other.id}`, newAdmin)).status).toBe(200);
    expect((await send(other, group.id, 'still here?')).status).toBe(403);
  });

  it('lets only admins post in a channel', async () => {
    const channel = (await api('post', '/conversations', users.seller).send({ type: 'channel', name: 'Deals', participant_ids: [users.buyer.id] })).body;
    expect((await send(users.buyer, channel.id, 'me too')).status).toBe(403);
    expect((await send(users.seller, channel.id, 'Today: 10% off')).status).toBe(201);
  });

  it('one-to-one chats cannot be left, renamed or deleted for both people', async () => {
    const conv = await dm(users.buyer, users.seller);
    expect((await api('post', `/conversations/${conv.id}/leave`, users.buyer)).status).toBe(422);
    expect((await api('put', `/conversations/${conv.id}`, users.buyer).send({ name: 'x' })).status).toBe(422);
    expect((await api('delete', `/conversations/${conv.id}`, users.buyer)).status).toBe(422);
  });
});

describe('inquiries ("Get a quote")', () => {
  it('opens a chat the seller can see, with a summary and a notification without the buyer\'s email', async () => {
    const res = await api('post', '/inquiry', users.stranger).send({ receiver_id: users.seller.id, subject: 'Catering for 50', body: 'Can you do Saturday?' });
    expect(res.status).toBe(201);
    const { rows: [c] } = await pool.query('SELECT last_message, type FROM conversations WHERE id=$1', [res.body.conversation_id]);
    expect(c.type).toBe('dm');
    expect(c.last_message).toMatch(/Catering for 50/);
    const note = await waitFor(async () => (await pool.query('SELECT * FROM notifications WHERE user_id=$1 AND link=$2', [users.seller.id, `/messages/${res.body.conversation_id}`])).rows[0]);
    expect(note).toBeTruthy();
    expect(`${note.title} ${note.body}`).not.toContain(users.stranger.email);
  });

  it('follows the same rules as any first message', async () => {
    await setPolicy(users.quiet, 'nobody');
    expect((await api('post', '/inquiry', users.buyer).send({ receiver_id: users.quiet.id, body: 'Hello' })).status).toBe(403);
    expect((await api('post', '/inquiry', users.buyer).send({ receiver_id: '00000000-0000-4000-8000-000000000000', body: 'Hello' })).status).toBe(404);
    expect((await api('post', '/inquiry', users.buyer).send({ receiver_id: users.seller.id, body: '' })).status).toBe(422);
  });
});

describe('forwarding and blocking', () => {
  it('does not forward into a chat where you are blocked', async () => {
    const source = await dm(users.buyer, users.seller);
    const msg = (await send(users.buyer, source.id, 'forward me')).body;
    const target = await dm(users.buyer, users.friend);
    await blockRow(users.friend, users.buyer);
    expect((await api('post', `/${msg.id}/forward`, users.buyer).send({ target_conversation_id: target.id })).status).toBe(403);
    await pool.query('DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [users.friend.id, users.buyer.id]);
    expect((await api('post', `/${msg.id}/forward`, users.buyer).send({ target_conversation_id: target.id })).status).toBe(201);
  });

  it('blocking from a chat also ends follows both ways, like the social block', async () => {
    await follow(users.fan, users.stranger);
    await follow(users.stranger, users.fan);
    expect((await api('post', `/block/${users.stranger.id}`, users.fan)).status).toBe(200);
    const { rows } = await pool.query('SELECT 1 FROM follows WHERE (follower_id=$1 AND followed_id=$2) OR (follower_id=$2 AND followed_id=$1)', [users.fan.id, users.stranger.id]);
    expect(rows).toHaveLength(0);
    expect((await api('post', '/block/00000000-0000-4000-8000-000000000000', users.fan)).status).toBe(404);
    await api('delete', `/block/${users.stranger.id}`, users.fan);
  });
});
