// Most backend tests replace the pool with a query mock. This test exercises
// only the pure URL normalizer, so load the real module explicitly.
jest.unmock('../db/pool');
const pool = require('../db/pool');

describe('database connection string normalization', () => {
  test('leaves a direct Neon endpoint unchanged', () => {
    const url = 'postgresql://user:password@ep-blue-water-123.us-east-1.aws.neon.tech/neondb?sslmode=require';
    expect(pool.buildConnectionString(url)).toBe(url);
  });

  test('marks a Neon pooler endpoint as transaction pooled', () => {
    const url = 'postgresql://user:password@ep-blue-water-123-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
    expect(pool.buildConnectionString(url)).toBe(`${url}&pgbouncer=true`);
  });

  test('marks a Supabase transaction pooler endpoint as transaction pooled', () => {
    const url = 'postgresql://user:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
    expect(pool.buildConnectionString(url)).toBe(`${url}?pgbouncer=true`);
  });
});
