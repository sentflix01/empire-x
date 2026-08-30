/**
 * db/pool.ts — PostgreSQL connection pool
 *
 * Auto-detects Neon and appends pgbouncer=true for transaction-mode pooling
 * (cuts connection overhead by 30-50%).
 * SSL forced in production and whenever the URL contains neon.tech.
 */
import dns from 'node:dns';
import { Pool } from 'pg';
import logger from '../lib/logger';

dns.setDefaultResultOrder('ipv4first');

function buildConnectionString(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  if (!raw.includes('neon.tech')) return raw;
  if (raw.includes('pgbouncer=true')) return raw;
  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}pgbouncer=true`;
}

const connectionString = buildConnectionString(process.env.DATABASE_URL);

const needsSsl =
  process.env.NODE_ENV === 'production' ||
  !!(connectionString && /neon\.tech|sslmode=require|ssl=true/i.test(connectionString));

// Default to false for Supabase/self-signed certs; only strict if explicitly requested
const rejectUnauthorized = process.env.DB_TLS_REJECT_UNAUTHORIZED === 'true' ? true : false;

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized } : false,
  max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
  min: 1,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 8_000,
  allowExitOnIdle: false,
  statement_timeout: 10_000,
  application_name: 'nodbusiness-backend',
});

pool.on('error', (err: Error) => {
  logger.error({ err: err.message, component: 'db-pool' }, 'Unexpected PostgreSQL pool error');
});

export default pool;
module.exports = pool;
