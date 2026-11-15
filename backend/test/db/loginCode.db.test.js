'use strict';

/**
 * Sign in with an emailed code (new-user audit NU-18): never reveals whether
 * an account exists, only verified Real accounts get a code, the code works
 * once, expires, 5 wrong tries cancel it, and two-step sign-in still applies.
 */
const crypto = require('crypto');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { pool, createUser, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', require('../../routes/auth'));
  return app;
}
const hash = (code) => crypto.createHash('sha256').update(code + (process.env.OTP_SALT ?? '')).digest('hex');
/** Puts a known code on the account, as the email would deliver it. */
const plant = (userId, code, minutes = 10) => pool.query(
  "UPDATE users SET otp_code = $2, otp_expires = NOW() + ($3 || ' minutes')::interval WHERE id = $1", [userId, hash(code), String(minutes)],
);

let app; let person; let unverified;
beforeAll(async () => {
  app = buildApp();
  person = await createUser();
  unverified = await createUser();
  await pool.query('UPDATE users SET is_verified = FALSE WHERE id = $1', [unverified.id]);
});
afterAll(async () => { await deleteUser(person.id); await deleteUser(unverified.id); });

const ask = (email) => request(app).post('/api/auth/login-code').send({ email });
const use = (email, code) => request(app).post('/api/auth/login-code/verify').send({ email, code });

describe('POST /api/auth/login-code', () => {
  it('answers the same whether or not the email has an account', async () => {
    const known = await ask(person.email);
    const unknown = await ask('nobody-here@example.test');
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('issues a code only to a verified account', async () => {
    await pool.query('UPDATE users SET otp_code = NULL WHERE id = ANY($1)', [[person.id, unverified.id]]);
    await ask(person.email);
    await ask(unverified.email);
    const { rows } = await pool.query('SELECT id, otp_code FROM users WHERE id = ANY($1)', [[person.id, unverified.id]]);
    expect(rows.find((r) => r.id === person.id).otp_code).toMatch(/^[0-9a-f]{64}$/);
    expect(rows.find((r) => r.id === unverified.id).otp_code).toBeNull();
  });

  it('refuses a malformed email', async () => {
    expect((await ask('not-an-email')).status).toBe(422);
  });
});

describe('POST /api/auth/login-code/verify', () => {
  it('signs in with the right code, once', async () => {
    await plant(person.id, '482913');
    const ok = await use(person.email.toUpperCase(), '482913');
    expect(ok.status).toBe(200);
    expect(ok.body.access_token).toBeTruthy();
    expect((await use(person.email, '482913')).status).toBe(401);
  });

  it('refuses an expired code', async () => {
    await plant(person.id, '111222', -1);
    expect((await use(person.email, '111222')).status).toBe(401);
  });

  it('cancels the code after 5 wrong tries', async () => {
    await plant(person.id, '777888');
    for (let i = 0; i < 5; i++) expect((await use(person.email, String(100000 + i))).status).toBe(401);
    expect((await use(person.email, '777888')).status).toBe(401);
  });

  it('never signs in an unverified account or an unknown email', async () => {
    await plant(unverified.id, '333444');
    expect((await use(unverified.email, '333444')).status).toBe(401);
    expect((await use('nobody-here@example.test', '333444')).status).toBe(401);
  });

  it('refuses a code that is not 6 digits', async () => {
    expect((await use(person.email, '12ab')).status).toBe(422);
  });
});
