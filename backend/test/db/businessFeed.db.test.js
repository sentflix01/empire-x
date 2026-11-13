'use strict';

/**
 * The Business feed endpoint: nearest first, friend tags, the same visibility
 * rules as the business and site lists, rounded distances. Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser, tag } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/feed', require('../../routes/feed'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const HERE = { lat: 9.03, lon: 38.75 };

let app; let viewer; let near; let far; let nopin; let hidden; let unpaidOwner;
let nearBiz; let farBiz; let nopinBiz; let privateBiz; let unpaidBiz;

async function follow(a, b) {
  await pool.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [a.id, b.id]);
}

async function allItems(query, headers = {}) {
  const items = [];
  let offset = 0;
  for (let i = 0; i < 40 && offset !== null; i++) {
    const res = await request(app).get('/api/feed/businesses').query({ ...query, limit: 30, offset }).set(headers);
    expect(res.status).toBe(200);
    items.push(...res.body.items);
    offset = res.body.next_offset;
  }
  return items;
}
const bizIdOf = (item) => (item.type === 'business' ? item.record.id : item.record.business_id);

beforeAll(async () => {
  app = buildApp();
  [viewer, near, far, nopin, hidden, unpaidOwner] = await Promise.all([createUser(), createUser(), createUser(), createUser(), createUser(), createUser()]);
  ({ businessId: nearBiz } = await createPublicBusiness(near.id));
  ({ businessId: farBiz } = await createPublicBusiness(far.id));
  ({ businessId: nopinBiz } = await createPublicBusiness(nopin.id));
  ({ businessId: privateBiz } = await createPublicBusiness(hidden.id, { visibility: 'private' }));
  const { rows: [u] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category, visibility, latitude, longitude) VALUES ($1, $2, 'shop', 'public', 9.031, 38.751) RETURNING id`,
    [unpaidOwner.id, `DB Test Unpaid ${tag()}`],
  );
  unpaidBiz = u.id;
  await pool.query('UPDATE businesses SET latitude=9.031, longitude=38.751 WHERE id=$1', [nearBiz]); // ~0.15 km
  await pool.query('UPDATE businesses SET latitude=9.05, longitude=38.80 WHERE id=$1', [farBiz]); // ~5.8 km
  await pool.query('UPDATE businesses SET latitude=9.031, longitude=38.751 WHERE id=$1', [privateBiz]);
  await follow(viewer, near); await follow(near, viewer); // friends
  await follow(viewer, far); // following only
});

afterAll(async () => {
  for (const u of [viewer, near, far, nopin, hidden, unpaidOwner]) await deleteUser(u.id);
});

describe('GET /api/feed/businesses', () => {
  it('needs a point to sort by distance', async () => {
    const res = await request(app).get('/api/feed/businesses').query({ sort: 'nearest' });
    expect(res.status).toBe(400);
  });

  it('puts the nearest business first and those without a pin after the ones with one', async () => {
    const items = await allItems({ sort: 'nearest', ...HERE }, auth(viewer));
    const ids = items.map(bizIdOf);
    const iNear = ids.indexOf(nearBiz), iFar = ids.indexOf(farBiz), iNopin = ids.indexOf(nopinBiz);
    expect(iNear).toBeGreaterThanOrEqual(0);
    expect(iNear).toBeLessThan(iFar);
    expect(iFar).toBeLessThan(iNopin);
    const nearItem = items.find((i) => i.type === 'business' && i.record.id === nearBiz);
    expect(nearItem.distance_km).toBe(0.5);
    expect(items.find((i) => i.type === 'business' && i.record.id === farBiz).distance_km % 0.5).toBe(0);
    expect(items.find((i) => i.type === 'business' && i.record.id === nopinBiz).distance_km).toBeNull();
  });

  it('keeps to the distance the viewer chose', async () => {
    const ids = (await allItems({ sort: 'nearest', radius_km: 2, ...HERE }, auth(viewer))).map(bizIdOf);
    expect(ids).toContain(nearBiz);
    expect(ids).not.toContain(farBiz); // ~5.8 km
    expect(ids).not.toContain(nopinBiz); // no pin, so no distance
    expect((await allItems({ sort: 'nearest', radius_km: 10, ...HERE }, auth(viewer))).map(bizIdOf)).toContain(farBiz);
    for (const radius_km of [0, 101, 'far']) {
      expect((await request(app).get('/api/feed/businesses').query({ sort: 'nearest', radius_km, ...HERE })).status).toBe(400);
    }
  });

  it('never sends the exact pin of a private address', async () => {
    const items = await allItems({ sort: 'nearest', ...HERE }, auth(viewer));
    const nearItem = items.find((i) => i.type === 'business' && i.record.id === nearBiz);
    expect(Number(nearItem.record.latitude)).toBe(9.03);
  });

  it('tags friends (mutual follows) and people the viewer follows', async () => {
    const items = await allItems({ sort: 'recent' }, auth(viewer));
    expect(items.find((i) => bizIdOf(i) === nearBiz).relationship).toBe('friend');
    expect(items.find((i) => bizIdOf(i) === farBiz).relationship).toBe('following');
    expect(items.find((i) => bizIdOf(i) === nopinBiz).relationship).toBeNull();
  });

  it('sends owner details in one map', async () => {
    const res = await request(app).get('/api/feed/businesses').query({ sort: 'nearest', ...HERE, limit: 30 }).set(auth(viewer));
    const first = res.body.items[0];
    expect(res.body.owners[first.record.owner_id]).toBeTruthy();
  });

  it('keeps unpaid businesses out, and private ones out for guests', async () => {
    const guest = (await allItems({ sort: 'recent' })).map(bizIdOf);
    expect(guest).toContain(nearBiz);
    expect(guest).not.toContain(privateBiz);
    expect(guest).not.toContain(unpaidBiz);
    const member = (await allItems({ sort: 'recent' }, auth(viewer))).map(bizIdOf);
    expect(member).toContain(privateBiz);
    expect(member).not.toContain(unpaidBiz);
  });

  it('gives guests no relationship tags', async () => {
    const items = await allItems({ sort: 'recent' });
    expect(items.every((i) => i.relationship === null)).toBe(true);
  });
});
