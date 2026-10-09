// Most backend tests replace the pool with a query mock. This test exercises
// only the pure URL normalizer, so load the real module explicitly.
jest.unmock('../db/pool');
const pool = require('../db/pool');

describe('database connection string normalization', () => {
  test('leaves a direct Supabase URL unchanged', () => {
    const url = 'postgresql://postgres:password@db.tpgzlokgnjxcerexxoda.supabase.co:5432/postgres?sslmode=require';
    expect(pool.buildConnectionString(url)).toBe(url);
  });

  test('marks a Supabase transaction pooler endpoint as transaction pooled', () => {
    const url = 'postgresql://postgres.tpgzlokgnjxcerexxoda:password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
    expect(pool.buildConnectionString(url)).toBe(`${url}?pgbouncer=true`);
  });

  test('does not double-add pgbouncer=true', () => {
    const url = 'postgresql://postgres.ref:password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    expect(pool.buildConnectionString(url)).toBe(url);
  });

  test('uses the bundled Supabase CA when no dashboard CA path is configured', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const previousCa = process.env.DB_SSL_CA_FILE;
    delete process.env.DB_SSL_CA_FILE;
    try {
      const options = pool.buildPoolOptions(
        'postgresql://postgres.ref:password@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require',
        'real',
      );
      const caFile = path.resolve(process.cwd(), 'certs', 'prod-ca-2021.crt');
      expect(options.ssl.ca).toBe(fs.readFileSync(caFile, 'utf8'));
      expect(new URL(options.connectionString).searchParams.has('sslmode')).toBe(false);
    } finally {
      if (previousCa === undefined) delete process.env.DB_SSL_CA_FILE;
      else process.env.DB_SSL_CA_FILE = previousCa;
    }
  });
});
