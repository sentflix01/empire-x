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

  test('ignores legacy certificate-verification opt-outs', () => {
    const options = getPoolOptions('postgresql://db.internal/app', {
      NODE_ENV: 'production',
      DB_TLS_REJECT_UNAUTHORIZED: 'false',
    });
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(new URL(options.connectionString).searchParams.has('sslmode')).toBe(false);
  });

  test('does not allow hosted production TLS to be disabled', () => {
    const options = getPoolOptions('postgresql://db.internal/app', {
      NODE_ENV: 'production',
      DATABASE_URL_REQUIRE_TLS: 'false',
    });
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(new URL(options.connectionString).searchParams.has('sslmode')).toBe(false);
  });

  test('keeps the trusted CA in explicit SSL options without conflicting URI options', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const caFile = path.join(__dirname, '../certs/prod-ca-2021.crt');
    const options = getPoolOptions('postgresql://db.internal/app', {
      NODE_ENV: 'production', DB_SSL_CA_FILE: caFile,
    });
    expect(options.ssl.ca).toBe(fs.readFileSync(caFile, 'utf8'));
    const query = new URL(options.connectionString).searchParams;
    for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
      expect(query.has(key)).toBe(false);
    }
  });

  test('removes all URI TLS options while preserving unrelated connection parameters', () => {
    const options = getPoolOptions(
      'postgresql://db.internal/app?sslmode=require&sslrootcert=%2Fold%2Fca.crt&sslcert=client.crt&sslkey=client.key&application_name=api',
      { NODE_ENV: 'production' },
    );
    const query = new URL(options.connectionString).searchParams;
    expect(query.get('application_name')).toBe('api');
    for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
      expect(query.has(key)).toBe(false);
    }
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
  });
});
