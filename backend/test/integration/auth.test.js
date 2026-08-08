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
jest.mock('../../lib/redis', () => ({
  getRedis: () => ({ isNoOp: true, setex: jest.fn(), get: jest.fn() }),
}));
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

// Build a minimal Express app with only the auth router
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  return app;
}

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
      .mockResolvedValueOnce({ rows: [{ id: 'pending-id', is_verified: false }] }) // SELECT check
      .mockResolvedValueOnce({ rows: [] }); // UPDATE OTP
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: ' Pending@b.com ', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: 'pending-id', pendingVerification: true });
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, is_verified FROM users WHERE email = $1',
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
