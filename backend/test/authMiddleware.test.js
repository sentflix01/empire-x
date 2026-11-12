'use strict';

/**
 * requireAuth status codes. A token problem is a 401; a failure on our side
 * (database down, pool exhausted) is a 503, so the frontend does not treat an
 * outage as a bad session and sign the person out.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'auth-middleware-test-secret-0123456789abcdef';

jest.mock('../db/pool', () => require('./helpers/mockPool'));
jest.mock('../lib/authSecurityStore', () => ({ isTokenRevoked: jest.fn().mockResolvedValue(false) }));

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const mockPool = require('./helpers/mockPool');
const { requireAuth } = require('../middleware/auth');

const app = express();
app.get('/me', requireAuth, (req, res) => res.json({ id: req.user.id }));

const sign = (sub, options = {}) =>
  jwt.sign({ sub, type: 'access', demo: false }, process.env.JWT_SECRET, { expiresIn: '10m', jwtid: crypto.randomUUID(), ...options });

beforeEach(() => mockPool.query.mockReset());

it('lets a valid token through', async () => {
  const id = crypto.randomUUID();
  mockPool.query.mockResolvedValueOnce({ rows: [{ id, email: 'a@example.test', role: 'user', is_banned: false, is_demo: false, mfa_enabled: false }] });
  const res = await request(app).get('/me').set('Authorization', `Bearer ${sign(id)}`).expect(200);
  expect(res.body).toEqual({ id });
});

it('answers 401 INVALID_TOKEN for a token signed with another secret', async () => {
  const bad = jwt.sign({ sub: crypto.randomUUID(), type: 'access' }, 'some-other-secret');
  const res = await request(app).get('/me').set('Authorization', `Bearer ${bad}`).expect(401);
  expect(res.body.code).toBe('INVALID_TOKEN');
  expect(mockPool.query).not.toHaveBeenCalled();
});

it('answers 401 TOKEN_EXPIRED for an expired token', async () => {
  const res = await request(app).get('/me').set('Authorization', `Bearer ${sign(crypto.randomUUID(), { expiresIn: -10 })}`).expect(401);
  expect(res.body.code).toBe('TOKEN_EXPIRED');
});

it('answers 503 AUTH_UNAVAILABLE, not 401, when the user lookup fails', async () => {
  mockPool.query.mockRejectedValueOnce(new Error('sorry, too many clients already'));
  const res = await request(app).get('/me').set('Authorization', `Bearer ${sign(crypto.randomUUID())}`).expect(503);
  expect(res.body.code).toBe('AUTH_UNAVAILABLE');
});
