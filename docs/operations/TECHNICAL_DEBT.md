# Nodbusiness — Technical Debt Register

> A living document. Track what needs to improve and why.
> Add items when you notice them. Resolve them intentionally, not reactively.
> Priority: High (fix before Phase 2) · Medium (fix in Phase 2) · Low (nice to have)
> **Last updated:** September 22, 2026

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
**Status:** Not started  
**Problem:** Backend API E2E coverage exists (`backend/test/e2e.test.js`), but there are no browser E2E tests for critical frontend flows.  
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
**Problem:** Admin account created with default password `Admin1234!` from `db/create-admin.js`.  
**Fix:** Log in as admin → Settings → Change password.  
**Impact:** Security — anyone who reads the docs can log in as admin.

---

## Medium Priority

### TD-004: TypeScript migration (backend)
**Status:** Not started  
**File:** All `backend/` files  
**Problem:** Backend is JavaScript — no type checking, autocomplete is limited, refactoring is risky.  
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
- Frontend (Next.js): full CSP with `script-src`, `img-src`, `connect-src`, `frame-src` for Stripe; `unsafe-inline`/`unsafe-eval` only in dev for HMR

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
| TD-0xx | Duplicate PUT /me/upsert in profiles.js | July 2026 |
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
