/**
 * db/pool.ts — PostgreSQL connection pool
 *
 * Auto-detects Supabase pooler URLs and marks only those as transaction-pooled.
 * SSL forced in production and whenever the URL contains a known cloud DB host.
 */
import dns from 'node:dns';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool } from 'pg';
import logger from '../lib/logger';

// Force IPv4 — Render free tier does not support IPv6 outbound connections.
// Supabase direct connections resolve to IPv6; the pooler resolves to IPv4.
dns.setDefaultResultOrder('ipv4first');

// Supabase pooler endpoints use *.pooler.supabase.com.
// Direct endpoints (Supabase or any other provider) must remain direct.
const POOLER_HOSTS = /\.pooler\.supabase\.com/i;

export function buildConnectionString(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  if (!POOLER_HOSTS.test(raw)) return raw;
  if (raw.includes('pgbouncer=true')) return raw;
  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}pgbouncer=true`;
}

export type DatabaseEnvironment = 'real' | 'demo';
export interface DatabaseContext {
  environment: DatabaseEnvironment;
  demoSessionId?: string;
  demoUserId?: string;
}

const databaseContext = new AsyncLocalStorage<DatabaseContext>();
const connectionPools = new Map<string, Pool>();

function databaseIdentity(connectionString: string): string {
  const url = new URL(connectionString);
  return `${url.hostname.toLowerCase()}:${url.port || '5432'}${url.pathname}`;
}

function poolOptions(rawUrl: string | undefined, environment: DatabaseEnvironment) {
  const connectionString = buildConnectionString(rawUrl);
  const tlsOverride = process.env[environment === 'demo' ? 'DEMO_DATABASE_URL_REQUIRE_TLS' : 'DATABASE_URL_REQUIRE_TLS'];
  const needsSsl = tlsOverride === 'true' || (tlsOverride !== 'false' && (
    process.env.NODE_ENV === 'production' ||
    !!(connectionString && /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(connectionString))
  ));
  // Verify server certificates by default. Operators using a private/self-signed
  // database certificate may explicitly opt out per environment.
  const rejectUnauthorized = environment === 'demo'
    ? process.env.DEMO_DB_TLS_REJECT_UNAUTHORIZED !== 'false'
    : process.env.DB_TLS_REJECT_UNAUTHORIZED !== 'false';

  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized } : false,
    max: parseInt(process.env[environment === 'demo' ? 'DEMO_DB_POOL_MAX' : 'DB_POOL_MAX'] ?? '5', 10),
    min: 0,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? '15000', 10),
    allowExitOnIdle: false,
    statement_timeout: 10_000,
    application_name: `nodbusiness-${environment}-backend`,
  };
}

function createPool(connectionString: string | undefined, environment: DatabaseEnvironment): Pool {
  const created = new Pool(poolOptions(connectionString, environment));
  created.on('error', (err: Error) => {
    logger.error({ err: err.message, component: `db-pool-${environment}` }, 'Unexpected PostgreSQL pool error');
  });
  return created;
}

const realPool = createPool(process.env.DATABASE_URL, 'real');
connectionPools.set('real', realPool);

function getDemoPool(): Pool {
  const demoUrl = process.env.DEMO_DATABASE_URL;
  const realUrl = process.env.DATABASE_URL;
  if (!demoUrl) throw new Error('Demo database is not configured');
  if (!realUrl || databaseIdentity(demoUrl) === databaseIdentity(realUrl)) {
    throw new Error('Demo database must be configured separately from the real database');
  }
  const key = `demo:${demoUrl}`;
  let current = connectionPools.get(key);
  if (!current) {
    current = createPool(demoUrl, 'demo');
    connectionPools.set(key, current);
  }
  return current;
}

function activePool(): Pool {
  return databaseContext.getStore()?.environment === 'demo' ? getDemoPool() : realPool;
}

const poolHelperNames = new Set([
  'buildConnectionString',
  'getCurrentDatabaseEnvironment',
  'getCurrentDatabaseContext',
  'runWithDatabaseEnvironment',
  'closeAllPools',
]);

// Existing routes import one pool object. This context-aware facade keeps those
// call sites unchanged while routing demo-session requests to the isolated DB.
const pool = new Proxy(realPool, {
  get(_target, property) {
    // These module helpers belong to the facade, not to an individual pg.Pool.
    // Returning them before selecting the active pool keeps them available from
    // inside a demo AsyncLocalStorage context as well as from real requests.
    if (property === 'buildConnectionString') return buildConnectionString;
    if (property === 'getCurrentDatabaseEnvironment') return getCurrentDatabaseEnvironment;
    if (property === 'getCurrentDatabaseContext') return getCurrentDatabaseContext;
    if (property === 'runWithDatabaseEnvironment') return runWithDatabaseEnvironment;
    if (property === 'closeAllPools') return closeAllPools;

    const current = activePool();
    const value = Reflect.get(current, property, current) as unknown;
    return typeof value === 'function' ? value.bind(current) : value;
  },
  set(_target, property, value) {
    // The CommonJS compatibility assignments below target the facade. Helper
    // exports are already served by the get trap and must never be stored on a
    // context-specific real/demo Pool instance.
    if (typeof property === 'string' && poolHelperNames.has(property)) return true;
    return Reflect.set(activePool(), property, value, activePool());
  },
}) as Pool;

export function getCurrentDatabaseEnvironment(): DatabaseEnvironment {
  return databaseContext.getStore()?.environment ?? 'real';
}

export function getCurrentDatabaseContext(): DatabaseContext {
  return databaseContext.getStore() ?? { environment: 'real' };
}

export function runWithDatabaseEnvironment<T>(context: DatabaseContext, callback: () => T): T {
  if (context.environment === 'demo') getDemoPool(); // fail closed before running demo work
  return databaseContext.run(context, callback);
}

export async function closeAllPools(): Promise<void> {
  await Promise.all([...new Set(connectionPools.values())].map((current) => current.end()));
  connectionPools.clear();
}

export default pool;
