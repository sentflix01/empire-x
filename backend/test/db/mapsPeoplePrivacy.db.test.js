'use strict';

/**
 * People on the map (GET /api/maps/nearby, people branch) never come back with
 * exact coordinates, only a distance rounded up to 0.5 km. People who turned
 * off "appear in search", and anyone blocked either way, are left out.
 * Real Postgres. See project-brain/DECISIONS.md (2026-11-12).
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/maps', require('../../routes/maps'));
  return app;
}

// Coordinates far from any seeded data so other rows cannot crowd these out.
const ORIGIN = { lat: -54.4, lon: 3.35 };
const NEAR = { lat: '-54.4027000', lon: '3.3500000' }; // ~0.30 km
const FAR = { lat: '-54.4200000', lon: '3.3500000' }; // ~2.22 km

async function placeAt(userId, { lat, lon }, extra = '') {
  await pool.query(
    `UPDATE user_profiles SET latitude = $2, longitude = $3 ${extra} WHERE user_id = $1`,
    [userId, lat, lon],
  );
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const nearbyPeople = () => `/api/maps/nearby?lat=${ORIGIN.lat}&lon=${ORIGIN.lon}&type=people&radius=10&limit=200`;

let app; let viewer; let near; let far; let hidden; let blockedByViewer; let blockingViewer;

beforeAll(async () => {
  app = buildApp();
  [viewer, near, far, hidden, blockedByViewer, blockingViewer] = await Promise.all(
    Array.from({ length: 6 }, () => createUser()),
  );
  await placeAt(viewer.id, NEAR);
  await placeAt(near.id, NEAR);
  await placeAt(far.id, FAR);
  await placeAt(hidden.id, NEAR, ', searchable = FALSE');
  await placeAt(blockedByViewer.id, NEAR);
  await placeAt(blockingViewer.id, NEAR);
  await pool.query(
    'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2), ($3, $1)',
    [viewer.id, blockedByViewer.id, blockingViewer.id],
  );
});

afterAll(async () => {
  // blocks rows cascade with their users.
  for (const user of [viewer, near, far, hidden, blockedByViewer, blockingViewer]) {
    if (user) await deleteUser(user.id);
  }
  // Close this suite's connections so the whole run stays under Postgres's
  // client limit (every suite gets its own pools under Jest).
  await require('../../db/pool').closeAllPools();
  await pool.end();
});

describe('people on the nearby map', () => {
  it('returns a rounded distance and never the exact coordinates', async () => {
    const res = await request(app).get(nearbyPeople()).set(auth(viewer));
    expect(res.status).toBe(200);
    const byId = new Map(res.body.people.map((p) => [p.user_id, p]));

    expect(byId.get(near.id)).toMatchObject({ distance_km: 0.5, distance_approx: true });
    expect(byId.get(far.id)).toMatchObject({ distance_km: 2.5, distance_approx: true });

    for (const person of res.body.people) {
      expect(person).not.toHaveProperty('latitude');
      expect(person).not.toHaveProperty('longitude');
      expect(Number.isInteger(person.distance_km * 2)).toBe(true);
    }
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('54.4027');
    expect(body).not.toContain('54.42');
  });

  it('leaves out non-searchable people, both block directions and the viewer', async () => {
    const res = await request(app).get(nearbyPeople()).set(auth(viewer));
    expect(res.status).toBe(200);
    const ids = res.body.people.map((p) => p.user_id);
    expect(ids).toEqual(expect.arrayContaining([near.id, far.id]));
    expect(ids).not.toContain(hidden.id);
    expect(ids).not.toContain(blockedByViewer.id);
    expect(ids).not.toContain(blockingViewer.id);
    expect(ids).not.toContain(viewer.id);
  });

  it('still shows the blocked people to someone uninvolved in the block', async () => {
    const res = await request(app).get(nearbyPeople()).set(auth(near));
    const ids = res.body.people.map((p) => p.user_id);
    expect(ids).toEqual(expect.arrayContaining([blockedByViewer.id, blockingViewer.id]));
    expect(ids).not.toContain(hidden.id);
  });

  it('returns no people to guests', async () => {
    const res = await request(app).get(nearbyPeople());
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('people');
  });
});
