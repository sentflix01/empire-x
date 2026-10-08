# db/pool.ts - PostgreSQL Connection Pool

## 1. What is this?

**Database layer module.** Exposes a request-context-aware PostgreSQL pool facade.

## 2. Why does it exist?

Maintains a real database pool and lazily creates a separate demo pool when a verified demo request enters its AsyncLocalStorage context. Supabase transaction-pooler URLs receive `pgbouncer=true`. TLS is enabled in production and for recognized hosted database URLs; `sslmode=verify-full` enforces certificate and hostname verification. Set `DB_SSL_CA_FILE` for a private root CA; demo traffic can use `DEMO_DB_SSL_CA_FILE`. TLS verification cannot be disabled through an environment override. Pool connections use a 10-second statement timeout and configurable pool sizes. Errors are logged without exposing connection strings.

## 3. What does it do?

The exported facade routes queries according to the request-scoped database environment. When demo database configuration is missing or resolves to the same normalized host, port, and database path as the real database, demo routing fails closed. It does not change the process-wide `DATABASE_URL` for ordinary requests.

## 4. What does it touch?

Inline references only — nothing external.
