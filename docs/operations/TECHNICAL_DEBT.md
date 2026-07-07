# Empire X — Technical Debt Register

> A living document. Track what needs to improve and why.
> Add items when you notice them. Resolve them intentionally, not reactively.
> Priority: High (fix before Phase 2) · Medium (fix in Phase 2) · Low (nice to have)

---

## High Priority

### TD-001: HttpOnly cookie refresh tokens
**Status:** Not started  
**File:** `frontend-next/api/client.ts`, `backend/routes/auth.js`  
**Problem:** JWT stored in localStorage is readable by JavaScript — XSS vulnerability.  
**Fix:** Add `/api/auth/refresh` endpoint returning HttpOnly cookie. Frontend stores only short-lived access token in memory.  
**Impact:** Security — eliminates most dangerous XSS consequence.

---

### TD-002: Wallet topup should be internal-only in production
**Status:** Not started  
**File:** `backend/routes/wallet.js`  
**Problem:** `POST /api/wallet/topup` is callable by any authenticated user. In production it should only be triggered by Stripe/Chapa webhooks or admin.  
**Fix:** Add `requireAdmin` or an internal-only middleware for production, or move topup to be triggered exclusively from the Stripe webhook handler.  
**Impact:** Financial integrity.

---

### TD-003: End-to-end test suite
**Status:** Partially started  
**Problem:** Backend API E2E coverage exists (`backend/test/e2e.test.js`), but there are no browser E2E tests for critical frontend flows.  
**Fix:** Add Playwright tests for: registration → OTP → onboarding → create post → add product → checkout → view order.  
**Impact:** Prevents regressions on every deploy.

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
**Status:** Not started  
**File:** `backend/middleware/auth.js`, `backend/lib/redis.js`  
**Problem:** Once issued, a JWT is valid until expiry — "logout all devices" is impossible.  
**Fix:** Store invalidated JTIs (JWT IDs) in Redis with TTL matching the token expiry. Check on every request.  
**Impact:** Security — required for "logout all devices" feature.

---

### TD-006: Remove broad `@ts-nocheck` usage from frontend-next
**Status:** Not started  
**File:** Many files under `frontend-next/components`, `frontend-next/views`, `frontend-next/lib`, and `frontend-next/hooks`  
**Problem:** TypeScript checking is disabled across a large part of the frontend (current audit found 158 `@ts-nocheck` directives). This means `npx tsc --noEmit` can pass while real component and data-shape bugs remain hidden.  
**Fix:** Remove `@ts-nocheck` incrementally by feature area. Start with shared UI primitives, auth/cart state, layout, checkout, wallet, profile, and showroom builder. Add explicit API response types as files are cleaned.  
**Impact:** Type safety, IDE autocomplete.

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
**Status:** Not started  
**File:** `backend/index.js`  
**Problem:** `Content-Security-Policy` header is not configured. Browsers allow scripts from any origin.  
**Fix:** Add CSP to Helmet config restricting `script-src` to self + Vercel + known CDNs.  
**Impact:** XSS mitigation depth.

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
| TD-0xx | No table name validation in crud.js | July 2026 |
| TD-0xx | CORS blocking Next.js frontend (port 3000) | July 2026 |
| TD-0xx | Socket.IO CORS single origin | July 2026 |
| TD-0xx | CartProvider wrapping AuthProvider (wrong order) | July 2026 |
| TD-0xx | AppLayout duplicating auth.me() call | July 2026 |
| TD-0xx | 401 in AppLayout not redirecting to /login | July 2026 |
| TD-0xx | Missing wallet debit/refund routes | July 2026 |
