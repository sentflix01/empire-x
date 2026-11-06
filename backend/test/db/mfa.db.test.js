'use strict';

/**
 * Two-factor sign-in (audit F-017) against real Postgres: setup, sign-in
 * challenge, replay and reuse protection, recovery codes, lockout, turning it
 * off, and the admin requirement.
 */
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');
const { hotp, base32Decode, totpStep } = require('../../lib/totp');

const PASSWORD = 'violet-harbour-tram-91';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', require('../../routes/auth'));
  app.use('/api/auth/mfa', require('../../routes/mfa'));
  const { requireAuth, requireAdmin } = require('../../middleware/auth');
  app.get('/admin-only', requireAuth, requireAdmin, (_req, res) => res.json({ ok: true }));
  return app;
}

const codeAt = (secret, offsetSteps = 0) => hotp(base32Decode(secret), totpStep() + offsetSteps);
const auth = (user) => ({ Authorization: `Bearer ${accessToken(user.id)}` });

let app; let person; let admin; let secret; let recovery;

beforeAll(async () => {
  app = buildApp();
  person = await createUser();
  admin = await createUser();
  const hash = await bcrypt.hash(PASSWORD, 4);
  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [person.id, hash]);
  await pool.query("UPDATE users SET password_hash = $2, role = 'admin' WHERE id = $1", [admin.id, hash]);
});

afterAll(async () => {
  await pool.query("DELETE FROM auth_security_state WHERE key LIKE 'mfa_%'");
  for (const u of [person, admin]) await deleteUser(u.id);
});

const login = (user) => request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });

describe('setting up', () => {
  it('signs in normally while it is off', async () => {
    const res = await login(person);
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();
  });

  it('needs the password to start, and stores the secret encrypted', async () => {
    await request(app).post('/api/auth/mfa/setup').set(auth(person)).send({ password: 'wrong-password-123' }).expect(401);
    const res = await request(app).post('/api/auth/mfa/setup').set(auth(person)).send({ password: PASSWORD }).expect(200);
    secret = res.body.secret;
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(res.body.otpauth_url).toContain(`secret=${secret}`);
    const { rows } = await pool.query('SELECT totp_secret_enc, enabled_at FROM user_mfa WHERE user_id = $1', [person.id]);
    expect(rows[0].totp_secret_enc).not.toContain(secret);
    expect(rows[0].enabled_at).toBeNull();
  });

  it('turns on only with a correct code and returns 10 recovery codes once', async () => {
    await request(app).post('/api/auth/mfa/enable').set(auth(person)).send({ code: '000000' }).expect(400);
    const res = await request(app).post('/api/auth/mfa/enable').set(auth(person)).send({ code: codeAt(secret) }).expect(200);
    recovery = res.body.recovery_codes;
    expect(recovery).toHaveLength(10);
    const status = await request(app).get('/api/auth/mfa/status').set(auth(person)).expect(200);
    expect(status.body).toMatchObject({ enabled: true, recovery_codes_left: 10, has_password: true, setup_allowed: true });
    const { rows } = await pool.query('SELECT recovery_codes::text AS codes FROM user_mfa WHERE user_id = $1', [person.id]);
    for (const c of recovery) expect(rows[0].codes).not.toContain(c);
  });
});

describe('signing in', () => {
  it('asks for a code instead of issuing a session', async () => {
    const res = await login(person);
    expect(res.status).toBe(200);
    expect(res.body.mfa_required).toBe(true);
    expect(res.body.access_token).toBeUndefined();
    expect(String(res.headers['set-cookie'] ?? '')).not.toContain('refresh_token');
  });

  it('issues the session for a correct code; the code and the challenge work once', async () => {
    const { body } = await login(person);
    await request(app).post('/api/auth/mfa/verify').send({ mfa_token: body.mfa_token, code: '123456' }).expect(401);
    const code = codeAt(secret, 1); // the current step was used when turning it on
    const ok = await request(app).post('/api/auth/mfa/verify').send({ mfa_token: body.mfa_token, code }).expect(200);
    expect(ok.body.access_token).toBeTruthy();
    expect(String(ok.headers['set-cookie'])).toContain('refresh_token');
    // Same challenge again: refused.
    await request(app).post('/api/auth/mfa/verify').send({ mfa_token: body.mfa_token, code }).expect(401);
    // Same code with a new challenge: refused (no replay).
    const again = await login(person);
    const replay = await request(app).post('/api/auth/mfa/verify').send({ mfa_token: again.body.mfa_token, code });
    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe('MFA_CODE_INVALID');
  });

  it('accepts each recovery code once', async () => {
    const first = await login(person);
    const ok = await request(app).post('/api/auth/mfa/verify').send({ mfa_token: first.body.mfa_token, code: recovery[0].toUpperCase() }).expect(200);
    expect(ok.body.used_recovery_code).toBe(true);
    const second = await login(person);
    await request(app).post('/api/auth/mfa/verify').send({ mfa_token: second.body.mfa_token, code: recovery[0] }).expect(401);
    const status = await request(app).get('/api/auth/mfa/status').set(auth(person));
    expect(status.body.recovery_codes_left).toBe(9);
  });

  it('locks after 5 wrong codes', async () => {
    const { body } = await login(person);
    for (let i = 0; i < 5; i++) await request(app).post('/api/auth/mfa/verify').send({ mfa_token: body.mfa_token, code: '000001' });
    const locked = await request(app).post('/api/auth/mfa/verify').send({ mfa_token: body.mfa_token, code: codeAt(secret, -1) });
    expect(locked.status).toBe(429);
    await pool.query("DELETE FROM auth_security_state WHERE key LIKE $1", [`mfa_%${person.id}`]);
  });

  it('rejects a forged or expired challenge', async () => {
    await request(app).post('/api/auth/mfa/verify').send({ mfa_token: accessToken(person.id), code: codeAt(secret) }).expect(401);
    await request(app).post('/api/auth/mfa/verify').send({ mfa_token: 'not-a-token', code: codeAt(secret) }).expect(401);
  });
});

describe('turning it off', () => {
  it('needs the password and a valid code', async () => {
    await request(app).post('/api/auth/mfa/disable').set(auth(person)).send({ password: 'wrong-password-123', code: recovery[1] }).expect(401);
    await request(app).post('/api/auth/mfa/disable').set(auth(person)).send({ password: PASSWORD, code: '999999' }).expect(400);
    await request(app).post('/api/auth/mfa/disable').set(auth(person)).send({ password: PASSWORD, code: recovery[1] }).expect(200);
    const res = await login(person);
    expect(res.body.access_token).toBeTruthy();
  });
});

describe('admins', () => {
  const prev = process.env.ADMIN_MFA_REQUIRED;
  beforeAll(() => { process.env.ADMIN_MFA_REQUIRED = 'true'; });
  afterAll(() => { if (prev === undefined) delete process.env.ADMIN_MFA_REQUIRED; else process.env.ADMIN_MFA_REQUIRED = prev; });

  it('cannot use admin routes until two-factor sign-in is on, and cannot turn it off', async () => {
    const blocked = await request(app).get('/admin-only').set(auth(admin));
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('MFA_SETUP_REQUIRED');

    const setup = await request(app).post('/api/auth/mfa/setup').set(auth(admin)).send({ password: PASSWORD }).expect(200);
    const enabled = await request(app).post('/api/auth/mfa/enable').set(auth(admin)).send({ code: codeAt(setup.body.secret) }).expect(200);
    await request(app).get('/admin-only').set(auth(admin)).expect(200);

    const off = await request(app).post('/api/auth/mfa/disable').set(auth(admin)).send({ password: PASSWORD, code: enabled.body.recovery_codes[0] });
    expect(off.status).toBe(403);
    expect(off.body.code).toBe('MFA_REQUIRED_FOR_ADMINS');
  });
});
