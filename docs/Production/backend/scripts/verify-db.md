# backend/scripts/verify-db

## 1. What is this?

**Operational script.** A read-only database connectivity check used before migrations.

## 2. Why does it exist?

CI needs to confirm `DATABASE_URL` is reachable before running schema migrations. The verifier applies the same TLS enablement and certificate-validation defaults as the application pool.

## 3. What does it do?

- Requires `DATABASE_URL`; exits with a configuration error when it is absent.
- Opens a short-lived PostgreSQL pool and runs only `SELECT 1`.
- Enables TLS for production and recognized hosted database URLs, unless `DATABASE_URL_REQUIRE_TLS=false` is explicitly set.
- Verifies TLS certificates unless `DB_TLS_REJECT_UNAUTHORIZED=false` is explicitly set for a trusted private CA.
- Uses a 10-second connection timeout and prints categorized connection diagnostics.

## 4. What does it touch?

**Source:** `backend/scripts/verify-db.js`

This script does not create, update, or delete database records.
