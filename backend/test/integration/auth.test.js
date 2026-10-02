'use strict';
/**
 * Integration tests for backend/routes/auth.js
 * Feature: professional-grade-upgrade
 * Requirements: 4.1, 4.2, 4.5, 4.7
 *
 * The pool is mocked via setupTests.js — no real DB connection required.
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// Mock dependencies before requiring routes
const mockPool = require('../helpers/mockPool');

// Mock the auth middleware — requireAuth/requireAdmin must not check real tokens in tests
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => { if (!req.user) req.user = { id: 'user-1', role: 'user' }; next(); },
  requireAdmin: (req, res, next) => { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' }); next(); },
  optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../lib/redis', () => {
  const store = {};
  const mockRedis = {
    get: jest.fn((key) => Promise.resolve(store[key] || null)),
    set: jest.fn((key, val, _ex, ttl) => { store[key] = val; return Promise.resolve('OK'); }),
    setex: jest.fn((key, _ttl, val) => { store[key] = val; return Promise.resolve('OK'); }),
    incr: jest.fn((key) => { store[key] = String((parseInt(store[key] || '0') + 1)); return Promise.resolve(parseInt(store[key])); }),
    expire: jest.fn((_key, _ttl) => Promise.resolve(1)),
    del: jest.fn((key) => { delete store[key]; return Promise.resolve(1); }),
    _store: store,
  };
  return { getRedis: () => mockRedis };
});
jest.mock('../../utils/mailer', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

const authRouter = require('../../routes/auth');
const { sendOtpEmail } = require('../../utils/mailer');
const { getRedis } = require('../../lib/redis');

// Build a minimal Express app with only the auth router
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  return app;
}

// Clear Redis store, reset bcrypt mock, and clear pool mock between tests
beforeEach(() => {
  const redis = getRedis();
  Object.keys(redis._store).forEach((k) => delete redis._store[k]);
  const bcrypt = require('bcryptjs');
  bcrypt.compare.mockReset();
  bcrypt.compare.mockResolvedValue(true);
  bcrypt.hash.mockReset();
  bcrypt.hash.mockResolvedValue('$2b$hashed');
  mockPool.query.mockReset();
});

describe('POST /api/auth/register', () => {
  it('returns 422 when email or password is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: '' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 422 when password is too short', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: '123' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 409 when a verified email already exists', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-id', is_verified: true }] }); // SELECT check
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: 'exists@b.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('resends an OTP and resumes signup when the existing account is unverified', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'pending-id', is_verified: false, is_banned: false }] }) // SELECT check
      .mockResolvedValueOnce({ rows: [] }); // UPDATE OTP
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: ' Pending@b.com ', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ pendingVerification: true });
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, is_verified, is_banned FROM users WHERE email = $1',
      ['pending@b.com']
    );
  });

  it('returns 201 on successful registration', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({ rows: [{ id: 'new-user-id', email: 'new@b.com' }] }); // INSERT
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: 'new@b.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
  });

  it('returns a retryable error instead of pretending an OTP was sent when delivery fails', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'new-user-id', email: 'new@b.com' }] });
    sendOtpEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: 'new@b.com', password: 'password123' });
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('code', 'OTP_DELIVERY_FAILED');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 422 when email or password is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: '' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 401 when user not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'pass123' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with access_token on success', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'user-id', email: 'u@b.com', password_hash: '$2b$hashed', is_verified: true, role: 'user' }],
    });
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'u@b.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
  });

  it('does not issue Redis commands for a built-in demo account', async () => {
    const redis = getRedis();
    for (const method of ['get', 'set', 'setex', 'del', 'incr', 'expire']) redis[method].mockClear();
    mockPool.query.mockResolvedValueOnce({
      rows: [{
        id: 'demo-id', email: 'test@nodbusiness.app', password_hash: '$2b$hashed',
        is_verified: true, role: 'user', is_banned: false, is_demo: true, is_seed: false,
      }],
    });

    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'test@nodbusiness.app', password: 'password123' });

    expect(res.status).toBe(200);
    expect(require('jsonwebtoken').decode(res.body.access_token)).toMatchObject({ demo: true });
    for (const method of ['get', 'set', 'setex', 'del', 'incr', 'expire']) {
      expect(redis[method]).not.toHaveBeenCalled();
    }
  });

  it('sends a fresh OTP when an unverified user tries to log in', async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'pending-id', email: 'pending@b.com', password_hash: '$2b$hashed', is_verified: false, role: 'user' }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'pending@b.com', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'email_not_verified', pendingVerification: true });
    expect(sendOtpEmail).toHaveBeenCalledWith('pending@b.com', expect.stringMatching(/^\d{6}$/));
  });

  it('does not send an unverified user to code entry when delivery fails', async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'pending-id', email: 'pending@b.com', password_hash: '$2b$hashed', is_verified: false, role: 'user' }],
      })
      .mockResolvedValueOnce({ rows: [] });
    sendOtpEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'pending@b.com', password: 'password123' });
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('code', 'OTP_DELIVERY_FAILED');
  });

  it('locks account after 5 failed login attempts', async () => {
    const bcrypt = require('bcryptjs');
    bcrypt.compare.mockResolvedValueOnce(false); // 1st fail
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'lock-id', email: 'lock@test.com', password_hash: '$2b$hashed', is_verified: true, role: 'user', is_banned: false }],
    });
    const app = buildApp();

    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      bcrypt.compare.mockResolvedValueOnce(false);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'lock-id', email: 'lock@test.com', password_hash: '$2b$hashed', is_verified: true, role: 'user', is_banned: false }],
      });
      await request(app).post('/api/auth/login').send({ email: 'lock@test.com', password: 'wrong' });
    }

    // 6th attempt should be locked out
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'lock-id', email: 'lock@test.com', password_hash: '$2b$hashed', is_verified: true, role: 'user', is_banned: false }],
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'lock@test.com', password: 'wrong' });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Too many failed attempts/);
  });

  it('clears failed attempts on successful login', async () => {
    const { getRedis } = require('../../lib/redis');
    const redis = getRedis();

    // Simulate 3 prior failed attempts
    await redis.incr('failed_login:clear@test.com');
    await redis.incr('failed_login:clear@test.com');
    await redis.incr('failed_login:clear@test.com');

    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'clear-id', email: 'clear@test.com', password_hash: '$2b$hashed', is_verified: true, role: 'user', is_banned: false }],
      });

    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'clear@test.com', password: 'correct' });
    expect(res.status).toBe(200);

    // Verify failed counter was cleared
    const remaining = await redis.get('failed_login:clear@test.com');
    expect(remaining).toBeNull();
  });
});

describe('POST /api/auth/demo configuration', () => {
  const original = {};
  const trackedKeys = ['DEMO_ENABLED', 'DEMO_DATABASE_URL', 'DEMO_SESSION_SECRET', 'JWT_SECRET'];

  beforeEach(() => {
    for (const key of trackedKeys) original[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of trackedKeys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it.each([
    ['missing demo database URL', { DEMO_DATABASE_URL: undefined, DEMO_SESSION_SECRET: 's'.repeat(32) }],
    ['short or missing isolated signing secret', { DEMO_DATABASE_URL: 'postgres://demo.invalid/demo', DEMO_SESSION_SECRET: 'too-short' }],
    ['signing secret reused from JWT_SECRET', { DEMO_DATABASE_URL: 'postgres://demo.invalid/demo', DEMO_SESSION_SECRET: 'j'.repeat(40), JWT_SECRET: 'j'.repeat(40) }],
  ])('fails closed for %s without querying the shared database', async (_caseName, overrides) => {
    process.env.DEMO_ENABLED = 'true';
    process.env.DEMO_DATABASE_URL = 'postgres://demo.invalid/demo';
    process.env.DEMO_SESSION_SECRET = 'd'.repeat(40);
    process.env.JWT_SECRET = 'j'.repeat(40);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    const res = await request(buildApp()).post('/api/auth/demo').send({});

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DEMO_CONFIGURATION_INVALID');
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

describe('Track 1 demo session handoff', () => {
  const originalDemoEnabled = process.env.DEMO_ENABLED;

  afterAll(() => {
    if (originalDemoEnabled === undefined) delete process.env.DEMO_ENABLED;
    else process.env.DEMO_ENABLED = originalDemoEnabled;
  });

  it('survives a reload and restores the existing real refresh session on exit', async () => {
    process.env.DEMO_ENABLED = 'false';
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'real-id', email: 'real@example.test', password_hash: '$2b$hashed', is_verified: true, role: 'user', is_demo: false, is_seed: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 'demo-id', email: 'test@nodbusiness.app', is_banned: false, is_demo: true, is_seed: false, onboarding_mode: 'demo' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'demo-id', is_banned: false, is_demo: true, is_seed: false }] })
      .mockResolvedValueOnce({ rows: [{ is_demo: false, is_seed: false, is_banned: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 'real-id', is_banned: false, is_demo: false, is_seed: false }] });

    const agent = request.agent(buildApp());
    const login = await agent.post('/api/auth/login').send({ email: 'real@example.test', password: 'password123' });
    expect(login.status).toBe(200);
    const originalRefreshCookie = login.headers['set-cookie'].find(cookie => cookie.startsWith('refresh_token=')).split(';')[0];

    const demo = await agent.post('/api/auth/demo');
    expect(demo.status).toBe(200);
    expect(demo.headers['set-cookie'].some(cookie => cookie.startsWith('demo_track1='))).toBe(true);
    expect(demo.headers['set-cookie'].some(cookie => cookie.startsWith('refresh_token='))).toBe(false);

    const demoRefresh = await agent.post('/api/auth/refresh');
    expect(demoRefresh.status).toBe(200);
    expect(require('jsonwebtoken').decode(demoRefresh.body.access_token).sub).toBe('demo-id');

    const exit = await agent.post('/api/auth/demo/exit');
    expect(exit.body.return_to_real).toBe(true);
    expect(exit.headers['set-cookie'].some(cookie => cookie.startsWith('demo_track1=;'))).toBe(true);

    const realRefresh = await agent.post('/api/auth/refresh');
    expect(realRefresh.status).toBe(200);
    expect(require('jsonwebtoken').decode(realRefresh.body.access_token).sub).toBe('real-id');
    expect(originalRefreshCookie).toBeTruthy();
  });

  it('does not treat a shared demo account refresh cookie as a real account to return to', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{
      id: 'demo-id', email: 'test@nodbusiness.app', password_hash: '$2b$hashed',
      is_verified: true, role: 'user', is_banned: false, is_demo: true, is_seed: false,
    }] });

    const agent = request.agent(buildApp());
    const login = await agent.post('/api/auth/login').send({ email: 'test@nodbusiness.app', password: 'password123' });
    expect(login.status).toBe(200);

    const exit = await agent.post('/api/auth/demo/exit');
    expect(exit.status).toBe(200);
    expect(exit.body.return_to_real).toBe(false);
    // The signed refresh token identifies itself as demo, so no real-user
    // lookup is needed and no return-to-real path is advertised.
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('returns 422 when fields are missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/verify-otp').send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 404 when user not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const app = buildApp();
    const res = await request(app).post('/api/auth/verify-otp').send({ email: 'x@x.com', otpCode: '123456' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('code', 'NOT_FOUND');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears cookie', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});
