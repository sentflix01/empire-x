'use strict';

/**
 * Business location pin and privacy (decision "Business location: exact pin
 * only when the address is public"). Real Postgres.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/businesses', require('../../routes/businesses'));
  app.use('/api/maps', require('../../routes/maps'));
  return app;
}

const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });
const PIN = { latitude: 9.0192345, longitude: 38.7525111 };

let app; let owner; let member; let bizId;

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  member = await createUser();
  ({ businessId: bizId } = await createPublicBusiness(owner.id));
});

afterAll(async () => {
  await deleteUser(owner.id);
  await deleteUser(member.id);
});

describe('owner pin', () => {
  it('saves a valid pin and rejects a broken one', async () => {
    const bad = await request(app).put(`/api/businesses/${bizId}`).set(auth(owner)).send({ latitude: 95, longitude: 38 });
    expect(bad.status).toBe(422);
    const half = await request(app).put(`/api/businesses/${bizId}`).set(auth(owner)).send({ latitude: 9 });
    expect(half.status).toBe(422);
    const ok = await request(app).put(`/api/businesses/${bizId}`).set(auth(owner)).send(PIN);
    expect(ok.status).toBe(200);
    expect(Number(ok.body.latitude)).toBeCloseTo(PIN.latitude, 6);
  });

  it('only the owner may set it', async () => {
    const res = await request(app).put(`/api/businesses/${bizId}`).set(auth(member)).send(PIN);
    expect(res.status).toBe(403);
  });
});

describe('who sees what', () => {
  beforeAll(async () => {
    await pool.query(`UPDATE businesses SET latitude=$2, longitude=$3, public_contact_fields=ARRAY['business_contact_phone'] WHERE id=$1`, [bizId, PIN.latitude, PIN.longitude]);
  });

  it('guests and members get a pin rounded to about 1 km while the address is private', async () => {
    for (const headers of [{}, auth(member)]) {
      const res = await request(app).get(`/api/businesses/${bizId}`).set(headers);
      expect(res.status).toBe(200);
      expect(Number(res.body.latitude)).toBe(9.02);
      expect(Number(res.body.longitude)).toBe(38.75);
      expect(res.body.business_address).toBeNull();
    }
  });

  it('the owner sees the exact pin', async () => {
    const res = await request(app).get(`/api/businesses/${bizId}`).set(auth(owner));
    expect(Number(res.body.latitude)).toBeCloseTo(PIN.latitude, 6);
  });

  it('a public address shows the exact pin', async () => {
    await pool.query(`UPDATE businesses SET public_contact_fields=ARRAY['business_address'] WHERE id=$1`, [bizId]);
    const res = await request(app).get(`/api/businesses/${bizId}`);
    expect(Number(res.body.latitude)).toBeCloseTo(PIN.latitude, 6);
    await pool.query(`UPDATE businesses SET public_contact_fields=ARRAY['business_contact_phone'] WHERE id=$1`, [bizId]);
  });

  it('the nearby map gives a rounded distance and coarse coordinates', async () => {
    const res = await request(app).get('/api/maps/nearby').query({ lat: 9.03, lon: 38.76, type: 'businesses', radius: 5 }).set(auth(member));
    expect(res.status).toBe(200);
    const hit = res.body.businesses.find((b) => b.id === bizId);
    expect(hit).toBeTruthy();
    expect(hit.distance_km % 0.5).toBe(0);
    expect(Number(hit.latitude)).toBe(9.02);
    expect(hit.address_public).toBeUndefined();
  });
});
