/**
 * Auth middleware must answer 401 only for real token/account problems. When
 * the user lookup itself fails (Postgres out of connections, connection
 * refused) it answers 503 AUTH_UNAVAILABLE, so the web app does not treat an
 * outage as an ended session and sign the person out
 * (decision 2026-11-12 in project-brain/DECISIONS.md).
 */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

type QueryResult = { rows: unknown[]; rowCount?: number };
type UsersBehaviour = (userId: string) => Promise<QueryResult>;

// Per-user behaviour for the `FROM users` lookup; per-jti revocation rows.
const usersBehaviour = new Map<string, UsersBehaviour>();
const revokedJtis = new Set<string>();

jest.mock('../db/pool', () => {
  const pool = { query: jest.fn() };
  return { __esModule: true, default: pool, getCurrentDatabaseContext: () => ({ environment: 'real' }) };
});

delete process.env.REDIS_URL;
process.env.JWT_SECRET = 'test-secret-for-auth-unavailable';

/* eslint-disable @typescript-eslint/no-require-imports */
const pool = require('../db/pool').default as { query: jest.Mock };
const logger = require('../lib/logger');
const requestId = require('../middleware/requestId');
const { requireAuth, optionalAuth } = require('../middleware/auth');
/* eslint-enable @typescript-eslint/no-require-imports */

pool.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
  if (sql.includes('auth_security_state')) {
    const key = String(params[0]);
    const jti = key.startsWith('revoked:') ? key.slice('revoked:'.length) : '';
    return revokedJtis.has(jti) ? { rows: [{ count: '1' }] } : { rows: [] };
  }
  if (sql.includes('FROM users')) {
    const userId = String(params[0]);
    const behaviour = usersBehaviour.get(userId);
    if (!behaviour) return { rows: [] };
    return behaviour(userId);
  }
  throw new Error(`unexpected query in test: ${sql}`);
});

const app = express();
app.use(requestId);
app.get('/private', requireAuth, (req, res) => {
  res.json({ user: (req as express.Request & { user?: { id: string } }).user?.id ?? null });
});
app.get('/public', optionalAuth, (req, res) => {
  res.json({ user: (req as express.Request & { user?: { id: string } | null }).user?.id ?? null });
});
app.get('/private-throws', requireAuth, () => { throw new Error('route bug'); });

const user = (id: string, extra: Record<string, unknown> = {}) => ({
  id, email: `${id}@example.test`, role: 'user', is_banned: false, is_demo: false, mfa_enabled: false, ...extra,
});

/** A fresh user id and an access token for it (unique ids dodge the in-process caches). */
function fresh(behaviour?: UsersBehaviour, claims: Record<string, unknown> = {}) {
  const sub = randomUUID();
  if (behaviour) usersBehaviour.set(sub, behaviour);
  const jti = randomUUID();
  const token = jwt.sign({ sub, jti, type: 'access', ...claims }, process.env.JWT_SECRET as string, { expiresIn: '5m' });
  return { sub, jti, token };
}

const found = (extra: Record<string, unknown> = {}): UsersBehaviour => async id => ({ rows: [user(id, extra)] });
const failing = (err: Error): UsersBehaviour => async () => { throw err; };

const tooManyClients = () => Object.assign(new Error('sorry, too many clients already'), { code: '53300' });
const refused = () => Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });

const unavailable = {
  error: 'Sign-in check is temporarily unavailable. Try again shortly.',
  code: 'AUTH_UNAVAILABLE',
  request_id: expect.any(String),
};

let loggerError: jest.SpyInstance;
beforeEach(() => { loggerError = jest.spyOn(logger, 'error').mockImplementation(() => undefined); });
afterEach(() => { loggerError.mockRestore(); });

describe('requireAuth: infrastructure failures answer 503, not 401', () => {
  it('Postgres out of connections → 503 AUTH_UNAVAILABLE, logged', async () => {
    const { token } = fresh(failing(tooManyClients()));
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body).toEqual(unavailable);
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: 'sorry, too many clients already', code: '53300', where: 'requireAuth' }),
      expect.stringContaining('503'),
    );
  });

  it('connection refused → 503 AUTH_UNAVAILABLE', async () => {
    const { token } = fresh(failing(refused()));
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body).toEqual(unavailable);
  });

  it('does not cache the failure: the next request succeeds once Postgres is back', async () => {
    let down = true;
    const { token, sub } = fresh(async id => { if (down) throw tooManyClients(); return { rows: [user(id)] }; });
    await request(app).get('/private').set('Authorization', `Bearer ${token}`).expect(503);
    down = false;
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ user: sub });
  });
});

describe('requireAuth: token and account problems still answer 401/403', () => {
  const expect401 = async (token: string, code: string, error: string) => {
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error, code, request_id: expect.any(String) });
  };

  it('missing bearer token → 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/private').expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('wrong signature → 401 INVALID_TOKEN', async () => {
    const token = jwt.sign({ sub: randomUUID(), type: 'access' }, 'some-other-secret');
    await expect401(token, 'INVALID_TOKEN', 'Invalid token');
  });

  it('malformed token → 401 INVALID_TOKEN', async () => {
    await expect401('not-a-jwt', 'INVALID_TOKEN', 'Invalid token');
  });

  it('refresh token used as Bearer → 401 INVALID_TOKEN', async () => {
    const { token } = fresh(found(), { type: 'refresh' });
    await expect401(token, 'INVALID_TOKEN', 'Invalid token');
  });

  it('expired token → 401 TOKEN_EXPIRED', async () => {
    const token = jwt.sign(
      { sub: randomUUID(), type: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET as string,
    );
    await expect401(token, 'TOKEN_EXPIRED', 'Token expired');
  });

  it('revoked token → 401 TOKEN_REVOKED', async () => {
    const { token, jti } = fresh(found());
    revokedJtis.add(jti);
    await expect401(token, 'TOKEN_REVOKED', 'Token has been revoked');
  });

  it('user not found → 401 USER_NOT_FOUND', async () => {
    const { token } = fresh(async () => ({ rows: [] }));
    await expect401(token, 'USER_NOT_FOUND', 'User not found');
  });

  it('banned user → 403 ACCOUNT_SUSPENDED', async () => {
    const { token } = fresh(found({ is_banned: true }));
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('valid token → user attached', async () => {
    const { token, sub } = fresh(found());
    const res = await request(app).get('/private').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ user: sub });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('an error thrown by the route after auth is not reported as an auth failure', async () => {
    const { token } = fresh(found());
    const res = await request(app).get('/private-throws').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body?.code).not.toBe('INVALID_TOKEN');
    expect(res.body?.code).not.toBe('AUTH_UNAVAILABLE');
  });
});

describe('optionalAuth', () => {
  it('no token → guest', async () => {
    const res = await request(app).get('/public').expect(200);
    expect(res.body).toEqual({ user: null });
  });

  it('invalid token → guest', async () => {
    const res = await request(app).get('/public').set('Authorization', 'Bearer not-a-jwt').expect(200);
    expect(res.body).toEqual({ user: null });
  });

  it('revoked token → guest', async () => {
    const { token, jti } = fresh(found());
    revokedJtis.add(jti);
    const res = await request(app).get('/public').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ user: null });
  });

  it('banned user → guest', async () => {
    const { token } = fresh(found({ is_banned: true }));
    const res = await request(app).get('/public').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ user: null });
  });

  it('valid token → user attached', async () => {
    const { token, sub } = fresh(found());
    const res = await request(app).get('/public').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ user: sub });
  });

  it('Postgres failure → 503 AUTH_UNAVAILABLE instead of silently becoming a guest', async () => {
    const { token } = fresh(failing(tooManyClients()));
    const res = await request(app).get('/public').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
    expect(res.body).toEqual(unavailable);
    expect(loggerError).toHaveBeenCalledWith(expect.objectContaining({ where: 'optionalAuth' }), expect.any(String));
  });
});
