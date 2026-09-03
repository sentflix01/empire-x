/**
 * db/pool.ts — PostgreSQL connection pool
 *
 * Auto-detects Supabase and Neon pooler URLs, and marks only those URLs as
 * transaction-pooled. A direct Neon endpoint must not be treated as PgBouncer.
 * SSL forced in production and whenever the URL contains a known cloud DB host.
 */
import dns from 'node:dns';
import { Pool } from 'pg';
import logger from '../lib/logger';

// Force IPv4 — Render free tier does not support IPv6 outbound connections.
// Supabase direct connections resolve to IPv6; the pooler resolves to IPv4.
dns.setDefaultResultOrder('ipv4first');

// Neon pooled endpoint IDs include "-pooler"; Supabase poolers use a distinct
// hostname. Direct Neon endpoints deliberately do not match this expression.
const POOLER_HOSTS = /-pooler(?:\.|:|\/)|\.pooler\.supabase\.com/i;

export function buildConnectionString(raw: string | undefined): string | undefined {
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

// Supabase pooler uses valid certs, but Render's outbound TLS stack can surface
// self-signed cert errors on certain paths. Default to false to avoid blocking
// valid connections; strict validation can be enabled via DB_TLS_REJECT_UNAUTHORIZED=true.
const rejectUnauthorized = process.env.DB_TLS_REJECT_UNAUTHORIZED === 'true' ? true : false;

const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized } : false,
  max: parseInt(process.env.DB_POOL_MAX ?? '5', 10),
  // Keeping an idle connection open prevents a Neon free-plan compute from
  // suspending. New connections are created on demand by pg.Pool.
  min: parseInt(process.env.DB_POOL_MIN ?? '0', 10),
  idleTimeoutMillis: 60_000,
  // A suspended Neon compute can need longer than a conventional LAN database
  // to resume. This remains configurable for hosts with tighter SLAs.
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? '15000', 10),
  allowExitOnIdle: false,
  statement_timeout: 10_000,
  application_name: 'nodbusiness-backend',
});

pool.on('error', (err: Error) => {
  logger.error({ err: err.message, component: 'db-pool' }, 'Unexpected PostgreSQL pool error');
});

export default pool;
module.exports = pool;
module.exports.buildConnectionString = buildConnectionString;
