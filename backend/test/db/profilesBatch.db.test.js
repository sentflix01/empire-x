'use strict';

/**
 * GET /api/profiles?user_ids=a,b,c — several owners' profiles in one request
 * (performance audit 2026-11-09: the Businesses page made one request per
 * owner). Guests get exactly the profiles GET /api/profiles/by-user/:id would
 * give them: owners with a public business only.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

let app; let owner; let privateOwner; let person; let viewer;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/profiles', require('../../routes/profiles'));
  [owner, privateOwner, person, viewer] = [await createUser(), await createUser(), await createUser(), await createUser()];
  await createPublicBusiness(owner.id);
  await createPublicBusiness(privateOwner.id, { visibility: 'private' });
});

afterAll(async () => {
  for (const u of [owner, privateOwner, person, viewer]) {
    await pool.query('DELETE FROM products WHERE seller_id = $1', [u.id]);
    await deleteUser(u.id);
  }
});

const batch = (ids, user) => {
  const req = request(app).get(`/api/profiles?user_ids=${ids.join(',')}&limit=${ids.length}`);
  return user ? req.set('Authorization', `Bearer ${accessToken(user.id)}`) : req;
};
const userIds = (res) => res.body.map((p) => p.user_id).sort();

it('gives guests the same profiles the one-by-one route does', async () => {
  const all = [owner.id, privateOwner.id, person.id];
  const res = await batch(all);
  expect(res.status).toBe(200);
  const oneByOne = [];
  for (const id of all) {
    const r = await request(app).get(`/api/profiles/by-user/${id}`);
    if (r.status === 200) oneByOne.push(id);
  }
  expect(userIds(res)).toEqual(oneByOne.sort());
  expect(userIds(res)).toEqual([owner.id]);
});

it('gives signed-in people every requested profile, without private fields', async () => {
  const res = await batch([owner.id, privateOwner.id, person.id], viewer);
  expect(res.status).toBe(200);
  expect(userIds(res)).toEqual([owner.id, privateOwner.id, person.id].sort());
  for (const p of res.body) expect(p).not.toHaveProperty('email');
});

it('rejects malformed or too many ids', async () => {
  expect((await batch(['not-a-uuid'])).status).toBe(400);
  const many = Array.from({ length: 101 }, () => require('crypto').randomUUID());
  expect((await batch(many)).status).toBe(400);
});
