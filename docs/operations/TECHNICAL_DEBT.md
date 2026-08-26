# Nodbusiness — Technical Debt Register

> A living document. Track what needs to improve and why.
> Add items when you notice them. Resolve them intentionally, not reactively.
> Priority: High (fix before Phase 2) · Medium (fix in Phase 2) · Low (nice to have)
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| TD | Technical Debt item (numbered TD-001, TD-002, etc.) |
| JWT | JSON Web Token |
| API | Application Programming Interface |
| E2E | End-to-End testing |
| ORM | Object-Relational Mapping |
| TS | TypeScript |
| XSS | Cross-Site Scripting |
| DB | Database |
| CI/CD | Continuous Integration / Continuous Delivery |
| PR | Pull Request |
| CSRF | Cross-Site Request Forgery |

---
## High Priority

### TD-001: HttpOnly cookie refresh tokens
**Status:** ✅ Done (July 2026)
**Files changed:** `backend/routes/auth.ts`, `backend/middleware/auth.ts`, `backend/index.ts`, `frontend-next/api/client.ts`
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
**File:** `backend/routes/wallet.ts`
**What was done:** `POST /api/wallet/topup` now requires `requireAdmin` middleware. Direct topup is admin-only; user topups flow exclusively through Chapa (`/topup/chapa` → webhook verify).

---

### TD-003: End-to-end test suite
**Status:** Partially started  
**Problem:** Backend API E2E coverage exists (`backend/test/e2e.test.js`), but there are no browser E2E tests for critical frontend flows.  
**Fix:** Add Playwright tests for: registration → OTP → onboarding → create post → add product → checkout → view order.  
**Impact:** Prevents regressions on every deploy.

---

## Medium Priority

### TD-004: TypeScript migration (backend)
**Status:** ✅ Done (August 2026)
**File:** All `backend/` files
**Resolution:** Backend is fully TypeScript (70 `.ts` files, `tsconfig.json`, `tsc --noEmit` clean in CI). Prisma was evaluated and not adopted — pg + typed helpers remain.
**Impact:** Developer experience, bug prevention at scale.

---

### TD-005: JWT revocation blocklist
**Status:** ✅ Done (July 2026)
**Files changed:** `backend/routes/auth.ts`, `backend/middleware/auth.ts`
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
**Status:** ✅ Done (2026-08-24)  
**Resolution:** The old `subscribe()` polling pattern was already removed from `entities.ts` (line 5: "The old subscribe() polling pattern has been removed - TD-007"). All real-time updates use Socket.IO events. No polling remains.

---

### TD-008: Prisma ORM migration
**Status:** Not started (depends on TD-004)  
**File:** `backend/utils/crud.ts` and all route files  
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
**Files changed:** `backend/index.ts`, `frontend-next/next.config.ts`
**What was done:**
- Backend (API-only): strict CSP in production — `default-src 'none'`, allows only `connect-src 'self'`
- Frontend (Next.js): full CSP with `script-src`, `img-src`, `connect-src`, `frame-src` for Stripe; `unsafe-inline`/`unsafe-eval` only in dev for HMR

---

## Resolved ✅

| ID | Description | Resolved |
|---|---|---|
| TD-0xx | Duplicate PUT /me/upsert in profiles.js | July 2026 |
| TD-0xx | Missing ticker_type column in migrate7.js | July 2026 |
| TD-0xx | Wrong column in migrate8.js stories index | July 2026 |
| TD-0xx | updateRecord null not checked by callers | July 2026 |
| TD-0xx | Missing GET / route in reviews.js | July 2026 |
| TD-0xx | Feed query sorted by UUID instead of recency | July 2026 |
| TD-0xx | No table name validation in crud.ts | July 2026 |
| TD-0xx | CORS blocking Next.js frontend (port 3000) | July 2026 |
| TD-0xx | Socket.IO CORS single origin | July 2026 |
| TD-0xx | CartProvider wrapping AuthProvider (wrong order) | July 2026 |
| TD-0xx | AppLayout duplicating auth.me() call | July 2026 |
| TD-0xx | 401 in AppLayout not redirecting to /login | July 2026 |
| TD-0xx | Missing wallet debit/refund routes | July 2026 |

---

## Added 2026-08-23 (security hardening audit)

### TD-014: Access token still mirrored to localStorage + JS cookie
**Status:** ✅ Done (2026-08-23)
**Resolution:** `api/client.ts` keeps the JWT in memory only. Middleware gating now uses a
non-sensitive hint cookie (`nb_auth=1`); sessions re-hydrate silently via the HttpOnly
refresh cookie (`ensureFreshToken()`). All readers (AuthContext, authSlice, socket, ChatRoom)
migrated; legacy localStorage keys are cleaned up on logout/boot.

---

### TD-015: PurchaseModal polls a non-existent Chapa endpoint
**Status:** ✅ Done (2026-08-23)
**Resolution:** Added read-only `GET /api/orders/chapa/status/:tx_ref` (DB-only lookup —
polling never triggers upstream Chapa verification; the server-side verify callback remains
the sole confirmation path).

---

### TD-016: TLS certificate validation disabled on Neon/Upstash
**Status:** ✅ Done (2026-08-23)
**Resolution:** Certificate validation enabled on pg/redis/socket adapters (escape hatches DB_TLS_REJECT_UNAUTHORIZED / REDIS_TLS_REJECT_UNAUTHORIZED).
**Problem:** `rejectUnauthorized: false` in db/pool.ts, lib/redis.ts, socket Redis adapter —
traffic is encrypted but not authenticated (MITM-tolerant).
**Fix:** Validate certificates against system CAs or pin the provider CA.

---

### TD-017: SVG uploads allowed without sanitization
**Status:** ✅ Done (2026-08-23)
**Resolution:** SVG removed from upload allowlist - vector eliminated rather than sanitized.
**Problem:** middleware/upload.ts accepts image/svg+xml into public storage — stored-XSS vector.
Also no magic-byte validation (MIME + extension are client-controlled strings).
**Fix:** Drop SVG or sanitize server-side (e.g., DOMPurify/svgo); add file-type sniffing.

---

### TD-018: Dev seed credentials tracked in git
**Status:** ✅ Done (2026-08-23)
**Resolution:** File untracked and gitignored; no code referenced it.
**Problem:** backend/db/dev-credentials.json contains plaintext dev account passwords incl. admin.
Safe locally, dangerous if seed scripts ever run against production.
**Fix:** Generate credentials from env at seed time; remove the tracked file.

---

### TD-019: CI is non-blocking and deploys are not gated on it
**Status:** ✅ Done (2026-08-23)
**Resolution:** ci.yml — backend typecheck + Jest suites and frontend lint + typecheck + build
are hard gates (npm audit stays advisory for now). deploy.yml no longer triggers on push; it
runs via `workflow_run` only after a successful CI run for the same commit (`gate` job), and
the post-deploy health check now fails the workflow and alerts Telegram when configured.

---

### TD-020: No automated database backups
**Status:** Done (2026-08-23)
**Resolution:** Daily pg_dump pipeline (scripts/backup-database.js) scheduled in-process,
R2 upload when configured, retention pruning, outcome telemetry in app_settings, plus a
restorability verifier (scripts/verify-backup.js / npm run backup:verify). Operator must still:
configure R2 env vars in production, ensure postgresql-client in the deploy image, and schedule
the weekly verify against a scratch database. See docs/operations/BACKUPS.md.

---

### TD-003 (closed): End-to-end test suite
**Status:** ✅ Smoke suite shipped 2026-08-23 — Playwright (`frontend-next/e2e/`), 6 specs:
public pages, auth-gate redirects, seeded login/logout flows. Also regression-guards TD-014
in a real browser (token never readable client-side; silent refresh rehydration works).
Run locally with backend + seed: `cd frontend-next && npm run test:e2e`.
**Remaining:** checkout/payment and chat E2E coverage; CI wiring once staging DB exists.

---

### TD-021: Bookmarks store vulnerable to prototype pollution via server data
**Status:** ✅ Done (2026-08-23)
**Problem:** `bookmarksSlice` built `savedIds[key] = value` with plain assignment; a
`target_id` of `"__proto__"` from API data silently mutated the prototype instead of creating
an own property — bookmark state corrupted, potential pollution vector.
**Resolution:** All map writes now go through `withKey()/withoutKey()` helpers using
`Object.fromEntries` (CreateDataProperty — safe for danger keys). Property tests generate
danger-key values to keep the invariant locked.