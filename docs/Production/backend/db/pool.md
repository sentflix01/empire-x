# db/pool.ts - PostgreSQL Connection Pool
Single pg Pool for the app. Detects Neon pooled connections (pgbouncer=true -> disables per-client session state), SSL forced with rejectUnauthorized:false (works, but unauthenticated TLS - TD-016), statement_timeout 10s guards runaway queries, DB_POOL_MAX default 10. Pool errors logged without crashing. Imported everywhere as `pool`.
