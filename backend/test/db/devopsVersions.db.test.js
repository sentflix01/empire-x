'use strict';

/** The release-status board is internal (audit F-023): admins only. */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

let app; let user; let admin;
beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/devops', require('../../routes/devops'));
  user = await createUser(); admin = await createUser();
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
});
afterAll(async () => { for (const u of [user, admin]) await deleteUser(u.id); });

it('refuses guests and ordinary users, and serves admins', async () => {
  await request(app).get('/api/devops/versions').expect(401);
  await request(app).get('/api/devops/versions').set({ Authorization: `Bearer ${accessToken(user.id)}` }).expect(403);
  await request(app).get('/api/devops/versions').set({ Authorization: `Bearer ${accessToken(admin.id)}` }).expect(200);
});
