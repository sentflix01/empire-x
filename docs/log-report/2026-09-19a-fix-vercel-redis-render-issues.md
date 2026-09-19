# Fix: Vercel rootDirectory, Redis Quota Crash, Render Cold-Start Keepalive

**Date:** 2026-09-19  
**Branch:** `feat/personal-business-toggle-auth-port-fixes`  
**Commit:** `fix: vercel rootDirectory, Redis quota crash, Render cold-start keepalive`  
**Type:** Bugfix  

---

## Problems Fixed

### 1. Vercel deploy blocked — `rootDirectory` in `frontend-next/vercel.json`

**Root cause:** `vercel.json` contained `"rootDirectory": "frontend-next"`. Vercel resolves the `rootDirectory` relative to itself, so the deploy runner tried to find `frontend-next/frontend-next/` which does not exist, causing every Vercel deploy to fail immediately.

**Fix:** Removed `rootDirectory` from `frontend-next/vercel.json`. The `deploy.yml` workflow already sets `working-directory: frontend-next`, which is the correct mechanism.

**File:** `frontend-next/vercel.json`

---

### 2. Docker/Render build failure — `express-rate-limit` peer dep conflict

**Root cause:** `backend/package.json` had `express-rate-limit@7.2.0`. `rate-limit-redis@6.0.1` declares a peer dependency of `express-rate-limit >= 8.6.0`. This caused `npm ci` to exit with `ERESOLVE` during the Docker build step, blocking every Render deployment.

**Fix:** Upgraded `express-rate-limit` to `^8.7.0` and regenerated `backend/package-lock.json`. Confirmed lockfile resolves `8.7.0` at the root level. `--legacy-peer-deps` was deliberately NOT used (it would allow an unsupported package combination and was already used as a frontend-only workaround).

**Files:** `backend/package.json`, `backend/package-lock.json` _(committed in `1edc828`)_

---

### 3. Redis quota crash — unhandled `sendCommand` rejection in `buildRateLimitStore()`

**Root cause:** `rate-limit-redis@6` calls `SCRIPT LOAD` asynchronously during `RedisStore` construction. When Upstash quota is exceeded the async call rejects. Without a `.catch()` handler this became an **unhandled Promise rejection**, logging `express-rate-limit: async error during store initialization` and potentially crashing the process under Node's `--unhandled-rejections=throw`.

**Fix:** In `buildRateLimitStore()`, the `sendCommand` callback now attaches a `.catch()` to the returned Promise. If the error message contains `max requests limit exceeded`, a structured `warn` log is emitted and the rate-limiter silently falls back to in-memory mode. The constructor-level `try/catch` was retained as a belt-and-suspenders guard.

**File:** `backend/index.ts`

---

### 4. Render cold starts — no HTTP keepalive ping

**Root cause:** Render free/starter tier spins down instances after ~15 minutes of HTTP inactivity. The existing DB keep-alive (`pool.query('SELECT 1')` every 4 min) only kept the database connection alive; it did not prevent the HTTP server from being spun down.

**Fix:** Added a `setInterval` self-ping to `GET /health` every **10 minutes** inside the production startup block. Uses `process.env.API_URL ?? process.env.BACKEND_URL ?? http://localhost:${PORT}` as the target URL. 10 min is well under Render's ~15 min inactivity threshold, and less noisy than a 4–5 min interval.

**File:** `backend/index.ts`

---

## Verification

- TypeScript: `npx tsc --noEmit --skipLibCheck` → 0 errors
- `backend/package-lock.json` resolves `express-rate-limit@8.7.0` at root level (confirmed with `jq`)
- `frontend-next/vercel.json` no longer contains `rootDirectory` key

---

## Manual Actions Required (cannot be done in code)

| Action | Where | Why |
|--------|--------|-----|
| Upgrade Upstash Redis to Pay-as-you-go | Upstash Console → Plan | Eliminates quota errors entirely |
| Enable `allkeys-lru` eviction policy | Upstash Console → Settings → Eviction | Prevents quota-hit crashes; evicts old keys instead of rejecting writes |
| Reconnect Vercel GitHub connector | Vercel Dashboard → Settings → Git | Ensures new pushes trigger deploys after `vercel.json` fix |
| Remove `PORT=3002` from Render env vars | Render Dashboard → Environment | `PORT` is injected by Render automatically; manually setting it to 3002 causes a port mismatch |
