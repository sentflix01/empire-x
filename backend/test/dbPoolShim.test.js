jest.unmock('../db/poolJsShim.cjs');
const migrationPool = require('../db/poolJsShim.cjs');

describe('migration pool TLS options', () => {
  test('requires certificate-verified TLS for any production database host', () => {
    expect(migrationPool.poolOptions('postgresql://user:pass@db.internal/app', { NODE_ENV: 'production' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  test('requires verified TLS for hosted database URLs outside production', () => {
    expect(migrationPool.poolOptions('postgresql://user:pass@db.example.supabase.co/app', { NODE_ENV: 'test' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  test('keeps production TLS and certificate verification enabled despite insecure overrides', () => {
    expect(migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'production', DATABASE_URL_REQUIRE_TLS: 'false',
    }).ssl).toEqual({ rejectUnauthorized: true });
    expect(migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'test', DATABASE_URL_REQUIRE_TLS: 'true', DB_TLS_REJECT_UNAUTHORIZED: 'false',
    }).ssl).toEqual({ rejectUnauthorized: true });
  });
});
