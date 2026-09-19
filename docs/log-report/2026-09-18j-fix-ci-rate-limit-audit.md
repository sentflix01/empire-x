# fix: upgrade express-rate-limit to v8, fix CI audit job

> **Type:** Bugfix · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## Problems fixed

### 1. CI Backend job — ERESOLVE peer dependency conflict

`rate-limit-redis@^6.0.1` declares `peerDependencies: { "express-rate-limit": ">= 8.6.0" }`.
The backend had `express-rate-limit@7.2.0` — below the minimum.
CI's fresh `npm ci` resolved the latest `rate-limit-redis` which required v8, causing `ERESOLVE`.

**Fix:** Upgraded `express-rate-limit` from `7.2.0` → `^8.7.0` and `rate-limit-redis` from `^4.3.1` → `^6.0.1`. Regenerated `backend/package-lock.json`.

Verified backwards compatibility:
- `standardHeaders: true` still works in v8
- `max` option still works (v8 renamed to `limit` but kept `max` as alias)
- `RedisStore` with `sendCommand` is the correct v6 API (unchanged)
- TypeScript: 0 errors after upgrade

### 2. CI Security Audit job — `400 Bad Request` invalid lockfile

The audit job ran without Node/npm setup (no `actions/setup-node`). Without the same Node 20 environment used by the backend and frontend jobs, `npm audit --package-lock-only` evaluated against a mismatched npm version, causing `400 Bad Request` from the npm registry.

Additionally, `--prefix` flag behaves differently across npm versions. Switched to `working-directory` per job step for deterministic resolution.

**Fix:** Added `actions/setup-node@v7` with `node-version: '20'` and `cache-dependency-path` for both lockfiles. Changed `--prefix backend` to `working-directory: backend`.

## Files changed

- `backend/package.json` — `express-rate-limit: 7.2.0 → ^8.7.0`, `rate-limit-redis: ^4.3.1 → ^6.0.1`
- `backend/package-lock.json` — regenerated
- `.github/workflows/ci.yml` — audit job: added Node 20 setup + working-directory steps
