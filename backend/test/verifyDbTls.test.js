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

  test('keeps certificate verification enabled when the obsolete insecure opt-out is supplied', () => {
    expect(getPoolOptions('postgresql://db.internal/app', {
      NODE_ENV: 'production',
      DB_TLS_REJECT_UNAUTHORIZED: 'false',
    }).ssl).toEqual({ rejectUnauthorized: true });
  });

  test('does not allow disabling TLS for production databases', () => {
    expect(getPoolOptions('postgresql://db.internal/app', {
      NODE_ENV: 'production',
      DATABASE_URL_REQUIRE_TLS: 'false',
    }).ssl).toEqual({ rejectUnauthorized: true });
  });
});
