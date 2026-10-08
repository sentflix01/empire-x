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

  test('does not allow production TLS to be disabled', () => {
    const options = migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'production', DATABASE_URL_REQUIRE_TLS: 'false',
    });
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(new URL(options.connectionString).searchParams.get('sslmode')).toBe('verify-full');
  });

  test('includes the configured root CA and forces full verification', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const caFile = path.join(__dirname, '../certs/prod-ca-2021.crt');
    const options = migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'production', DB_SSL_CA_FILE: caFile,
    });
    expect(options.ssl.ca).toBe(fs.readFileSync(caFile, 'utf8'));
    expect(new URL(options.connectionString).searchParams.get('sslrootcert')).toBe(caFile);
    expect(new URL(options.connectionString).searchParams.get('sslmode')).toBe('verify-full');
  });
});
