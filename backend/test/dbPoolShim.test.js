jest.unmock('../db/poolJsShim.cjs');
const migrationPool = require('../db/poolJsShim.cjs');

describe('migration pool TLS options', () => {
  test('requires certificate-verified TLS for any production database host', () => {
    expect(migrationPool.poolOptions('postgresql://user:pass@db.internal/app', { NODE_ENV: 'production' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  test('requires verified TLS for hosted database URLs outside production', () => {
    const options = migrationPool.poolOptions('postgresql://user:pass@db.example.supabase.co/app', { NODE_ENV: 'test' });
    expect(options.ssl.rejectUnauthorized).toBe(true);
    expect(options.ssl.ca).toContain('BEGIN CERTIFICATE');
  });

  test('does not allow production TLS to be disabled', () => {
    const options = migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'production', DATABASE_URL_REQUIRE_TLS: 'false',
    });
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(new URL(options.connectionString).searchParams.has('sslmode')).toBe(false);
  });

  test('keeps the configured root CA in explicit SSL options only', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const caFile = path.join(__dirname, '../certs/prod-ca-2021.crt');
    const options = migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'production', DB_SSL_CA_FILE: caFile,
    });
    expect(options.ssl.ca).toBe(fs.readFileSync(caFile, 'utf8'));
    const query = new URL(options.connectionString).searchParams;
    for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
      expect(query.has(key)).toBe(false);
    }
  });

  test('uses the bundled Supabase CA when DB_SSL_CA_FILE is absent', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const env = { NODE_ENV: 'production' };
    const options = migrationPool.poolOptions(
      'postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres', env,
    );
    const caFile = path.resolve(process.cwd(), 'certs', 'prod-ca-2021.crt');
    expect(options.ssl.ca).toBe(fs.readFileSync(caFile, 'utf8'));
  });
});
