jest.unmock('../db/poolJsShim.cjs');
const migrationPool = require('../db/poolJsShim.cjs');

describe('migration pool TLS options', () => {
  test('requires certificate-verified TLS for any production database host', () => {
    expect(migrationPool.poolOptions('postgresql://user:pass@db.internal/app', { NODE_ENV: 'production' }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });

  test('requires verified TLS for hosted database URLs outside production', () => {
    const ssl = migrationPool.poolOptions('postgresql://user:pass@db.example.supabase.co/app', { NODE_ENV: 'test' }).ssl;
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toContain('BEGIN CERTIFICATE');
  });

  test('keeps production TLS and certificate verification enabled despite insecure overrides', () => {
    expect(migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'production', DATABASE_URL_REQUIRE_TLS: 'false',
    }).ssl).toEqual({ rejectUnauthorized: true });
    expect(migrationPool.poolOptions('postgresql://user:pass@db.internal/app', {
      NODE_ENV: 'test', DATABASE_URL_REQUIRE_TLS: 'true', DB_TLS_REJECT_UNAUTHORIZED: 'false',
    }).ssl).toEqual({ rejectUnauthorized: true });
  });

  test('uses the bundled Supabase root CA when no explicit CA path is provided', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const options = migrationPool.poolOptions(
      'postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require',
      { NODE_ENV: 'production' },
    );
    expect(options.ssl.ca).toBe(fs.readFileSync(path.resolve(process.cwd(), 'certs', 'prod-ca-2021.crt'), 'utf8'));
    expect(new URL(options.connectionString).searchParams.has('sslmode')).toBe(false);
  });

  test('keeps schema search_path while removing conflicting TLS URI options', () => {
    const options = migrationPool.poolOptions(
      'postgresql://user:pass@db.internal/app?sslmode=require&sslrootcert=%2Fold%2Fca.crt&application_name=api',
      { NODE_ENV: 'production', DATABASE_SCHEMA: 'demo' },
    );
    const query = new URL(options.connectionString).searchParams;
    expect(query.get('application_name')).toBe('api');
    expect(query.get('options')).toBe('-c search_path=demo,pg_catalog');
    expect(query.has('sslmode')).toBe(false);
    expect(query.has('sslrootcert')).toBe(false);
    expect(options.ssl.rejectUnauthorized).toBe(true);
  });
});
