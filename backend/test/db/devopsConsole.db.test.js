'use strict';

/**
 * Admin DevOps console routes (audit F-006). The console called error stats,
 * bulk resolve, ticket conversion and per-version saves that did not exist,
 * and sent PATCH where the backend only accepted PUT.
 */
const crypto = require('crypto');
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

let app; let user; let admin; const eventIds = [];
const as = (who) => ({ Authorization: `Bearer ${accessToken(who.id)}` });

async function addEvent(level, extra = {}) {
  const { rows: [row] } = await pool.query(
    `INSERT INTO error_events (source, level, message, name, method, path, status_code, fingerprint)
     VALUES ('route', $1, $2, 'TypeError', 'GET', '/api/test', 500, $3) RETURNING id`,
    [level, extra.message ?? `test ${level} event`, `test-${crypto.randomUUID()}`],
  );
  eventIds.push(row.id);
  return row.id;
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/devops', require('../../routes/devops'));
  user = await createUser(); admin = await createUser();
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.id]);
});
afterAll(async () => {
  await pool.query('DELETE FROM devops_items WHERE id IN (SELECT devops_item_id FROM error_events WHERE id = ANY($1::uuid[]))', [eventIds]);
  await pool.query('DELETE FROM error_events WHERE id = ANY($1::uuid[])', [eventIds]);
  await pool.query("DELETE FROM app_settings WHERE key = 'devops_version_statuses'");
  for (const u of [user, admin]) await deleteUser(u.id);
});

it('keeps every console route admin-only', async () => {
  const id = crypto.randomUUID();
  const calls = [
    ['get', '/api/devops/errors/stats'], ['patch', '/api/devops/errors/resolve-all'],
    ['patch', `/api/devops/errors/${id}/resolve`], ['post', `/api/devops/errors/${id}/to-ticket`],
    ['put', '/api/devops/versions/v1.0'],
  ];
  for (const [method, path] of calls) {
    expect((await request(app)[method](path)).status).toBe(401);
    expect((await request(app)[method](path).set(as(user))).status).toBe(403);
  }
});

it('reports stats and filters by level and since', async () => {
  const before = (await request(app).get('/api/devops/errors/stats').set(as(admin)).expect(200)).body;
  const start = new Date(Date.now() - 1000).toISOString();
  await addEvent('critical'); await addEvent('warn');
  const after = (await request(app).get('/api/devops/errors/stats').set(as(admin))).body;
  expect(after.unresolved - before.unresolved).toBe(2);
  expect(after.critical - before.critical).toBe(1);
  expect(after.warnings - before.warnings).toBe(1);
  expect(after.route - before.route).toBe(2);

  const list = (await request(app).get(`/api/devops/errors?level=critical&since=${encodeURIComponent(start)}`).set(as(admin))).body;
  expect(list.map((e) => e.id)).toEqual([eventIds[0]]);
  expect(list[0]).toHaveProperty('devops_item_title', null);
  expect((await request(app).get('/api/devops/errors?level=nope').set(as(admin))).status).toBe(400);
  expect((await request(app).get('/api/devops/errors?since=yesterday').set(as(admin))).status).toBe(400);
});

it('resolves one with PATCH and PUT, and rejects bad ids', async () => {
  const a = await addEvent('error'); const b = await addEvent('error');
  await request(app).patch(`/api/devops/errors/${a}/resolve`).set(as(admin)).expect(200);
  await request(app).put(`/api/devops/errors/${b}/resolve`).set(as(admin)).send({ note: 'fixed' }).expect(200);
  const { rows } = await pool.query('SELECT resolved, resolved_by, resolution_note FROM error_events WHERE id = ANY($1::uuid[]) ORDER BY resolution_note NULLS FIRST', [[a, b]]);
  expect(rows).toEqual([
    { resolved: true, resolved_by: admin.id, resolution_note: null },
    { resolved: true, resolved_by: admin.id, resolution_note: 'fixed' },
  ]);
  expect((await request(app).patch(`/api/devops/errors/${crypto.randomUUID()}/resolve`).set(as(admin))).status).toBe(404);
  expect((await request(app).patch('/api/devops/errors/not-a-uuid/resolve').set(as(admin))).status).toBe(404);
});

it('bulk resolves by level', async () => {
  const info = await addEvent('info'); const crit = await addEvent('critical');
  const res = await request(app).patch('/api/devops/errors/resolve-all').set(as(admin)).send({ level: 'info' }).expect(200);
  expect(res.body.resolved).toBeGreaterThanOrEqual(1);
  const { rows } = await pool.query('SELECT id, resolved FROM error_events WHERE id = ANY($1::uuid[])', [[info, crit]]);
  expect(Object.fromEntries(rows.map((r) => [r.id, r.resolved]))).toEqual({ [info]: true, [crit]: false });
  expect((await request(app).patch('/api/devops/errors/resolve-all').set(as(admin)).send({ level: 'all' })).status).toBe(400);
});

it('turns an error into one bug ticket', async () => {
  const id = await addEvent('critical', { message: 'Cannot read properties of undefined' });
  const first = await request(app).post(`/api/devops/errors/${id}/to-ticket`).set(as(admin)).expect(201);
  expect(first.body.ticket).toMatchObject({ kind: 'bug', severity: 'urgent', status: 'open', title: '[Error] TypeError: Cannot read properties of undefined' });
  const again = await request(app).post(`/api/devops/errors/${id}/to-ticket`).set(as(admin)).expect(200);
  expect(again.body.ticket.id).toBe(first.body.ticket.id);
  const list = (await request(app).get('/api/devops/errors?level=critical&limit=200').set(as(admin))).body;
  expect(list.find((e) => e.id === id)).toMatchObject({ devops_item_id: first.body.ticket.id, devops_item_status: 'open' });
  expect((await request(app).post(`/api/devops/errors/${crypto.randomUUID()}/to-ticket`).set(as(admin))).status).toBe(404);
});

it('saves one version status without losing the others', async () => {
  await request(app).put('/api/devops/versions/v1.0').set(as(admin)).send({ status: 'completed' }).expect(200);
  const res = await request(app).put('/api/devops/versions/v1.1').set(as(admin)).send({ status: 'in_progress' }).expect(200);
  expect(res.body).toMatchObject({ 'v1.0': 'completed', 'v1.1': 'in_progress' });
  expect((await request(app).get('/api/devops/versions').set(as(admin))).body).toMatchObject({ 'v1.0': 'completed', 'v1.1': 'in_progress' });
  for (const [path, body] of [['v1.0', { status: 'shipped' }], ['latest', { status: 'completed' }], ['v1.0', {}]]) {
    expect((await request(app).put(`/api/devops/versions/${path}`).set(as(admin)).send(body)).status).toBe(400);
  }
});
