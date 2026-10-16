import fs from 'node:fs';
import path from 'node:path';
import { discoverMigrationFiles } from '../db/migrate-all';

describe('subscription billing currency migration', () => {
  it('runs after the current subscription lifecycle migrations', () => {
    const migrations = discoverMigrationFiles();
    expect(migrations.indexOf('migrate49.js')).toBeLessThan(migrations.indexOf('migrate50.js'));
    expect(migrations.indexOf('migrate50.js')).toBeLessThan(migrations.indexOf('migrate51.js'));
  });

  it('defaults existing subscriptions to ETB and constrains values to ETB or USD', () => {
    const migration = fs.readFileSync(path.join(__dirname, '../db/migrate51.js'), 'utf8');
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ETB'");
    expect(migration).toContain("CHECK (currency IN ('ETB', 'USD'))");
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS business_subscriptions_currency_check');
  });

  it('uses a transaction and releases the migration client', async () => {
    const queries: string[] = [];
    const client = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    const migration = require('../db/migrate51.js') as (pool: unknown) => Promise<void>;

    await migration({ connect: async () => client });

    expect(queries[0]).toBe('BEGIN');
    expect(queries[queries.length - 1]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
