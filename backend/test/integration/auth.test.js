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
