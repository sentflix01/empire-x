'use strict';
/**
 * Integration tests for backend/routes/wallet.ts
 * Feature: professional-grade-upgrade
 * Requirements: 4.1, 4.4, 4.5, 4.7
 *
 * The wallet service is transactional: balances move through atomicWalletOp
 * (BEGIN → SELECT … FOR UPDATE → UPDATE + ledger INSERT → COMMIT) executed on
 * a dedicated client from pool.connect(). These tests mock that client.
 */

const request = require('supertest');
const express = require('express');
const mockPool = require('../helpers/mockPool');

// Mock the auth middleware so requireAuth/requireAdmin don't check real tokens
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, _res, next) => { if (!req.user) req.user = { id: 'user-1', role: 'user' }; next(); },
  requireAdmin: (req, res, next) => { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' }); next(); },
  optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('../../lib/auditLogger', () => ({ auditLog: jest.fn().mockResolvedValue(undefined) }));

const walletRouter = require('../../routes/wallet');

function buildApp(role = 'user') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { id: 'user-1', role }; next(); });
  app.use('/api/wallet', walletRouter);
  return app;
}

/** Install a scripted transaction client on pool.connect(). */
function mockTransactionClient(handler) {
  const clientQuery = jest.fn(handler);
  mockPool.connect.mockResolvedValue({ query: clientQuery, release: jest.fn() });
  return clientQuery;
}

describe('GET /api/wallet/me', () => {
  it('returns wallet with transactions', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'wallet-1', user_id: 'user-1', balance: 500 }] }) // getOrCreateWallet
      .mockResolvedValueOnce({ rows: [] }); // transactions
    const res = await request(buildApp()).get('/api/wallet/me');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('balance');
  });

  it('returns 500 INTERNAL_ERROR on db failure', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('db error'));
    const res = await request(buildApp()).get('/api/wallet/me');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('code', 'INTERNAL_ERROR');
  });
});

describe('wallet no longer accepts money (NodBusiness never holds funds)', () => {
  it.each(['/api/wallet/topup', '/api/wallet/topup/chapa', '/api/wallet/topup/stripe', '/api/wallet/debit', '/api/wallet/refund'])('%s answers 410 without touching the database', async (path) => {
    mockPool.query.mockClear();
    mockPool.connect.mockClear();
    const res = await request(buildApp()).post(path).send({ amount: 500, user_id: 'user-2' });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('PLATFORM_COLLECTION_RETIRED');
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(mockPool.connect).not.toHaveBeenCalled();
  });
});

describe('POST /api/wallet/withdraw', () => {
  it('returns 422 VALIDATION_ERROR when amount is missing', async () => {
    const res = await request(buildApp()).post('/api/wallet/withdraw').send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 422 when balance is insufficient', async () => {
    mockTransactionClient(async (sql) => {
      if (sql.startsWith('BEGIN') || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
      if (sql.includes('SELECT * FROM wallets')) return { rows: [{ id: 'wallet-1', user_id: 'user-1', balance: '50' }] };
      if (sql.includes('FOR UPDATE')) return { rows: [{ id: 'wallet-1', balance: '50' }] };
      return { rows: [] };
    });
    const res = await request(buildApp()).post('/api/wallet/withdraw').send({
      amount: 500,
      bank_name: 'CBE',
      account_number: '1234567890',
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it('returns 200 on successful withdrawal', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // admin notification INSERT (fire-and-forget)
    mockTransactionClient(async (sql) => {
      if (sql.startsWith('BEGIN') || sql === 'COMMIT') return { rows: [] };
      if (sql.includes('SELECT * FROM wallets')) return { rows: [{ id: 'wallet-1', user_id: 'user-1', balance: '1000' }] };
      if (sql.includes('FOR UPDATE')) return { rows: [{ id: 'wallet-1', balance: '1000' }] };
      if (sql.includes('UPDATE wallets SET balance')) return { rows: [{ id: 'wallet-1', balance: '800' }] };
      if (sql.includes('INSERT INTO wallet_transactions')) return { rows: [{ id: 'tx-2' }] };
      return { rows: [] };
    });
    const res = await request(buildApp()).post('/api/wallet/withdraw').send({
      amount: 200,
      bank_name: 'CBE',
      account_number: '1234567890',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});
