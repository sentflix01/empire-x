'use strict';

/** A website's Newsletter section saves sign-ups that only the owner can read. */
const request = require('supertest');
const express = require('express');
const { pool, createUser, createPublicBusiness, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/showrooms', require('../../routes/showrooms'));
  return app;
}

let app; let owner; let other; let site;
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });

beforeAll(async () => {
  app = buildApp();
  owner = await createUser();
  other = await createUser();
  site = await createPublicBusiness(owner.id);
  await pool.query(`UPDATE showrooms SET sections = '[{"type":"hero"},{"type":"newsletter","newsTitle":"News"}]' WHERE id = $1`, [site.siteId]);
});

afterAll(async () => {
  for (const user of [owner, other]) await deleteUser(user.id);
});

describe('POST /api/showrooms/:id/newsletter', () => {
  it('saves a visitor sign-up once, whatever the letter case', async () => {
    expect((await request(app).post(`/api/showrooms/${site.siteId}/newsletter`).send({ email: ' Reader@Example.test ' })).status).toBe(201);
    expect((await request(app).post(`/api/showrooms/${site.siteId}/newsletter`).send({ email: 'reader@example.test' })).status).toBe(201);
    const { rows } = await pool.query('SELECT email FROM showroom_newsletter_signups WHERE showroom_id = $1', [site.siteId]);
    expect(rows).toEqual([{ email: 'reader@example.test' }]);
  });

  it('rejects an invalid address', async () => {
    const res = await request(app).post(`/api/showrooms/${site.siteId}/newsletter`).send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('invalid_email');
  });

  it('refuses sites without a Newsletter section, and drafts', async () => {
    const plain = await createPublicBusiness(owner.id);
    expect((await request(app).post(`/api/showrooms/${plain.siteId}/newsletter`).send({ email: 'a@example.test' })).status).toBe(404);
    await pool.query(`UPDATE showrooms SET status = 'draft', sections = '[{"type":"newsletter"}]' WHERE id = $1`, [plain.siteId]);
    expect((await request(app).post(`/api/showrooms/${plain.siteId}/newsletter`).send({ email: 'a@example.test' })).status).toBe(404);
  });
});

describe('GET /api/showrooms/:id/newsletter', () => {
  it('lists sign-ups for the owner only', async () => {
    const mine = await request(app).get(`/api/showrooms/${site.siteId}/newsletter`).set(auth(owner));
    expect(mine.status).toBe(200);
    expect(mine.body.total).toBe(1);
    expect(mine.body.signups[0].email).toBe('reader@example.test');
    expect((await request(app).get(`/api/showrooms/${site.siteId}/newsletter`).set(auth(other))).status).toBe(404);
    expect((await request(app).get(`/api/showrooms/${site.siteId}/newsletter`)).status).toBe(401);
  });
});
