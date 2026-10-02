const { getPoolOptions } = require('../scripts/verify-db');

describe('database verifier TLS policy', () => {
  test('requires verified TLS for production databases regardless of hostname', () => {
    expect(getPoolOptions('postgresql://db.internal/app', { NODE_ENV: 'production' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  test('verifies certificates for known hosted database URLs outside production', () => {
    expect(getPoolOptions('postgresql://db.example.supabase.co/app', { NODE_ENV: 'test' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  test('allows an explicit TLS opt-out for private development certificates', () => {
    expect(getPoolOptions('postgresql://db.internal/app', {
      NODE_ENV: 'production',
      DB_TLS_REJECT_UNAUTHORIZED: 'false',
    }).ssl).toEqual({ rejectUnauthorized: false });
  });

  test('allows explicitly disabling TLS only when an operator sets the override', () => {
    expect(getPoolOptions('postgresql://db.internal/app', {
      NODE_ENV: 'production',
      DATABASE_URL_REQUIRE_TLS: 'false',
    }).ssl).toBe(false);
  });
});
