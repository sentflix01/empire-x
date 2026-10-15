import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import pool from '../db/pool';

// Audit 2026-10-15 F-H1: an attacker who registers a victim's email first must
// not keep a working password after the victim registers or uses Google.

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hash:${password}`)),
  compare: jest.fn().mockResolvedValue(false),
}));
jest.mock('../utils/mailer', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/redis', () => ({ getRedis: () => null }));
jest.mock('../middleware/auth', () => ({
  requireAuth: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const authRouter = require('../routes/auth');

const mockPool = pool as unknown as { query: jest.Mock };
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);

const findCall = (pattern: RegExp) => mockPool.query.mock.calls.find(([sql]) => pattern.test(String(sql)));

beforeEach(() => {
  jest.clearAllMocks();
  mockPool.query.mockReset();
  mockPool.query.mockResolvedValue({ rows: [] });
  process.env.GOOGLE_CLIENT_ID = 'test-client';
});

describe('POST /register on an existing unverified account', () => {
  it('replaces the stored password hash with the new registrant\'s', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', is_verified: false, is_banned: false }] });
    const response = await request(app).post('/api/auth/register')
      .send({ email: 'Victim@Example.com', password: 'victim-password', full_name: 'Victim' });
    expect(response.status).toBe(200);
    expect(response.body.pendingVerification).toBe(true);
    const update = findCall(/^UPDATE users SET/);
    expect(update![0]).toContain('password_hash = $1');
    expect(update![0]).toContain('is_verified = FALSE');
    expect(update![1][0]).toBe('hash:victim-password');
    expect(update![1][1]).toBe('Victim');
    expect(update![1][4]).toBe('user-1');
  });

  it('still refuses to touch a verified account', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', is_verified: true, is_banned: false }] });
    const response = await request(app).post('/api/auth/register').send({ email: 'a@example.com', password: 'whatever-123' });
    expect(response.status).toBe(409);
    expect(findCall(/^UPDATE users/)).toBeUndefined();
  });
});

describe('POST /google', () => {
  const ticket = (payload: Record<string, unknown>) => ({ getPayload: () => payload });

  it('rejects a token whose email Google has not verified', async () => {
    mockVerifyIdToken.mockResolvedValueOnce(ticket({ sub: 'g-1', email: 'victim@example.com', email_verified: false }));
    const response = await request(app).post('/api/auth/google').send({ id_token: 'tok' });
    expect(response.status).toBe(401);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('clears the password of an unverified local account it links', async () => {
    mockVerifyIdToken.mockResolvedValueOnce(ticket({ sub: 'g-1', email: 'victim@example.com', email_verified: true, name: 'Victim' }));
    mockPool.query
      .mockResolvedValueOnce({ rows: [] }) // no google-linked user
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', is_verified: false }] }); // attacker's pre-registration
    const response = await request(app).post('/api/auth/google').send({ id_token: 'tok' });
    expect(response.status).toBe(200);
    const link = findCall(/^UPDATE users SET provider/);
    expect(link![0]).toContain('password_hash = NULL');
    expect(link![0]).toContain('is_verified = TRUE');
    expect(link![1]).toEqual(['google', 'g-1', 'Victim', 'user-1']);
  });

  it('keeps the password of a verified local account it links', async () => {
    mockVerifyIdToken.mockResolvedValueOnce(ticket({ sub: 'g-1', email: 'owner@example.com', email_verified: true }));
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'user-2', is_verified: true }] });
    const response = await request(app).post('/api/auth/google').send({ id_token: 'tok' });
    expect(response.status).toBe(200);
    const link = findCall(/^UPDATE users SET provider/);
    expect(link![0]).not.toContain('password_hash');
    expect(link![1]).toEqual(['google', 'g-1', 'user-2']);
  });
});
