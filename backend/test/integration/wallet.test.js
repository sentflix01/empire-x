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

describe('POST /api/wallet/topup', () => {
  it('returns 422 VALIDATION_ERROR when amount is missing', async () => {
    const res = await request(buildApp()).post('/api/wallet/topup').send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('returns 200 and credits the balance inside a committed transaction', async () => {
    const clientQuery = mockTransactionClient(async (sql) => {
      if (sql.startsWith('BEGIN') || sql === 'COMMIT') return { rows: [] };
      if (sql.includes('SELECT * FROM wallets')) return { rows: [{ id: 'wallet-1', user_id: 'user-1', balance: '0' }] };
      if (sql.includes('FOR UPDATE')) return { rows: [{ id: 'wallet-1', balance: '0' }] };
      if (sql.includes('UPDATE wallets SET balance')) return { rows: [{ id: 'wallet-1', user_id: 'user-1', balance: '500' }] };
      if (sql.includes('INSERT INTO wallet_transactions')) return { rows: [{ id: 'tx-1' }] };
      return { rows: [] };
    });

    const res = await request(buildApp()).post('/api/wallet/topup').send({ amount: 500 });
    expect(res.status).toBe(200);

    const sqls = clientQuery.mock.calls.map(c => c[0]);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[sqls.length - 1]).toBe('COMMIT');
    const creditCall = clientQuery.mock.calls.find(c => c[0].includes('UPDATE wallets SET balance'));
    expect(creditCall).toBeTruthy();
    expect(creditCall[1]).toEqual([500, 'wallet-1']);
  });

  it('returns 403 for non-admin user in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp()).post('/api/wallet/topup').send({ amount: 500 });
    expect(res.status).toBe(403);
    process.env.NODE_ENV = originalNodeEnv;
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
