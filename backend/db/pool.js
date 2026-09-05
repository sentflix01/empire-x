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

const connectionString = buildConnectionString(process.env.DATABASE_URL);

const needsSsl =
  process.env.NODE_ENV === 'production' ||
  !!(connectionString &&
    /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(connectionString));

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '5', 10),
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '15000', 10),
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
module.exports.buildConnectionString = buildConnectionString;
