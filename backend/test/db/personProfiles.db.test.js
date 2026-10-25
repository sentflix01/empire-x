'use strict';

/**
 * A person can have several profile rows (personal + one per business).
 * Joining user_profiles on user_id used to repeat that person once per
 * profile: in chats, friends, stories, "who reacted" and the blocked list.
 * Every list shows them once, by their personal profile.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

jest.mock('../../routes/push', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

let app; let multi; let viewer;
const auth = (u) => ({ Authorization: `Bearer ${accessToken(u.id)}` });
const onlyMulti = (rows, key = 'user_id') => rows.filter((r) => String(r[key]) === String(multi.id));

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/posts', require('../../routes/posts'));
  app.use('/api/stories', require('../../routes/stories'));
  app.use('/api/friends', require('../../routes/friends'));
  app.use('/api/social', require('../../routes/social'));
  [multi, viewer] = [await createUser(), await createUser()];
  await pool.query("UPDATE user_profiles SET display_name='Nunu Personal' WHERE user_id=$1", [multi.id]);
  for (const n of ['Nunu Shop', 'Nunu Cafe']) {
    await pool.query("INSERT INTO user_profiles (user_id, display_name, profile_type) VALUES ($1, $2, 'business')", [multi.id, n]);
  }
});
afterAll(async () => { for (const u of [multi, viewer]) await deleteUser(u.id); });

it('stories: one row per story', async () => {
  const { rows: [story] } = await pool.query(
    "INSERT INTO stories (user_id, media_url, expires_at) VALUES ($1, 'https://img.example/s.jpg', NOW() + INTERVAL '1 day') RETURNING id", [multi.id],
  );
  const res = await request(app).get('/api/stories').set(auth(viewer));
  expect(res.status).toBe(200);
  const mine = res.body.filter((s) => s.id === story.id);
  expect(mine).toHaveLength(1);
  expect(mine[0].display_name).toBe('Nunu Personal');
});

it('who reacted to a post: each person once', async () => {
  const post = (await request(app).post('/api/posts').set(auth(viewer)).send({ content: 'Reactions please' })).body;
  expect((await request(app).put(`/api/posts/${post.id}/reaction`).set(auth(multi)).send({ reaction: '🔥' })).status).toBe(200);
  const res = await request(app).get(`/api/posts/${post.id}/reactions`).set(auth(viewer));
  expect(onlyMulti(res.body.people)).toHaveLength(1);
  expect(res.body.counts).toEqual({ '🔥': 1 });
});

it('friends (people who follow each other): each person once', async () => {
  await pool.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING', [multi.id, viewer.id]);
  const res = await request(app).get('/api/friends/mutual').set(auth(viewer));
  expect(res.status).toBe(200);
  const list = Array.isArray(res.body) ? res.body : res.body.friends ?? res.body.people ?? [];
  expect(onlyMulti(list)).toHaveLength(1);
});

it('the blocked list: each person once', async () => {
  await pool.query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [viewer.id, multi.id]);
  const res = await request(app).get('/api/social/people?kind=blocked').set(auth(viewer));
  if (!Array.isArray(res.body)) throw new Error(`blocked list: ${res.status} ${JSON.stringify(res.body)}`);
  expect(onlyMulti(res.body)).toHaveLength(1);
  expect(onlyMulti(res.body)[0].display_name).toBe('Nunu Personal');
});
