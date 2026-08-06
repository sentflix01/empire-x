const { Pool } = require('pg');
const logger = require('../lib/logger');

/**
 * Build the connection string, automatically enabling PgBouncer on Neon.
 * Neon's pooler endpoint requires `pgbouncer=true` in the query string to
 * activate transaction-mode pooling, which cuts connection overhead by 30-50%.
 * We detect Neon by checking for "neon.tech" in DATABASE_URL and append the
 * param without requiring the user to change their env var.
 */
function buildConnectionString(raw) {
  if (!raw) return raw;
  if (!raw.includes('neon.tech')) return raw;
  // Already has the param — nothing to do
  if (raw.includes('pgbouncer=true')) return raw;
  // Append correctly depending on whether a query string already exists
  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}pgbouncer=true`;
}

const connectionString = buildConnectionString(process.env.DATABASE_URL);

const needsSsl =
  process.env.NODE_ENV === 'production' ||
  (connectionString && /neon\.tech|sslmode=require|ssl=true/i.test(connectionString));

// Neon free tier allows max 20 connections total across all services.
// Bumped from 5 → 10 — gives breathing room under concurrent load while
// staying within Neon free tier limits.
const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  min: 1,
  idleTimeoutMillis: 60_000,      // keep connections alive longer to avoid reconnect overhead
  connectionTimeoutMillis: 8_000,
  allowExitOnIdle: false,          // keep pool warm between requests
  statement_timeout: 10_000,       // 10 s — prevent slow queries from blocking the pool
  application_name: 'empire-x-backend', // visible in Neon dashboard → Monitoring
});

pool.on('error', (err) => {
  logger.error({ err: err.message, component: 'db-pool' }, 'Unexpected PostgreSQL pool error');
});

module.exports = pool;
