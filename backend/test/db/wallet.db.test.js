'use strict';

/**
 * Wallet (audit F-051), real Postgres. NodBusiness no longer accepts money
 * into wallets; people can still withdraw an existing balance. Checks: the
 * balance never goes negative or becomes NaN, concurrent withdrawals cannot
 * overspend, every change leaves a transaction row, and money-in routes are 410.
 */
const request = require('supertest');
const express = require('express');
const { pool, createUser, accessToken, deleteUser } = require('./helpers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/wallet', require('../../routes/wallet'));
  return app;
}

let app; let person;
const auth = () => ({ Authorization: `Bearer ${accessToken(person.id)}` });
const balance = async () => (await pool.query('SELECT balance::text AS b FROM wallets WHERE user_id = $1', [person.id])).rows[0]?.b;
const setBalance = (v) => pool.query(
  `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, $2, 'ETB')
   ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance`, [person.id, v],
);
const withdraw = (amount) => request(app).post('/api/wallet/withdraw').set(auth()).send({ amount, bank_name: 'CBE', account_number: '1000' });

beforeAll(async () => { app = buildApp(); person = await createUser(); });
afterAll(async () => { await deleteUser(person.id); });

describe('withdrawing an existing balance', () => {
  it('takes the amount off the balance and records a transaction', async () => {
    await setBalance('100.00');
    const res = await withdraw(40.5);
    expect(res.status).toBe(200);
    expect(await balance()).toBe('59.50');
    const { rows } = await pool.query(
      `SELECT t.type, t.amount::text AS amount FROM wallet_transactions t JOIN wallets w ON w.id = t.wallet_id
        WHERE w.user_id = $1 ORDER BY t.created_at DESC LIMIT 1`, [person.id],
    );
    expect(rows[0]).toEqual({ type: 'withdrawal', amount: '40.50' });
  });

  it('refuses more than the balance and leaves it unchanged', async () => {
    const res = await withdraw(1000);
    expect(res.status).toBe(422);
    expect(await balance()).toBe('59.50');
  });

  it.each([['abc'], ['NaN'], ['Infinity'], [-5], [0], ['1e400'], [0.001], [1.234], [{}], [[10]], [true]])(
    'rejects the amount %p without touching the balance', async (amount) => {
      const res = await withdraw(amount);
      expect(res.status).toBe(422);
      expect(await balance()).toBe('59.50');
    },
  );

  it('lets only as many concurrent withdrawals through as the balance covers', async () => {
    await setBalance('50.00');
    const results = await Promise.all(Array.from({ length: 10 }, () => withdraw(10)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(5);
    expect(results.filter((r) => r.status === 422)).toHaveLength(5);
    expect(await balance()).toBe('0.00');
  });
});

describe('money in is retired', () => {
  it.each(['/topup', '/debit', '/refund', '/topup/chapa', '/topup/stripe'])('POST %s answers 410', async (path) => {
    const res = await request(app).post(`/api/wallet${path}`).set(auth()).send({ amount: 10 });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('PLATFORM_COLLECTION_RETIRED');
  });
});

describe('the menus show Wallet only while there is a balance (F-047)', () => {
  it('/api/auth/me reports has_wallet_balance', async () => {
    const authApp = express();
    authApp.use(express.json());
    authApp.use('/api/auth', require('../../routes/auth'));
    const me = async () => (await request(authApp).get('/api/auth/me').set(auth()).expect(200)).body.has_wallet_balance;
    await setBalance('12.50');
    expect(await me()).toBe(true);
    await setBalance('0.00');
    expect(await me()).toBe(false);
    await pool.query('DELETE FROM wallets WHERE user_id = $1', [person.id]);
    expect(await me()).toBe(false);
  });
});
