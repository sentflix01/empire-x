# db/pool.ts - PostgreSQL Connection Pool

## 1. What is this?

**Database layer module.** Exposes a request-context-aware PostgreSQL pool facade.

## 2. Why does it exist?

Maintains a real database pool and lazily creates a separate demo pool when a verified demo request enters its AsyncLocalStorage context. Same-database workspaces use separate configured schemas and database roles, with startup checks verifying the role boundaries. Supabase transaction-pooler URLs receive `pgbouncer=true`. TLS is enabled in production and for recognized hosted database URLs, with certificate and hostname verification enabled through explicit node-postgres `ssl` options. Conflicting SSL parameters are removed from the URI so they cannot replace those options. Set `DB_SSL_CA_FILE` for the trusted provider root CA; Demo can use `DEMO_DB_SSL_CA_FILE`. Supabase deployments use the bundled root CA when no custom path is configured. TLS verification cannot be disabled through an environment override. Pool connections use a 10-second statement timeout and configurable pool sizes. Errors are logged without exposing connection strings.

## 3. What does it do?

The exported facade routes queries according to the request-scoped database environment. When demo database configuration is missing or resolves to the same normalized host, port, and database path as the real database, demo routing fails closed. It does not change the process-wide `DATABASE_URL` for ordinary requests.

## 4. What does it touch?

Inline references only — nothing external.
