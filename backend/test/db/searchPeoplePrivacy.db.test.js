'use strict';

/**
 * People in search (GET /api/search, users branch) come back with a distance
 * rounded up to 0.5 km, never the 0.1 km value or coordinates. The radius
 * filter and the distance sort still use the exact distance. People who
 * turned off "appear in search", and anyone blocked either way, are left out.
 * Coordinates are negative on purpose: they once turned into a SQL "--"
 * comment and the search failed with 500.
 * Real Postgres. See project-brain/DECISIONS.md (2026-11-12).
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

// Coordinates far from any seeded data (south and west, so both are negative),
// and a name only these users have.
const ORIGIN = { lat: -54.4, lon: -3.35 };
const NEAR = { lat: '-54.4027000', lon: '-3.3500000' }; // ~0.30 km
const FAR = { lat: '-54.4200000', lon: '-3.3500000' }; // ~2.22 km
const PRODUCT_AT = { lat: '-54.4100000', lon: '-3.3500000' }; // ~1.11 km
const NAME = `Zqsearch${tag()}`;

async function placeAt(userId, { lat, lon }, extra = '') {
  await pool.query(
    `UPDATE user_profiles SET latitude = $2, longitude = $3, display_name = $4 ${extra} WHERE user_id = $1`,
    [userId, lat, lon, NAME],
  );
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const searchPeople = (extra = '') =>
  `/api/search?q=${NAME}&type=users&lat=${ORIGIN.lat}&lon=${ORIGIN.lon}&limit=50${extra}`;

let app; let product; let viewer; let near; let far; let hidden; let blockedByViewer; let blockingViewer;

beforeAll(async () => {
  app = buildApp();
  [viewer, near, far, hidden, blockedByViewer, blockingViewer] = await Promise.all(
    Array.from({ length: 6 }, () => createUser()),
  );
  // The viewer is not searchable but can still find their own profile.
  await placeAt(viewer.id, NEAR, ', searchable = FALSE');
  await placeAt(near.id, NEAR);
  await placeAt(far.id, FAR);
  await placeAt(hidden.id, NEAR, ', searchable = FALSE');
  await placeAt(blockedByViewer.id, NEAR);
  await placeAt(blockingViewer.id, NEAR);
  await pool.query(
    'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2), ($3, $1)',
    [viewer.id, blockedByViewer.id, blockingViewer.id],
  );
  const shop = await createPublicBusiness(near.id);
  product = shop.productId;
  await pool.query(
    'UPDATE products SET title = $2, latitude = $3, longitude = $4 WHERE id = $1',
    [product, NAME, PRODUCT_AT.lat, PRODUCT_AT.lon],
  );
});

afterAll(async () => {
  // blocks rows and the test shop cascade with their users.
  for (const user of [viewer, near, far, hidden, blockedByViewer, blockingViewer]) {
    if (user) await deleteUser(user.id);
  }
  // Close this suite's connections so the whole run stays under Postgres's
  // client limit (every suite gets its own pools under Jest).
  await require('../../db/pool').closeAllPools();
  await pool.end();
});

describe('people in search', () => {
  it('returns a distance rounded up to 0.5 km, never the 0.1 km value or coordinates', async () => {
    const res = await request(app).get(searchPeople()).set(auth(viewer));
    expect(res.status).toBe(200);
    const byId = new Map(res.body.users.map((p) => [p.user_id, p]));

    expect(byId.get(near.id)).toMatchObject({ distance_km: 0.5, distance_approx: true });
    expect(byId.get(far.id)).toMatchObject({ distance_km: 2.5, distance_approx: true });

    for (const person of res.body.users) {
      expect(person).not.toHaveProperty('latitude');
      expect(person).not.toHaveProperty('longitude');
      expect(Number.isInteger(person.distance_km * 2)).toBe(true);
    }
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('54.4027');
    expect(body).not.toContain('54.42');
    expect(body).not.toContain('3.35');
    expect(body).not.toMatch(/"distance_km":(0\.3|2\.2)\b/);
  });

  it('sorts and filters by the exact distance', async () => {
    const sorted = await request(app).get(searchPeople('&sort=distance')).set(auth(viewer));
    const ids = sorted.body.users.map((p) => p.user_id);
    expect(ids.indexOf(near.id)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(near.id)).toBeLessThan(ids.indexOf(far.id));

    // 2.22 km is outside a 2.3 km radius only if the radius used 2.5; it is inside.
    const within = await request(app).get(searchPeople('&radius_km=2.3')).set(auth(viewer));
    expect(within.body.users.map((p) => p.user_id)).toContain(far.id);

    const close = await request(app).get(searchPeople('&radius_km=1')).set(auth(viewer));
    const closeIds = close.body.users.map((p) => p.user_id);
    expect(closeIds).toContain(near.id);
    expect(closeIds).not.toContain(far.id);
  });

  it('leaves out non-searchable people and both block directions, but not the viewer', async () => {
    const res = await request(app).get(searchPeople()).set(auth(viewer));
    const ids = res.body.users.map((p) => p.user_id);
    expect(ids).toEqual(expect.arrayContaining([near.id, far.id, viewer.id]));
    expect(ids).not.toContain(hidden.id);
    expect(ids).not.toContain(blockedByViewer.id);
    expect(ids).not.toContain(blockingViewer.id);
  });

  it('still shows the blocked people to someone uninvolved in the block', async () => {
    const res = await request(app).get(searchPeople()).set(auth(near));
    const ids = res.body.users.map((p) => p.user_id);
    expect(ids).toEqual(expect.arrayContaining([blockedByViewer.id, blockingViewer.id]));
    expect(ids).not.toContain(hidden.id);
    expect(ids).not.toContain(viewer.id);
  });

  it('returns no people to guests', async () => {
    const res = await request(app).get(searchPeople());
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });
});

describe('products in search', () => {
  const searchProducts = (extra = '') =>
    `/api/search?q=${NAME}&type=products&lat=${ORIGIN.lat}&lon=${ORIGIN.lon}${extra}`;

  it('works with negative coordinates and rounds the distance up to 0.5 km', async () => {
    const res = await request(app).get(searchProducts()).set(auth(viewer));
    expect(res.status).toBe(200);
    const found = res.body.products.find((p) => p.id === product);
    expect(found).toBeDefined();
    // About 1.1 km, sent rounded up to 1.5 km (DECISIONS.md "Business location", item 3).
    expect(found.distance_km).toBe(1.5);
    expect(found).not.toHaveProperty('distance_approx');
  });

  it('filters by radius and sorts by distance', async () => {
    const outside = await request(app).get(searchProducts('&radius_km=1')).set(auth(viewer));
    expect(outside.status).toBe(200);
    expect(outside.body.products.map((p) => p.id)).not.toContain(product);

    const inside = await request(app).get(searchProducts('&radius_km=2&sort=distance')).set(auth(viewer));
    expect(inside.status).toBe(200);
    expect(inside.body.products.map((p) => p.id)).toContain(product);
  });
});
