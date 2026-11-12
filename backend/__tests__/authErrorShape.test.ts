/**
 * Auth failures follow the documented error shape { error, code, request_id }
 * (audit F-007); the message text is unchanged so existing clients still work.
 */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../db/pool', () => {
  const pool = { query: jest.fn() };
  return { __esModule: true, default: pool, getCurrentDatabaseContext: () => 'real' };
});

process.env.JWT_SECRET = 'test-secret-for-auth-error-shape';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const requestId = require('../middleware/requestId');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pool = require('../db/pool').default as { query: jest.Mock };

const app = express();
app.use(requestId);
app.get('/private', requireAuth, (_req, res) => { res.json({ ok: true }); });
app.get('/public', optionalAuth, (req, res) => {
  res.json({ user: (req as express.Request & { user?: { id: string } | null }).user?.id ?? null });
});

const validToken = () => jwt.sign({ sub: 'u1', type: 'access', jti: `j-${Math.random()}` }, process.env.JWT_SECRET as string);
app.get('/admin', (req, _res, next) => {
  (req as express.Request & { user?: unknown }).user = JSON.parse(String(req.headers['x-test-user']));
  next();
}, requireAdmin, (_req, res) => { res.json({ ok: true }); });

const shape = (body: Record<string, unknown>, code: string, error: string) => {
  expect(body).toEqual({ error, code, request_id: expect.any(String) });
};

describe('requireAuth', () => {
  it('missing bearer token', async () => {
    const res = await request(app).get('/private').set('X-Request-ID', 'req-123').expect(401);
    expect(res.body).toEqual({ error: 'Authentication required', code: 'UNAUTHORIZED', request_id: 'req-123' });
  });

  it('malformed token', async () => {
    const res = await request(app).get('/private').set('Authorization', 'Bearer not-a-jwt').expect(401);
    shape(res.body, 'INVALID_TOKEN', 'Invalid token');
  });

  it('expired token', async () => {
    const token = jwt.sign({ sub: 'u1', type: 'access', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET as string);
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`).expect(401);
    shape(res.body, 'TOKEN_EXPIRED', 'Token expired');
  });
});

describe('requireAdmin', () => {
  it('non-admin', async () => {
    const res = await request(app).get('/admin').set('x-test-user', JSON.stringify({ id: 'u1', role: 'user' })).expect(403);
    shape(res.body, 'ADMIN_REQUIRED', 'Admin access required');
  });

  it('admin without two-factor sign-in when it is required', async () => {
    process.env.ADMIN_MFA_REQUIRED = 'true';
    try {
      const res = await request(app).get('/admin').set('x-test-user', JSON.stringify({ id: 'u1', role: 'admin', mfa_enabled: false })).expect(403);
      shape(res.body, 'MFA_SETUP_REQUIRED', 'Turn on two-factor sign-in in Settings to use admin tools.');
    } finally {
      delete process.env.ADMIN_MFA_REQUIRED;
    }
  });
});

describe('server-side failure while checking a token (DB down)', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockRejectedValue(new Error('sorry, too many clients already'));
  });
  afterAll(() => { pool.query.mockReset(); });

  it('requireAuth answers 503 AUTH_UNAVAILABLE, not 401, so the app does not sign people out', async () => {
    const res = await request(app).get('/private').set('Authorization', `Bearer ${validToken()}`).expect(503);
    shape(res.body, 'AUTH_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please try again.');
    expect(res.headers['retry-after']).toBe('5');
  });

  it('optionalAuth answers 503 instead of quietly treating a signed-in person as a guest', async () => {
    const res = await request(app).get('/public').set('Authorization', `Bearer ${validToken()}`).expect(503);
    shape(res.body, 'AUTH_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please try again.');
  });

  it('a bad token is still a token problem: 401 for requireAuth, guest for optionalAuth', async () => {
    await request(app).get('/private').set('Authorization', 'Bearer not-a-jwt').expect(401);
    const res = await request(app).get('/public').set('Authorization', 'Bearer not-a-jwt').expect(200);
    expect(res.body).toEqual({ user: null });
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('optionalAuth with a working database', () => {
  it('attaches the signed-in user', async () => {
    pool.query.mockReset();
    pool.query.mockImplementation(async (sql: string) => (/FROM users/i.test(sql)
      ? { rows: [{ id: 'u1', role: 'user', is_banned: false, is_demo: false }] }
      : { rows: [] }));
    const res = await request(app).get('/public').set('Authorization', `Bearer ${validToken()}`).expect(200);
    expect(res.body).toEqual({ user: 'u1' });
  });
});

