'use strict';

/**
 * Search finds businesses and sites nearest first, within a radius, with
 * distances rounded to 0.5 km; private and unpaid businesses stay out.
 * Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser, tag } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/search', require('../../routes/search'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const HERE = { lat: 9.03, lon: 38.75 };
const word = `zq${tag()}`; // a word only these test businesses contain

let app; let member; let owners = []; let nearBiz; let farBiz; let privateBiz; let unpaidBiz;

async function named(ownerId, opts, lat, lon) {
  const { businessId } = await createPublicBusiness(ownerId, opts);
  await pool.query('UPDATE businesses SET business_name=$2, business_category=$3, latitude=$4, longitude=$5 WHERE id=$1', [businessId, `Hotel ${word} ${tag()}`, 'Hospitality & Tourism', lat, lon]);
  await pool.query('UPDATE showrooms SET title=$2 WHERE business_id=$1', [businessId, `Hotel ${word} site ${tag()}`]);
  return businessId;
}

beforeAll(async () => {
  app = buildApp();
  member = await createUser();
  owners = await Promise.all([createUser(), createUser(), createUser(), createUser()]);
  farBiz = await named(owners[0].id, {}, 9.05, 38.80); // ~5.8 km
  nearBiz = await named(owners[1].id, {}, 9.031, 38.751); // ~0.15 km
  privateBiz = await named(owners[2].id, { visibility: 'private' }, 9.032, 38.752);
  const { rows: [u] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category, visibility, latitude, longitude) VALUES ($1, $2, 'shop', 'public', 9.031, 38.751) RETURNING id`,
    [owners[3].id, `Hotel ${word} unpaid`],
  );
  unpaidBiz = u.id;
});

afterAll(async () => {
  await deleteUser(member.id);
  for (const o of owners) await deleteUser(o.id);
});

const search = (params, headers = {}) => request(app).get('/api/search').query({ q: word, ...params }).set(headers);

describe('search: businesses near you', () => {
  it('lists businesses nearest first with rounded distances', async () => {
    const res = await search({ type: 'businesses', sort: 'distance', ...HERE }, auth(member));
    expect(res.status).toBe(200);
    const ids = res.body.businesses.map((b) => b.id);
    expect(ids.indexOf(nearBiz)).toBeLessThan(ids.indexOf(farBiz));
    const near = res.body.businesses.find((b) => b.id === nearBiz);
    expect(near.distance_km).toBe(0.5);
    expect(near.latitude).toBeUndefined();
  });

  it('keeps to the radius', async () => {
    const res = await search({ type: 'businesses', sort: 'distance', radius_km: 2, ...HERE }, auth(member));
    const ids = res.body.businesses.map((b) => b.id);
    expect(ids).toContain(nearBiz);
    expect(ids).not.toContain(farBiz);
  });

  it('leaves out unpaid businesses, and private ones for guests', async () => {
    const asMember = (await search({ type: 'businesses' }, auth(member))).body.businesses.map((b) => b.id);
    expect(asMember).toContain(privateBiz);
    expect(asMember).not.toContain(unpaidBiz);
    const asGuest = (await search({ type: 'businesses' })).body.businesses.map((b) => b.id);
    expect(asGuest).not.toContain(privateBiz);
    expect(asGuest).not.toContain(unpaidBiz);
  });

  it('gives sites a distance from their business pin', async () => {
    const res = await search({ type: 'showrooms', sort: 'distance', ...HERE }, auth(member));
    const sites = res.body.showrooms.filter((s) => [nearBiz, farBiz].includes(s.business_id));
    expect(sites.map((s) => s.business_id)).toEqual([nearBiz, farBiz]);
    expect(sites[0].distance_km).toBe(0.5);
  });

  it('ignores an unknown sort and an out-of-range radius', async () => {
    const res = await search({ type: 'businesses', sort: 'drop table', radius_km: 9999, ...HERE }, auth(member));
    expect(res.status).toBe(200);
    expect(res.body.businesses.map((b) => b.id)).toContain(farBiz);
  });
});
