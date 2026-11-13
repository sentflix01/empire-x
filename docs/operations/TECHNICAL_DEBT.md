# Nodbusiness — Technical Debt Register

> A living document. Track what needs to improve and why.
> Add items when you notice them. Resolve them intentionally, not reactively.
> Priority: High (fix before Phase 2) · Medium (fix in Phase 2) · Low (nice to have)
> **Last updated:** November 13, 2026

---

## High Priority

### TD-001: HttpOnly cookie refresh tokens
**Status:** ✅ Done (July 2026)
**Files changed:** `backend/routes/auth.js`, `backend/middleware/auth.js`, `backend/index.js`, `frontend-next/api/client.ts`
**What was done:**
- Access token shortened to 15 min, stored in memory only (not localStorage)
- Refresh token (7 days) set as HttpOnly cookie by backend on every login/refresh
- Added `POST /api/auth/refresh` — reads HttpOnly cookie, rotates refresh token, issues new access token
- Added `POST /api/auth/logout` — revokes refresh token, clears cookie
- Added `POST /api/auth/logout-all` — revokes refresh token + sets per-user `revoke_before` timestamp
- Frontend client: 401 interceptor silently calls `/refresh` once before redirecting to login
- `cookie-parser` installed and wired into Express

---

### TD-002: Wallet topup should be internal-only in production
**Status:** ✅ Done (July 2026)
**File:** `backend/routes/wallet.js`
**What was done:** `POST /api/wallet/topup` now requires `requireAdmin` middleware. Direct topup is admin-only; user topups flow exclusively through Chapa (`/topup/chapa` → webhook verify).

---

### TD-003: End-to-end test suite
**Status:** Done (corrected 2026-11-07, audit F-008) — Playwright specs in `frontend-next/e2e/` run in the blocking "E2E — Chromium journeys" CI job against a real backend and Postgres (audit F-032).  
**Problem:** Backend API E2E coverage exists (`backend/test/e2e.test.js`), but there were no browser E2E tests for critical frontend flows.  
**Fix:** Add Playwright tests for: registration → OTP → onboarding → create post → add product → checkout → view order.  
**Impact:** Prevents regressions on every deploy.

---

### TD-022: Persistent backup storage (R2 or Supabase)
**Status:** Not started — HIGH priority before real users  
**Problem:** Daily backups run via `pg_dump` inside the Render container and save to `/app/backups/` (local disk). Render free tier has **no persistent disk** — all local files are lost on every redeploy.  
**Fix:** Configure Cloudflare R2 for backup storage: add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` to Render env vars. The backup script already supports R2 — no code changes needed.  
**Impact:** Data loss if database needs recovery after a redeploy.

---

### TD-023: Upstash Redis daily quota (500K/day)
**Status:** Monitoring — not critical yet  
**Problem:** Upstash free tier has a 500K commands/day limit. At launch with active users, this limit can be hit, degrading rate limiting, JWT revocation, and BullMQ queues. The app handles this gracefully (falls back to in-memory) but Redis features are lost.  
**Fix:** Upgrade to Upstash pay-as-you-go ($0.20/100K commands) or switch to a fixed-cost Redis at scale.  
**Impact:** Rate limiting becomes per-instance (not global), JWT revocation disabled, queues run synchronously.

---

### TD-024: Admin password change
**Status:** Not done — must fix before real users  
**Status:** The repository scripts no longer assign or print default admin credentials. `create-admin.js` now creates accounts only on a local development database with explicit unique passwords and refuses to change existing accounts.

**Deployment action:** Provision or reset a production admin through the hosting provider's secure database/authentication procedure. Never run local development account bootstrap scripts against hosted databases.

---

### TD-026: Rate limiting is per-instance only (in-memory)
**Status:** Known limitation — acceptable for current single-instance Render deployment  
**File:** `backend/index.ts` — `buildRateLimitStore()` function  
**Problem:** `buildRateLimitStore()` always returns `undefined`, so `express-rate-limit` uses an in-memory store. Per-IP rate limits (login 20/15min, register 20/15min, forgot-password 5/15min, etc.) do NOT aggregate across multiple backend instances. A distributed brute-force attack hitting different instances could bypass the limits. Rate limiting is also entirely disabled in dev (`skip: () => isDev`).  
**Fix when needed:** Switch to `rate-limit-redis` store using the existing Upstash connection. The `buildRateLimitStore(prefix)` function signature is already abstracted for this — replace `return undefined` with `return new RedisStore({ prefix, sendCommand: (...args) => redis.call(...args) })`. Import and conditional on Redis availability.  
**Impact at current scale:** Not a problem on a single Render instance. Becomes a gap at horizontal scale or under targeted credential-stuffing.

---

### TD-025: Frontend test suite full-run parallelism flakes
**Status:** Open — cause not found (re-checked 2026-11-06, audit F-053)  
**Problem:** Now and then one test file fails in a full `vitest run` (two tests at once: `test/feed/PhotoViewer.test.tsx` PostCard tests in the audit, `test/showroom/sectionsLive.test.tsx` once on 2026-11-06) and passes when re-run. Only the test names were kept, not the error.  
**Checked:** `vitest.config.mts` already limits workers (`maxWorkers: 2`). Eight full runs on 2026-11-06 (four alone, four with two suites at once) all passed. With Testing Library's wait limit cut to 60 ms every test still passed, so slow async waits are not the cause. Neither file uses lazy imports.  
**Next time it fails:** keep the full error and stack from the CI log (Frontend unit tests job) and add it here before re-running. Do not add automatic retries: they would hide real failures.  
**Impact:** Occasional false-red CI runs; no real test regressions found.

### TD-004: TypeScript migration (backend)
**Status:** Done (corrected 2026-11-07, audit F-008) — the backend is TypeScript and `tsc --noEmit` runs in CI. Since 2026-11-08 the backend runs with `"strict": true`. Since 2026-11-09 the whole frontend is checked strictly (`frontend-next/tsconfig.strict.json`) with a ratchet: `npm run typecheck:strict` (in CI) fails when any file has more strict errors than `frontend-next/strict-baseline.json` records, and new files must have none; `-- --update` lowers the baseline after a fix and refuses to raise it. The feed, marketplace, messaging, Orders, Business Analytics, Profile, public showroom and coupon screens are clean. Remaining: 0 errors: every frontend file is strict-clean (the map screens since 2026-11-10, with the `@types/leaflet` dev dependency the owner approved). The ratchet now fails CI on any new strict error; some migrations and tests are still JavaScript.  
**File:** All `backend/` files  
**Problem:** Backend was JavaScript — no type checking, autocomplete is limited, refactoring is risky.  
**Fix:** Rename `.js` to `.ts`, add `tsconfig.json`, fix type errors incrementally. Add Prisma for type-safe DB queries.  
**Impact:** Developer experience, bug prevention at scale.

---

### TD-005: JWT revocation blocklist
**Status:** ✅ Done (July 2026)
**Files changed:** `backend/routes/auth.js`, `backend/middleware/auth.js`
**What was done:**
- All JWTs now include a `jti` (JWT ID) claim
- Revoked JTIs stored in Redis as `revoked:{jti}` with TTL matching token expiry
- Per-user `revoke_before:{userId}` timestamp stored on logout-all; tokens issued before it are rejected
- `requireAuth` checks both blocklist and `revoke_before` on every request (fails open when Redis unavailable)

---

### TD-006: Remove broad `@ts-nocheck` usage from frontend-next
**Status:** ✅ Done (July 2026)
**What was done:** Removed all 86 `@ts-nocheck` directives from source files. `npx tsc --noEmit` now shows zero errors in source files (one auto-generated `.next/dev/types/routes.d.ts` error is a Next.js dev artifact, not a source issue). `strict` mode is off and `strictNullChecks` is on — a good starting baseline for incremental type hardening.

---

### TD-007: Replace polling in entities.ts subscribe()
**Status:** Not started  
**File:** `frontend-next/api/entities.ts`  
**Problem:** `subscribe()` uses `setInterval` for polling. For notifications, this is replaced by Socket.IO, but the pattern remains.  
**Fix:** Remove or deprecate `subscribe()` from EntityApi. All real-time updates should use Socket.IO events.  
**Impact:** Reduces unnecessary API calls, removes dead code.

---

### TD-008: Prisma ORM migration
**Status:** Not started (depends on TD-004)  
**File:** `backend/utils/crud.js` and all route files  
**Problem:** Raw SQL is hard to refactor safely and doesn't provide type safety.  
**Fix:** After TypeScript migration, add Prisma. Generate schema from existing DB. Replace `pool.query` calls progressively.  
**Impact:** Developer experience, safer database access.

---

### TD-009: Image optimization pipeline
**Status:** Not started  
**Problem:** Images uploaded to R2 are stored as-is (original size). Large images slow down the marketplace and profile pages.  
**Fix:** Add Cloudflare Workers image resize transform on R2 public URL. Or use `next/image` with R2 domain configured in `next.config.ts`.  
**Impact:** Page load performance, mobile experience.

### TD-027: Telegram notifications cannot be connected
**Status:** Not started — needs an owner decision (found 2026-11-09, audit F-052 follow-up 6)
**Problem:** Sending works (`notifyUser` in `backend/routes/telegram.ts`), but nothing links a person's Telegram chat to their account. `POST /api/telegram/connect` needs a chat id that people cannot see, there is no bot webhook for `/start`, and `GET /api/telegram/status` sends no bot link or bot name. The settings component (`frontend-next/components/settings/TelegramSettings.tsx`) is not shown on any page (checked 2026-11-10). It had an "Open Telegram Bot" button that opened `#` and would say "Connected to @undefined"; it now says connecting is not available yet, so it is safe to show once linking exists.
**Fix (to decide):** a one-time link code (`t.me/<bot>?start=<code>`, short expiry, single use) checked by a bot webhook with Telegram's secret-token header, then `status` returns `connect_url` and `bot_username`. Needs the bot name and webhook secret as environment settings.
**Impact:** Telegram alerts for orders and messages exist on the server, but nobody can turn them on and Settings does not offer them.


### TD-028: TypeScript 7 and uuid 12+ cannot be adopted yet
**Status:** Blocked by upstream (2026-11-12). Dependabot skips these majors (`.github/dependabot.yml`).
**Problem:** TypeScript 7 is the native (Go) compiler without the JavaScript API that typescript-eslint, ts-jest and Next.js type checking load; its update PRs (#93 frontend, #96 backend) failed in lint and could not pass. uuid 12+ ships only as an ES module, while the CommonJS backend and google-auth-library's `gaxios` `require()` it (the backend overrides uuid to its own version); PR #97 failed.
**Fix:** Revisit TypeScript 7 when typescript-eslint and ts-jest support it, then remove the ignore rule. For uuid, replace the two direct uses with Node's `crypto.randomUUID()` and drop the override once `gaxios` no longer needs uuid 11.
**Impact:** None today; both stay on supported releases (TypeScript 5.9/6.0, uuid 11).
---

### TD-029: ~~Backend runs on Node 20, which is past end of life~~ ✅ Node 22
**Status:** Resolved 2026-11-13 (owner: "yes upgrade to Node 22"). `backend/Dockerfile` (which Render builds), `docker-compose.yml` and every Node-20 `setup-node` in `.github/workflows/` now use Node 22 LTS; `backend/package.json` declares `engines.node >=22.12`. The frontend unit-test job stays on Node 24, which `@zxing/library` asks for. Follow-ups: google-auth-library 11 done (2026-11-13, with an unmocked token-verification test); web-push 4 still open.
**Problem:** The backend image (`backend/Dockerfile`, `node:20-alpine`) and CI (`setup-node` 20) use Node 20, whose maintenance ended on 30 April 2026, so it no longer gets security fixes. Two dependency majors are waiting on a newer Node:
- google-auth-library 11 (and its `gaxios` 8, `gcp-metadata` 9) needs Node 22 or later. Its PR #215 was closed.
- web-push 4 is an ES module only. The backend loads it with `require()` inside a try/catch in `routes/push.ts`, so a load failure would turn push notifications off silently. Its PR #216 was closed. Node 22 loads ES modules with `require()`; adopt it together with a test that push loads.
**Fix:** Move the Dockerfile, every `setup-node` in `.github/workflows/`, and the Render runtime to Node 22 LTS (or 24) in one PR, with the full CI. Then re-open the two upgrades.
**Impact:** Security fixes for the runtime; unblocks the two upgrades.
---

## Low Priority

### TD-010: ~~Remove `frontend/` (Vite)~~ ✅ DONE
**Status:** Resolved July 2026  
Removed the old Vite frontend folder entirely. `frontend-next/` is the only frontend.

---

### TD-011: Consolidate Sentry in frontend-next
**Status:** Not started  
**File:** `frontend-next/lib/sentry.ts`  
**Problem:** Sentry may not be fully wired into Next.js error boundaries and API routes.  
**Fix:** Follow the Next.js Sentry SDK setup guide: `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`.  
**Impact:** Error tracking completeness.

---

### TD-012: Audit logging for financial transactions
**Status:** Not started  
**Problem:** No append-only audit trail for wallet transactions, commission collections, or refunds.  
**Fix:** Create an `audit_logs` table. INSERT a row on every wallet operation with: user, action, amount, before/after balance, timestamp, IP.  
**Impact:** Compliance, fraud investigation.

---

### TD-013: CSP headers
**Status:** ✅ Done (July 2026)
**Files changed:** `backend/index.js`, `frontend-next/next.config.ts`
**What was done:**
- Backend (API-only): strict CSP in production — `default-src 'none'`, allows only `connect-src 'self'`
- Frontend (Next.js): full CSP with `script-src`, `img-src`, `connect-src`, `frame-src` for Stripe. Since 6 Nov 2026 (audit F-016) `script-src` uses a per-request nonce with `'strict-dynamic'` and no `'unsafe-inline'` (it was allowed in production before); `unsafe-eval` only in dev for HMR. Set in `frontend-next/proxy.ts` via `lib/csp.ts`.

---

## Resolved ✅

| ID | Description | Resolved |
|---|---|---|
| TD-001 | HttpOnly cookie refresh tokens | July 2026 |
| TD-002 | Wallet topup admin-only in production | July 2026 |
| TD-005 | JWT revocation blocklist (Redis) | July 2026 |
| TD-006 | Remove `@ts-nocheck` from frontend | July 2026 |
| TD-013 | CSP headers (backend + frontend) | July 2026 |
| TD-014 | Token storage — memory only, not localStorage | September 2026 |
| TD-015 | `trust proxy 1` for Render/Railway IP headers | September 2026 |
| TD-016 | TLS validation on pg/redis/socket adapters | September 2026 |
| TD-017 | Upload hardening — SVG removed, MIME×extension cross-check | September 2026 |
| TD-018 | Redis error not caught in auth login/refresh routes (500 on quota exceeded) | September 22, 2026 |
| TD-019 | CI deploy gate — deploys now chained to CI pass, not raw push | September 2026 |
| TD-020 | Jest hung in CI — added `--forceExit` + 15min job timeout | September 22, 2026 |
| TD-021 | `showroom-digests.js` dynamic imports missing `.js` extension (Node ESM Docker fail) | September 22, 2026 |
| TD-0xx | `frontend-next/test/onboarding.test.tsx` queried `getByRole('img')` but `BrandLogoVideo` renders a `<div aria-label>` + `<video>`, not an `<img>` — test updated to `getByLabelText('Nodbusiness')` | October 2026 |
| TD-0xx | Missing ticker_type column in migrate7.js | July 2026 |
| TD-0xx | Wrong column in migrate8.js stories index | July 2026 |
| TD-0xx | updateRecord null not checked by callers | July 2026 |
| TD-0xx | Missing GET / route in reviews.js | July 2026 |
| TD-0xx | Feed query sorted by UUID instead of recency | July 2026 |
| TD-0xx | No table name validation in crud.js | July 2026 |
| TD-0xx | CORS blocking Next.js frontend (port 3000) | July 2026 |
| TD-0xx | Socket.IO CORS single origin | July 2026 |
| TD-0xx | CartProvider wrapping AuthProvider (wrong order) | July 2026 |
| TD-0xx | AppLayout duplicating auth.me() call | July 2026 |
| TD-0xx | 401 in AppLayout not redirecting to /login | July 2026 |
| TD-0xx | Missing wallet debit/refund routes | July 2026 |
| TD-0xx | Auth logout loop on page load | September 2026 |
| TD-0xx | mailer.js treating placeholder RESEND_API_KEY as real | September 2026 |
