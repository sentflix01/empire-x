const { getPoolOptions } = require('../scripts/verify-db');

describe('database verifier TLS policy', () => {
  test('requires verified TLS for production databases regardless of hostname', () => {
    expect(getPoolOptions('postgresql://db.internal/app', { NODE_ENV: 'production' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  test('verifies certificates for known hosted database URLs outside production', () => {
    const ssl = getPoolOptions('postgresql://db.example.supabase.co/app', { NODE_ENV: 'test' }).ssl;
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toContain('BEGIN CERTIFICATE');
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

  test('uses the bundled Supabase root CA when no CA file is configured', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const options = getPoolOptions(
      'postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require',
      { NODE_ENV: 'production' },
    );
    expect(options.ssl.ca).toBe(fs.readFileSync(path.resolve(process.cwd(), 'certs', 'prod-ca-2021.crt'), 'utf8'));
    expect(new URL(options.connectionString).searchParams.has('sslmode')).toBe(false);
  });

  test('removes conflicting TLS URI parameters and preserves unrelated parameters', () => {
    const options = getPoolOptions(
      'postgresql://db.internal/app?sslmode=require&sslrootcert=%2Fold%2Fca.crt&sslcert=client.crt&sslkey=client.key&application_name=api',
      { NODE_ENV: 'production' },
    );
    const query = new URL(options.connectionString).searchParams;
    expect(query.get('application_name')).toBe('api');
    for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey']) expect(query.has(key)).toBe(false);
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
  });
});
