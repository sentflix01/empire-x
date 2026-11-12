'use strict';

/**
 * People in search (GET /api/search, users branch) come back with a distance
 * rounded up to 0.5 km, never the 0.1 km value or coordinates. The radius
 * filter and the distance sort still use the exact distance. People who
 * turned off "appear in search", and anyone blocked either way, are left out.
 * Products keep the 0.1 km distance. Coordinates are south of the equator and
 * west of Greenwich, so the bound lat/lon parameters are negative (they were
 * once written into the SQL, where "col--54.4" became a comment).
 * Real Postgres. See project-brain/DECISIONS.md (2026-11-12).
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser, tag } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/search', require('../../routes/search'));
  return app;
}

// Coordinates far from any seeded data, and a name only these users have.
// Both negative: south of the equator and west of Greenwich.
const ORIGIN = { lat: -54.4, lon: -3.35 };
const NEAR = { lat: '-54.4027000', lon: '-3.3500000' }; // ~0.30 km
const FAR = { lat: '-54.4200000', lon: '-3.3500000' }; // ~2.22 km
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

let app; let viewer; let near; let far; let hidden; let blockedByViewer; let blockingViewer;
let nearProduct; let farProduct;

async function productAt(sellerId, { lat, lon }, price) {
  const { rows: [product] } = await pool.query(
    `INSERT INTO products (seller_id, title, price, currency, stock, status, category, latitude, longitude)
     VALUES ($1, $2, $3, 'ETB', 1, 'active', 'food', $4, $5) RETURNING id`,
    [sellerId, `${NAME} product`, price, lat, lon],
  );
  return product.id;
}

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
  nearProduct = await productAt(near.id, NEAR, 250);
  farProduct = await productAt(far.id, FAR, 50);
});

afterAll(async () => {
  await pool.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [[nearProduct, farProduct].filter(Boolean)]);
  // blocks rows cascade with their users.
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
    `/api/search?q=${NAME}&type=products&lat=${ORIGIN.lat}&lon=${ORIGIN.lon}&limit=50${extra}`;
  const ids = (res) => res.body.products.map((p) => p.id);

  it('keeps the 0.1 km distance for products, not marked approximate', async () => {
    const res = await request(app).get(searchProducts()).set(auth(viewer));
    expect(res.status).toBe(200);
    const byId = new Map(res.body.products.map((p) => [p.id, p]));
    expect(Number(byId.get(nearProduct).distance_km)).toBe(0.3);
    expect(Number(byId.get(farProduct).distance_km)).toBe(2.2);
    expect(byId.get(nearProduct)).not.toHaveProperty('distance_approx');
  });

  it('sorts and filters by distance', async () => {
    const sorted = await request(app).get(searchProducts('&sort=distance')).set(auth(viewer));
    expect(sorted.status).toBe(200);
    expect(ids(sorted).indexOf(nearProduct)).toBeGreaterThanOrEqual(0);
    expect(ids(sorted).indexOf(nearProduct)).toBeLessThan(ids(sorted).indexOf(farProduct));

    const close = await request(app).get(searchProducts('&radius_km=1')).set(auth(viewer));
    expect(close.status).toBe(200);
    expect(ids(close)).toContain(nearProduct);
    expect(ids(close)).not.toContain(farProduct);
  });

  it('combines price and distance filters', async () => {
    const res = await request(app)
      .get(searchProducts('&price_min=100&price_max=500&radius_km=5&sort=distance'))
      .set(auth(viewer));
    expect(res.status).toBe(200);
    expect(ids(res)).toContain(nearProduct);
    expect(ids(res)).not.toContain(farProduct); // price 50
  });

  it('works for guests', async () => {
    const res = await request(app).get(searchProducts('&radius_km=5'));
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual(expect.arrayContaining([nearProduct, farProduct]));
  });
});
