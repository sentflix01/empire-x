import fs from 'node:fs';
import path from 'node:path';
import pool from '../db/pool';
import { collectCommission } from '../routes/commission';

const mockPool = pool as unknown as { query: jest.Mock; connect: jest.Mock };

type Client = { query: jest.Mock; release: jest.Mock };

/** A transaction client whose queries are answered by SQL fragment. */
function makeClient({ inserted = true, balance = '100.00' } = {}): Client {
  const client: Client = { query: jest.fn(), release: jest.fn() };
  client.query.mockImplementation(async (sql: string) => {
    if (sql.includes('INSERT INTO commissions')) return { rows: inserted ? [{ id: 'commission-1' }] : [] };
    if (sql.includes('SELECT * FROM wallets')) return { rows: [{ id: 'wallet-1' }] };
    if (sql.includes('FOR UPDATE')) return { rows: [{ id: 'wallet-1', balance }] };
    if (sql.includes('UPDATE wallets')) return { rows: [{ id: 'wallet-1' }] };
    if (sql.includes('INSERT INTO wallet_transactions')) return { rows: [{ id: 'tx-1' }] };
    return { rows: [] };
  });
  mockPool.connect.mockResolvedValueOnce(client);
  return client;
}

const statements = (client: Client) => client.query.mock.calls.map(([sql]) => String(sql).trim());

describe('collectCommission idempotency (F-C3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query.mockResolvedValue({ rows: [] });
  });

  it('claims the order through the order_id unique index and debits the seller in the same transaction', async () => {
    const client = makeClient();
    await collectCommission('order-1', 'seller-1', 200);

    const sql = statements(client);
    expect(sql[0]).toBe('BEGIN');
    expect(sql[1]).toContain('INSERT INTO commissions (order_id, seller_id, gross, rate, amount)');
    expect(sql[1]).toContain('ON CONFLICT (order_id) DO NOTHING RETURNING id');
    expect(client.query.mock.calls[1][1]).toEqual(['order-1', 'seller-1', 200, 0.03, 6]);

    const debit = client.query.mock.calls.find(([q]) => String(q).includes('INSERT INTO wallet_transactions'));
    expect(debit[1]).toEqual(['wallet-1', 'debit', 6, 'Platform commission (3%) for order', 'commission:order-1']);
    expect(client.query.mock.calls.find(([q]) => String(q).includes('UPDATE wallets'))[1]).toEqual([94, 'wallet-1']);
    expect(sql.at(-1)).toBe('COMMIT');
    expect(sql).not.toContain('ROLLBACK');
    // The wallet write runs on the commission transaction, not a second pool client.
    expect(mockPool.connect).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('does not debit the wallet again when the order already has a commission', async () => {
    const client = makeClient({ inserted: false });
    await collectCommission('order-1', 'seller-1', 200);

    const sql = statements(client);
    expect(sql).toEqual([
      'BEGIN',
      expect.stringContaining('ON CONFLICT (order_id) DO NOTHING RETURNING id'),
      'COMMIT',
    ]);
    expect(sql.some(q => q.includes('wallets'))).toBe(false);
  });

  it('keeps the commission record but skips the debit when the seller balance is too low', async () => {
    const client = makeClient({ balance: '1.00' });
    await collectCommission('order-1', 'seller-1', 200);

    const sql = statements(client);
    expect(sql).toContain('SAVEPOINT commission_debit');
    expect(sql).toContain('ROLLBACK TO SAVEPOINT commission_debit');
    expect(sql.some(q => q.includes('UPDATE wallets'))).toBe(false);
    expect(sql.at(-1)).toBe('COMMIT');
  });

  it('rolls back the commission row if the wallet debit fails for another reason', async () => {
    const client = makeClient();
    const original = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('UPDATE wallets')) throw new Error('connection lost');
      return original(sql, params);
    });
    await collectCommission('order-1', 'seller-1', 200);

    const sql = statements(client);
    expect(sql).toContain('ROLLBACK');
    expect(sql).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

describe('commissions unique order_id migration', () => {
  const migrate52 = require('../db/migrate52') as (p: unknown) => Promise<void>;

  it('archives duplicates, keeps the earliest row and adds a unique index in one transaction', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    const fakePool = { connect: jest.fn().mockResolvedValue(client) };
    await migrate52(fakePool);

    const sql = client.query.mock.calls.map(([q]) => String(q).replace(/\s+/g, ' ').trim());
    expect(sql[0]).toBe('BEGIN');
    expect(sql.at(-1)).toBe('COMMIT');
    const dedupe = sql.find(q => q.includes('ROW_NUMBER()'))!;
    expect(dedupe).toContain('PARTITION BY order_id ORDER BY created_at, id');
    expect(dedupe).toContain('INSERT INTO commissions_duplicates_archive');
    const createIndex = sql.findIndex(q => q.includes('CREATE UNIQUE INDEX IF NOT EXISTS commissions_order_id_unique ON commissions(order_id)'));
    expect(createIndex).toBeGreaterThan(sql.indexOf(dedupe));
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and rethrows when a step fails', async () => {
    const client = {
      query: jest.fn(async (q: string) => {
        if (q.includes('CREATE UNIQUE INDEX')) throw new Error('boom');
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    await expect(migrate52({ connect: jest.fn().mockResolvedValue(client) })).rejects.toThrow('boom');
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('is an exported-function migration', () => {
    const source = fs.readFileSync(path.join(__dirname, '../db/migrate52.js'), 'utf8');
    expect(source).toContain('module.exports = async function migrate52(pool)');
  });
});
