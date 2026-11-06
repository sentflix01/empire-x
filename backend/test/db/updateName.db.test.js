'use strict';

/** PUT /api/auth/update-name (audit F-004): the account name that /api/auth/me returns. */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

let app; let person;
const auth = () => ({ Authorization: `Bearer ${accessToken(person.id)}` });

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/auth', require('../../routes/auth'));
  person = await createUser();
});
afterAll(async () => { await deleteUser(person.id); });

it('updates users.full_name, and /me returns it', async () => {
  const res = await request(app).put('/api/auth/update-name').set(auth()).send({ full_name: '  Abebe   Kebede ' });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ full_name: 'Abebe Kebede' });
  const me = await request(app).get('/api/auth/me').set(auth());
  expect(me.body.full_name).toBe('Abebe Kebede');
});

it.each([[''], ['   '], ['x'.repeat(101)], ['bad\u0000name'], [123], [null]])('rejects %p', async (value) => {
  expect((await request(app).put('/api/auth/update-name').set(auth()).send({ full_name: value })).status).toBe(422);
  const { rows: [u] } = await pool.query('SELECT full_name FROM users WHERE id = $1', [person.id]);
  expect(u.full_name).toBe('Abebe Kebede');
});

it('needs sign-in', async () => {
  expect((await request(app).put('/api/auth/update-name').send({ full_name: 'X' })).status).toBe(401);
});
