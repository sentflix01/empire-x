'use strict';

/**
 * Telegram settings (audit F-005), real Postgres. The routes used the wrong
 * table, so every call failed and no notification was sent; the toggle route
 * did not exist and disconnect used a method the backend did not accept.
 */
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
const request = require('supertest');
const express = require('express');
const { createUser, accessToken, deleteUser } = require('./helpers');

const sent = [];
global.fetch = jest.fn(async (_url, opts) => { sent.push(JSON.parse(opts.body)); return { ok: true, status: 200 }; });
const telegram = require('../../routes/telegram');

let app; let person;
const auth = () => ({ Authorization: `Bearer ${accessToken(person.id)}` });

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/telegram', telegram);
  person = await createUser();
});
afterAll(async () => { await deleteUser(person.id); });

it('starts disconnected, and the toggle refuses until a chat is connected', async () => {
  const status = await request(app).get('/api/telegram/status').set(auth()).expect(200);
  expect(status.body).toEqual({ connected: false, notifications_enabled: false, bot_configured: true });
  expect((await request(app).put('/api/telegram/notifications').set(auth()).send({ enabled: true })).status).toBe(409);
});

it('connects with a valid chat id only', async () => {
  for (const bad of ['', 'abc', '12; DROP', '1'.repeat(25), { id: 1 }]) {
    expect((await request(app).post('/api/telegram/connect').set(auth()).send({ chat_id: bad })).status).toBe(400);
  }
  await request(app).post('/api/telegram/connect').set(auth()).send({ chat_id: '123456789' }).expect(200);
  const status = await request(app).get('/api/telegram/status').set(auth());
  expect(status.body).toMatchObject({ connected: true, notifications_enabled: true });
});

it('sends notifications only while they are on', async () => {
  sent.length = 0;
  await telegram.notifyUser(person.id, 'Hello');
  expect(sent).toEqual([expect.objectContaining({ chat_id: '123456789', text: 'Hello' })]);

  const off = await request(app).put('/api/telegram/notifications').set(auth()).send({ enabled: false });
  expect(off.body).toEqual({ enabled: false });
  await telegram.notifyUser(person.id, 'Hidden');
  expect(sent).toHaveLength(1);

  expect((await request(app).put('/api/telegram/notifications').set(auth()).send({ enabled: 'yes' })).status).toBe(400);
  expect((await request(app).put('/api/telegram/notifications').set(auth()).send({ enabled: true })).body).toEqual({ enabled: true });
});

it('disconnects with DELETE (the settings screen) and POST', async () => {
  await request(app).delete('/api/telegram/disconnect').set(auth()).expect(200);
  expect((await request(app).get('/api/telegram/status').set(auth())).body.connected).toBe(false);
  await request(app).post('/api/telegram/connect').set(auth()).send({ chat_id: -100123 }).expect(200);
  await request(app).post('/api/telegram/disconnect').set(auth()).expect(200);
  sent.length = 0;
  await telegram.notifyUser(person.id, 'After disconnect');
  expect(sent).toEqual([]);
});
