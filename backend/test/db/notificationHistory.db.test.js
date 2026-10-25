'use strict';

/**
 * Notification history: the page asks for the last 7 days at once
 * (`days=7`), newest first, and pages further back with `cursor`.
 * Nothing deletes notifications, so a week (and more) is always there.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

let app; let user;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });
const at = (daysAgo, hours = 0) => new Date(Date.now() - daysAgo * 86_400_000 - hours * 3_600_000).toISOString();

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/notifications', require('../../routes/notifications'));
  user = await createUser();
  // 40 in the last week (more than the old 30-item page), and 3 older ones.
  for (let i = 0; i < 40; i++) {
    await pool.query("INSERT INTO notifications (user_id, type, title, is_read, created_at) VALUES ($1, 'order', $2, $3, $4)", [user.id, `recent ${i}`, i % 2 === 0, at(i * 0.15)]);
  }
  for (const d of [8, 10, 20]) {
    await pool.query("INSERT INTO notifications (user_id, type, title, is_read, created_at) VALUES ($1, 'order', $2, TRUE, $3)", [user.id, `old ${d}d`, at(d)]);
  }
});
afterAll(async () => { await deleteUser(user.id); });

it('returns the whole last week, newest first', async () => {
  const res = await request(app).get('/api/notifications').query({ days: 7, limit: 500 }).set(auth(user));
  expect(res.status).toBe(200);
  expect(res.body.notifications).toHaveLength(40);
  const times = res.body.notifications.map((n) => new Date(n.created_at).getTime());
  expect([...times].sort((a, b) => b - a)).toEqual(times);
  expect(res.body.notifications.some((n) => n.title.startsWith('old'))).toBe(false);
});

it('pages back past the week with a cursor', async () => {
  const week = (await request(app).get('/api/notifications').query({ days: 7, limit: 500 }).set(auth(user))).body.notifications;
  const older = await request(app).get('/api/notifications').query({ cursor: week[week.length - 1].created_at, limit: 50 }).set(auth(user));
  expect(older.body.notifications.map((n) => n.title)).toEqual(['old 8d', 'old 10d', 'old 20d']);
  const none = await request(app).get('/api/notifications').query({ cursor: older.body.notifications[2].created_at, limit: 50 }).set(auth(user));
  expect(none.body.notifications).toEqual([]);
  expect(none.body.next_cursor).toBeNull();
});

it('refuses a nonsense range', async () => {
  expect((await request(app).get('/api/notifications').query({ days: 0 }).set(auth(user))).status).toBe(422);
  expect((await request(app).get('/api/notifications').query({ days: 365 }).set(auth(user))).status).toBe(422);
});
