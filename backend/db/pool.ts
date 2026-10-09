/**
 * db/pool.ts — PostgreSQL connection pool
 *
 * Auto-detects Supabase pooler URLs and marks only those as transaction-pooled.
 * SSL forced in production and whenever the URL contains a known cloud DB host.
 */
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
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

function databaseRole(connectionString: string): string {
  return decodeURIComponent(new URL(connectionString).username);
}

function schemaFor(environment: DatabaseEnvironment): string {
  const configured = process.env[environment === 'demo' ? 'DEMO_DB_SCHEMA' : 'DATABASE_SCHEMA'] ?? 'public';
  if (!/^[a-z_][a-z0-9_]*$/i.test(configured)) {
    throw new Error(`${environment === 'demo' ? 'DEMO_DB_SCHEMA' : 'DATABASE_SCHEMA'} must be a simple PostgreSQL schema name`);
  }
  return configured;
}

export function buildPoolOptions(rawUrl: string | undefined, environment: DatabaseEnvironment) {
  let connectionString = buildConnectionString(rawUrl);
  const schema = schemaFor(environment);
  const tlsOverride = process.env[environment === 'demo' ? 'DEMO_DATABASE_URL_REQUIRE_TLS' : 'DATABASE_URL_REQUIRE_TLS'];
  const needsSsl = tlsOverride === 'true' || process.env.NODE_ENV === 'production' ||
    !!(connectionString && /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(connectionString));
  // Keep certificate and hostname verification enabled. A private root CA can
  // be supplied through the environment-specific CA file setting.
  const configuredCaFile = process.env[environment === 'demo' ? 'DEMO_DB_SSL_CA_FILE' : 'DB_SSL_CA_FILE'];
  const host = connectionString ? new URL(connectionString).hostname.toLowerCase() : '';
  const bundledCaFile = path.resolve(process.cwd(), 'certs', 'prod-ca-2021.crt');
  const isSupabaseHost = host.endsWith('.supabase.com') || host.endsWith('.supabase.co');
  const caFile = configuredCaFile ?? (isSupabaseHost && fs.existsSync(bundledCaFile) ? bundledCaFile : undefined);
  if (connectionString) {
    const parsed = new URL(connectionString);
    if (needsSsl) {
      // node-postgres replaces explicit SSL options when TLS parameters remain
      // in the URI; keep TLS policy and CA exclusively in the ssl object.
      for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey']) parsed.searchParams.delete(key);
    }
    parsed.searchParams.set('options', `-c search_path=${schema},pg_catalog`);
    connectionString = parsed.toString();
  }
  const ssl = needsSsl
    ? { rejectUnauthorized: true, ...(caFile ? { ca: fs.readFileSync(caFile, 'utf8') } : {}) }
    : false;

  return {
    connectionString,
    ssl,
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
  const created = new Pool(buildPoolOptions(connectionString, environment));
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
  if (!realUrl) throw new Error('Real database must also be configured before Demo database access is enabled');
  if (realUrl && databaseIdentity(demoUrl) === databaseIdentity(realUrl)) {
    const realSchema = schemaFor('real');
    const demoSchema = schemaFor('demo');
    if (realSchema === demoSchema || databaseRole(demoUrl) === databaseRole(realUrl)) {
      throw new Error('A shared Demo/Real database requires different schemas and different restricted database roles');
    }
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
  'buildPoolOptions',
  'getCurrentDatabaseEnvironment',
  'getCurrentDatabaseContext',
  'runWithDatabaseEnvironment',
  'verifySharedDatabaseIsolation',
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
    if (property === 'buildPoolOptions') return buildPoolOptions;
    if (property === 'getCurrentDatabaseEnvironment') return getCurrentDatabaseEnvironment;
    if (property === 'getCurrentDatabaseContext') return getCurrentDatabaseContext;
    if (property === 'runWithDatabaseEnvironment') return runWithDatabaseEnvironment;
    if (property === 'verifySharedDatabaseIsolation') return verifySharedDatabaseIsolation;
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

/** Confirm that same-database deployments have real schema-level isolation;
 * separate search_path values alone do not prevent cross-schema access. */
export async function verifySharedDatabaseIsolation(): Promise<void> {
  const demoUrl = process.env.DEMO_DATABASE_URL;
  const realUrl = process.env.DATABASE_URL;
  if (!demoUrl) {
    if (process.env.DEMO_ENABLED === 'true') throw new Error('DEMO_ENABLED requires DEMO_DATABASE_URL');
    return;
  }
  if (!realUrl) throw new Error('DEMO_DATABASE_URL requires DATABASE_URL for canonical Real identity verification');

  const realSchema = schemaFor('real');
  const demoSchema = schemaFor('demo');
  const demoPool = getDemoPool();
  if (databaseIdentity(demoUrl) === databaseIdentity(realUrl)) {
    const verify = async (target: Pool, ownSchema: string, otherSchema: string, name: string): Promise<void> => {
    const { rows } = await target.query<{
      schema: string; is_superuser: boolean; can_create_in_other_schema: boolean;
      can_access_other_tables: boolean; can_execute_other_security_definer: boolean;
      can_assume_other_role: boolean;
    }>(
      `WITH RECURSIVE reachable_roles(roleid) AS (
         SELECT m.roleid FROM pg_auth_members m JOIN pg_roles login_role ON login_role.oid=m.member
          WHERE login_role.rolname=current_user
         UNION
         SELECT m.roleid FROM pg_auth_members m JOIN reachable_roles rr ON rr.roleid=m.member
       )
       SELECT current_schema() AS schema, r.rolsuper AS is_superuser,
              EXISTS (SELECT 1 FROM reachable_roles) AS can_assume_other_role,
              has_schema_privilege(current_user, $1, 'CREATE') AS can_create_in_other_schema,
              EXISTS (
                SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','f')
                   AND (has_table_privilege(current_user,c.oid,'SELECT')
                     OR has_table_privilege(current_user,c.oid,'INSERT')
                     OR has_table_privilege(current_user,c.oid,'UPDATE')
                     OR has_table_privilege(current_user,c.oid,'DELETE')
                     OR has_any_column_privilege(current_user,c.oid,'SELECT')
                     OR has_any_column_privilege(current_user,c.oid,'INSERT')
                     OR has_any_column_privilege(current_user,c.oid,'UPDATE')
                     OR has_any_column_privilege(current_user,c.oid,'REFERENCES'))
              ) OR EXISTS (
                SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname=$1 AND c.relkind='S'
                   AND (has_sequence_privilege(current_user,c.oid,'USAGE')
                     OR has_sequence_privilege(current_user,c.oid,'SELECT')
                     OR has_sequence_privilege(current_user,c.oid,'UPDATE'))
              ) AS can_access_other_tables,
              EXISTS (
                SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname=$1 AND p.prosecdef
                   AND has_function_privilege(current_user,p.oid,'EXECUTE')
              ) AS can_execute_other_security_definer
         FROM pg_roles r WHERE r.rolname = current_user`,
      [otherSchema],
    );
    const result = rows[0];
    if (!result || result.schema !== ownSchema || result.is_superuser || result.can_assume_other_role || result.can_create_in_other_schema || result.can_access_other_tables || result.can_execute_other_security_definer) {
      throw new Error(`${name} database role must be a non-superuser with no role memberships, scoped to schema "${ownSchema}" without CREATE, table/sequence access, or executable SECURITY DEFINER routines in "${otherSchema}"`);
    }
    };

    await verify(realPool, realSchema, demoSchema, 'Real');
    await verify(demoPool, demoSchema, realSchema, 'Demo');
  }

  if (process.env.DEMO_ENABLED === 'true') {
    const demoSecret = process.env.DEMO_SESSION_SECRET;
    if (!demoSecret || Buffer.byteLength(demoSecret, 'utf8') < 32 || demoSecret === process.env.JWT_SECRET) {
      throw new Error('DEMO_ENABLED requires a unique DEMO_SESSION_SECRET with at least 32 bytes');
    }
    await runWithDatabaseEnvironment({ environment: 'demo' }, async () => {
      await pool.query('SELECT workspace_owner_id FROM users LIMIT 0');
      await pool.query('SELECT id FROM demo_sessions LIMIT 0');
    });
  }
}

export async function closeAllPools(): Promise<void> {
  await Promise.all([...new Set(connectionPools.values())].map((current) => current.end()));
  connectionPools.clear();
}

export default pool;
