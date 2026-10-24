'use strict';

/**
 * Feed Spotlight section lists must be stored as JSON arrays. Passing a JS
 * array to node-pg stored [] as the object {} (which crashed the feed) and
 * failed for non-empty lists. migrate78 repairs rows already written. Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');
const migrate78 = require('../../db/migrate78');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/showrooms', require('../../routes/showrooms'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const stored = async (id) => (await pool.query(
  'SELECT spotlight_section_ids AS ids, jsonb_typeof(spotlight_section_ids) AS kind FROM showrooms WHERE id=$1', [id],
)).rows[0];

let app; let owner; let biz;
beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  biz = await createPublicBusiness(owner.id);
});
afterAll(async () => { await deleteUser(owner.id); });

describe('PATCH /api/showrooms/:id/spotlight', () => {
  it('stores chosen sections as a JSON array', async () => {
    const res = await request(app).patch(`/api/showrooms/${biz.siteId}/spotlight`).set(auth(owner))
      .send({ spotlight_mode: 'carousel', spotlight_section_ids: ['menu', 'about'], spotlight_carousel_count: 2 });
    expect(res.status).toBe(200);
    expect(await stored(biz.siteId)).toEqual({ ids: ['menu', 'about'], kind: 'array' });
  });

  it('stores an empty choice as [], not {}', async () => {
    const res = await request(app).patch(`/api/showrooms/${biz.siteId}/spotlight`).set(auth(owner))
      .send({ spotlight_mode: 'single', spotlight_section_ids: [] });
    expect(res.status).toBe(200);
    expect(await stored(biz.siteId)).toEqual({ ids: [], kind: 'array' });
  });
});

describe('migrate78', () => {
  it('resets a stored object to an empty list and is idempotent', async () => {
    await pool.query(`UPDATE showrooms SET spotlight_section_ids = '{}'::jsonb WHERE id=$1`, [biz.siteId]);
    await migrate78(pool);
    expect(await stored(biz.siteId)).toEqual({ ids: [], kind: 'array' });
    await expect(migrate78(pool)).resolves.toBeUndefined();
  });
});
