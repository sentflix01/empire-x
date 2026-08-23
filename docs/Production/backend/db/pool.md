# db/pool.ts - PostgreSQL Connection Pool

## 1. What is this?

**Database layer module.** Single pg Pool for the app.

## 2. Why does it exist?

Single pg Pool for the app. Detects Neon pooled connections (pgbouncer=true -> disables per-client session state), SSL forced with rejectUnauthorized:false (works, but unauthenticated TLS - TD-016), statement_timeout 10s guards runaway queries, DB_POOL_MAX default 10. Pool errors logged without crashing. Imported everywhere as `pool`.

## 3. What does it do?

Single pg Pool for the app. Detects Neon pooled connections (pgbouncer=true -> disables per-client session state), SSL forced with rejectUnauthorized:false (works, but unauthenticated TLS - TD-016), statement_timeout 10s guards runaway queries, DB_POOL_MAX default 10. Pool errors logged without crashing. Imported everywhere as `pool`.

## 4. What does it touch?

Inline references only — nothing external.
