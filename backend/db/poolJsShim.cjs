/**
 * pool.js — CommonJS shim for migration scripts.
 *
 * Migration files (migrate.js, migrate2.js … migrate26.js) are plain JS and
 * run directly with Node without a TypeScript compilation step. They all use:
 *
 *   const pool = require('./pool');
 *
 * pool.ts is the authoritative source but TypeScript is not compiled before
 * migrations run in CI. This shim reproduces the same Pool setup so that
 * migration scripts can require('./pool') and get a working pg.Pool instance.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const dns = require('dns');
const fs = require('fs');

// Force IPv4 — Render free tier does not support IPv6 outbound connections.
dns.setDefaultResultOrder('ipv4first');

function buildConnectionString(raw) {
  if (!raw) return raw;
  // Supabase pooler endpoints need pgbouncer=true for transaction-mode pooling
  if (!/\.pooler\.supabase\.com/i.test(raw)) return raw;
  if (raw.includes('pgbouncer=true')) return raw;
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}pgbouncer=true`;
}

function poolOptions(rawUrl, env = process.env) {
  let connectionString = buildConnectionString(rawUrl);
  const tlsOverride = env.DATABASE_URL_REQUIRE_TLS;
  const needsSsl = tlsOverride === 'true' || env.NODE_ENV === 'production' ||
    !!(connectionString && /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(connectionString));
  // Keep certificate and hostname verification enabled. A private root CA can
  // be supplied through DB_SSL_CA_FILE.
  const caFile = env.DB_SSL_CA_FILE;
  if (needsSsl && connectionString) {
    const parsed = new URL(connectionString);
    // node-postgres replaces the explicit `ssl` object when SSL parameters are
    // present in the URI. Keep the policy and CA exclusively in `ssl` below.
    for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
      parsed.searchParams.delete(key);
    }
    connectionString = parsed.toString();
  }
  const ssl = needsSsl
    ? { rejectUnauthorized: true, ...(caFile ? { ca: fs.readFileSync(caFile, 'utf8') } : {}) }
    : false;

  return {
    connectionString,
    ssl,
    max: parseInt(env.DB_POOL_MAX || '5', 10),
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: parseInt(env.DB_CONNECTION_TIMEOUT_MS || '15000', 10),
    allowExitOnIdle: false,
  };
}

const pool = new Pool(poolOptions(process.env.DATABASE_URL));

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
module.exports.buildConnectionString = buildConnectionString;
module.exports.poolOptions = poolOptions;
