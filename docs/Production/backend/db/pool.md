# db/pool.ts - PostgreSQL Connection Pool

## 1. What is this?

**Database layer module.** Exposes a request-context-aware PostgreSQL pool facade.

## 2. Why does it exist?

Maintains a real database pool and lazily creates a separate demo pool when a verified demo request enters its AsyncLocalStorage context. Supabase transaction-pooler URLs receive `pgbouncer=true`. TLS is enabled in production and for recognized hosted database URLs; server certificates are verified by default. `DATABASE_URL_REQUIRE_TLS` and `DB_TLS_REJECT_UNAUTHORIZED` are explicit operator overrides. Demo traffic uses `DEMO_DATABASE_URL`, `DEMO_DATABASE_URL_REQUIRE_TLS`, and `DEMO_DB_TLS_REJECT_UNAUTHORIZED`. Pool connections use a 10-second statement timeout and configurable pool sizes. Errors are logged without exposing connection strings.

## 3. What does it do?

The exported facade routes queries according to the request-scoped database environment. When demo database configuration is missing or resolves to the same normalized host, port, and database path as the real database, demo routing fails closed. It does not change the process-wide `DATABASE_URL` for ordinary requests.

## 4. What does it touch?

Inline references only — nothing external.
