'use strict';

const request = require('supertest');
const express = require('express');
const pool = require('../helpers/mockPool');

let currentUser = { id: 'user-1', role: 'user', is_demo: false };
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.user = currentUser; next(); },
  optionalAuth: (_req, _res, next) => next(),
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../socket', () => ({ forceDisconnectUser: jest.fn() }));
jest.mock('../../lib/accountData', () => ({
  exportAccountData: jest.fn().mockResolvedValue({ account: { id: 'user-1' } }),
  deletionBlocker: jest.fn().mockResolvedValue(null),
  anonymizeAccount: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn(async (pw) => pw === 'right'), hash: jest.fn() }));

const accountData = require('../../lib/accountData');
const auth = require('../../routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', auth);
  return app;
}

function mockClient(userRow, adminCount = 2) {
  const client = { query: jest.fn(), release: jest.fn() };
  client.query.mockImplementation(async (sql) => {
    if (/SELECT password_hash, role/.test(sql)) return { rows: userRow ? [userRow] : [] };
    if (/COUNT\(\*\)::int AS n FROM users WHERE role = 'admin'/.test(sql)) return { rows: [{ n: adminCount }] };
    return { rows: [] };
  });
  pool.connect.mockResolvedValueOnce(client);
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = { id: 'user-1', role: 'user', is_demo: false };
});

describe('account export and deletion', () => {
  it('exports with an attachment header', async () => {
    const res = await request(buildApp()).get('/api/auth/me/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="nodbusiness-data-/);
    expect(accountData.exportAccountData).toHaveBeenCalledWith('user-1');
  });

  it('requires the typed DELETE confirmation', async () => {
    const res = await request(buildApp()).delete('/api/auth/me').send({ password: 'right' });
    expect(res.status).toBe(422);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('refuses demo accounts', async () => {
    currentUser = { ...currentUser, is_demo: true };
    const res = await request(buildApp()).delete('/api/auth/me').send({ confirm: 'DELETE' });
    expect(res.status).toBe(403);
  });

  it('rejects a wrong password for password accounts', async () => {
    const client = mockClient({ password_hash: 'hash', role: 'user' });
    const res = await request(buildApp()).delete('/api/auth/me').send({ password: 'wrong', confirm: 'DELETE' });
    expect(res.status).toBe(401);
    expect(accountData.anonymizeAccount).not.toHaveBeenCalled();
    expect(client.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
  });

  it('protects the last admin', async () => {
    currentUser = { ...currentUser, role: 'admin' };
    mockClient({ password_hash: null, role: 'admin' }, 1);
    const res = await request(buildApp()).delete('/api/auth/me').send({ confirm: 'DELETE' });
    expect(res.status).toBe(409);
    expect(accountData.anonymizeAccount).not.toHaveBeenCalled();
  });

  it('reports why deletion is blocked', async () => {
    mockClient({ password_hash: null, role: 'user' });
    accountData.deletionBlocker.mockResolvedValueOnce({ code: 'WALLET_BALANCE', message: 'Withdraw first' });
    const res = await request(buildApp()).delete('/api/auth/me').send({ confirm: 'DELETE' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('WALLET_BALANCE');
  });

  it('anonymizes inside a transaction and clears the refresh cookie', async () => {
    const client = mockClient({ password_hash: 'hash', role: 'user' });
    const res = await request(buildApp()).delete('/api/auth/me').send({ password: 'right', confirm: 'DELETE' });
    expect(res.status).toBe(200);
    expect(accountData.anonymizeAccount).toHaveBeenCalledWith(client, 'user-1');
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT']));
    expect(String(res.headers['set-cookie'])).toMatch(/refresh_token=;/);
    expect(require('../../middleware/auth').invalidateUserCache).toHaveBeenCalledWith('user-1');
    expect(require('../../socket').forceDisconnectUser).toHaveBeenCalledWith('user-1');
  });
});

describe('deletionBlocker', () => {
  const { deletionBlocker } = jest.requireActual('../../lib/accountData');

  it('blocks a positive wallet balance', async () => {
    const db = { query: jest.fn().mockResolvedValueOnce({ rows: [{ balance: '12.50' }] }) };
    expect((await deletionBlocker('u', db)).code).toBe('WALLET_BALANCE');
  });

  it('blocks open orders and allows a settled account', async () => {
    const db = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ balance: '0.00' }] }).mockResolvedValueOnce({ rows: [{ n: 2 }] })
      .mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ n: 0 }] }) };
    expect((await deletionBlocker('u', db)).code).toBe('OPEN_ORDERS');
    expect(await deletionBlocker('u', db)).toBeNull();
  });
});
