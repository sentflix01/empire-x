/**
 * db/pool.ts — PostgreSQL connection pool
 *
 * Auto-detects Supabase pooler and Neon URLs, appends pgbouncer=true for
 * transaction-mode pooling (cuts connection overhead by 30-50%).
 * SSL forced in production and whenever the URL contains a known cloud DB host.
 */
import dns from 'node:dns';
import { Pool } from 'pg';
import logger from '../lib/logger';

// Force IPv4 — Render free tier does not support IPv6 outbound connections.
// Supabase direct connections resolve to IPv6; the pooler resolves to IPv4.
dns.setDefaultResultOrder('ipv4first');

// Supabase pooler hostnames: *.pooler.supabase.com
const POOLER_HOSTS = /neon\.tech|\.pooler\.supabase\.com/i;

function buildConnectionString(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  if (!POOLER_HOSTS.test(raw)) return raw;
  if (raw.includes('pgbouncer=true')) return raw;
  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}pgbouncer=true`;
}

const connectionString = buildConnectionString(process.env.DATABASE_URL);

const needsSsl =
  process.env.NODE_ENV === 'production' ||
  !!(connectionString && /neon\.tech|supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(connectionString));

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
