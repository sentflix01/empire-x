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
});
