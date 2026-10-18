'use strict';

/** Editing and deleting your own post, against real rows. */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser, tag } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/posts', require('../../routes/posts'));
  return app;
}

let app; let owner; let other; let admin;
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });

async function createPost(authorId, content, imageUrl = null) {
  const res = await request(app).post('/api/posts').set(auth({ id: authorId }))
    .send({ content, image_url: imageUrl, post_type: imageUrl ? 'image' : 'text' });
  expect(res.status).toBe(201);
  // Hashtag linking runs after the response; wait for it so counts are stable.
  await new Promise((resolve) => setTimeout(resolve, 200));
  return res.body;
}

const hashtagCount = async (name) =>
  (await pool.query('SELECT post_count FROM hashtags WHERE name = $1', [name])).rows[0]?.post_count ?? 0;

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  other = await createUser();
  admin = await createUser();
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
});

afterAll(async () => {
  for (const user of [owner, other, admin]) await deleteUser(user.id);
});

describe('PUT /api/posts/:id', () => {
  it('lets the author edit the caption, sets edited_at and re-syncs hashtags', async () => {
    const t = tag();
    const post = await createPost(owner.id, `first #old${t}`);
    expect(post.edited_at ?? null).toBeNull();
    expect(await hashtagCount(`old${t}`)).toBe(1);

    const res = await request(app).put(`/api/posts/${post.id}`).set(auth(owner)).send({ content: `second #new${t}` });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe(`second #new${t}`);
    expect(res.body.edited_at).toBeTruthy();
    expect(await hashtagCount(`old${t}`)).toBe(0);
    expect(await hashtagCount(`new${t}`)).toBe(1);
  });

  it('allows an empty caption on a photo post but not on a text post', async () => {
    const photo = await createPost(owner.id, 'photo caption', 'https://example.test/a.jpg');
    expect((await request(app).put(`/api/posts/${photo.id}`).set(auth(owner)).send({ content: '' })).status).toBe(200);

    const text = await createPost(owner.id, 'only text');
    expect((await request(app).put(`/api/posts/${text.id}`).set(auth(owner)).send({ content: '  ' })).status).toBe(422);
    expect((await request(app).put(`/api/posts/${photo.id}`).set(auth(owner)).send({ image_url: null })).status).toBe(422);
  });

  it('refuses other members and lets admins edit', async () => {
    const post = await createPost(owner.id, 'not yours');
    expect((await request(app).put(`/api/posts/${post.id}`).set(auth(other)).send({ content: 'hijack' })).status).toBe(403);
    expect((await request(app).put(`/api/posts/${post.id}`).send({ content: 'guest' })).status).toBe(401);
    expect((await request(app).put(`/api/posts/${post.id}`).set(auth(admin)).send({ content: 'moderated' })).status).toBe(200);
  });
});

describe('DELETE /api/posts/:id', () => {
  it('refuses other members', async () => {
    const post = await createPost(owner.id, 'keep me');
    expect((await request(app).delete(`/api/posts/${post.id}`).set(auth(other))).status).toBe(403);
    expect((await pool.query('SELECT 1 FROM posts WHERE id = $1', [post.id])).rowCount).toBe(1);
  });

  it('removes the post with its likes, saves and hashtag counts', async () => {
    const t = tag();
    const post = await createPost(owner.id, `bye #gone${t}`);
    await pool.query("INSERT INTO likes (target_id, target_type, user_id) VALUES ($1, 'post', $2)", [post.id, other.id]);
    await pool.query("INSERT INTO saves (target_id, target_type, user_id) VALUES ($1, 'post', $2)", [post.id, other.id]);

    const res = await request(app).delete(`/api/posts/${post.id}`).set(auth(owner));
    expect(res.status).toBe(200);
    expect((await pool.query('SELECT 1 FROM posts WHERE id = $1', [post.id])).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM likes WHERE target_id = $1', [post.id])).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM saves WHERE target_id = $1', [post.id])).rowCount).toBe(0);
    expect(await hashtagCount(`gone${t}`)).toBe(0);
  });

  it('lets admins delete any post', async () => {
    const post = await createPost(owner.id, 'moderate me');
    expect((await request(app).delete(`/api/posts/${post.id}`).set(auth(admin))).status).toBe(200);
  });
});
