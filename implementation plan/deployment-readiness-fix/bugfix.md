# Bugfix Requirements Document

## Introduction

A thorough scan of the Nodbusiness codebase (backend + frontend) revealed a set of bugs, misconfigurations, and inconsistencies that would prevent a clean production deployment. The issues span three categories:

1. **Authentication token inconsistency** — the frontend uses two conflicting storage strategies for the access token (in-memory + cookie vs. `localStorage`), causing broken auth state after page refresh and broken WebSocket connections in production.
2. **Missing `trust proxy` setting** — the Express backend does not set `app.set('trust proxy', 1)`, so `req.ip` returns the internal IP of the load-balancer on Railway/Vercel, breaking IP-based rate limiting and the SSRF proxy gateway.
3. **`orders` table missing Chapa column** — the initial migration (`migrate.js`) does not include the `chapa_tx_ref` column used throughout `routes/orders.js`, so Chapa payments fail with a DB error on fresh deployments.
4. **`user_profiles` table missing `points` column** — the referral and commission routes write to `user_profiles.points`, but the column is absent from the schema migration.
5. **`users` table missing `referral_code` / `referred_by` columns** — `routes/referral.js` reads and writes these columns, but they are not in the base migration.
6. **Commission route missing `status` column** — `routes/commission.js` admin summary queries `WHERE status = 'collected'` but the `commissions` table has no `status` column in the migration.
7. **Frontend CSP missing production WebSocket host** — `next.config.ts` only allows `ws://localhost:3001` and `wss://localhost:3001` in `connect-src`. In production the Socket.IO server runs on a Railway subdomain, so real-time features are silently blocked by the browser.
8. **`auth.ts` comment misleads: `storeToken` does NOT write to `localStorage`** — the JSDoc says "stores in both localStorage and cookie" but `client.ts` stores only in memory + a short-lived JS cookie. Several components (`AuthContext`, `CartContext`, `socket.ts`, `ChatRoom.tsx`) read from `localStorage` and will always find the token missing after a hard refresh, forcing a re-login loop even though the `HttpOnly` refresh cookie is still valid.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the access token is written via `storeToken()` (login, OTP verify, Google sign-in) THEN the system stores the token in memory and a JS cookie but NOT in `localStorage`, yet `AuthContext.checkUserAuth`, `CartContext.fetchCart`, `socket.ts`, and `ChatRoom.tsx` read from `localStorage` — finding nothing — and treat the user as logged out.

1.2 WHEN a user refreshes the page or opens a new tab THEN the system fails to reconnect the WebSocket because `socket.ts` reads `localStorage.getItem("access_token")` which is always empty after a refresh under the new token storage design.

1.3 WHEN `Register.tsx` OTP verify succeeds THEN the system writes the token directly to `localStorage.setItem('access_token', ...)` instead of calling `storeToken()`, bypassing the in-memory store, causing the `client.ts` axios interceptor to send no `Authorization` header on subsequent requests in the same session.

1.4 WHEN `googleAuth.ts` completes Google sign-in THEN the system writes the token to `localStorage.setItem('access_token', ...)` instead of calling `storeToken()`, same problem as 1.3.

1.5 WHEN the backend is deployed behind a reverse proxy (Railway, Render, Vercel Serverless Functions) THEN the system reads the proxy's internal IP as `req.ip` because `app.set('trust proxy', 1)` is not configured, causing all Chapa/proxy rate-limit keys to collide under a single IP and IP-based blocking logic to be ineffective.

1.6 WHEN a Chapa payment is initiated on a fresh database THEN the system throws a PostgreSQL error `column "chapa_tx_ref" does not exist` because the `orders` table migration does not include that column.

1.7 WHEN a referral code is applied or points are awarded THEN the system throws a PostgreSQL error `column "referral_code" does not exist` / `column "referred_by" does not exist` / `column "points" does not exist` because these columns are absent from the initial schema migration.

1.8 WHEN an admin views commission summary THEN the system returns an empty result (or a DB error) because the `commissions` table has no `status` column yet the query filters `WHERE status = 'collected'`.

1.9 WHEN the frontend is served from a production Vercel domain THEN the system blocks all Socket.IO upgrade requests with a CSP violation because `connect-src` only lists `ws://localhost:3001` and `wss://localhost:3001` and not the production Railway WebSocket URL.

### Expected Behavior (Correct)

2.1 WHEN the access token is written via `storeToken()` THEN the system SHALL store it in memory AND write it to `localStorage` so that `AuthContext`, `CartContext`, `socket.ts`, and other components can read it after a page refresh until the `HttpOnly` refresh cookie exchanges it for a new token.

2.2 WHEN `Register.tsx` OTP verify succeeds THEN the system SHALL call `storeToken(token)` (instead of `localStorage.setItem` directly) so that the in-memory store is kept in sync.

2.3 WHEN `googleAuth.ts` completes Google sign-in THEN the system SHALL call `storeToken(token)` (instead of `localStorage.setItem`) so that the axios client sends the `Authorization` header immediately.

2.4 WHEN the backend starts behind a reverse proxy THEN the system SHALL set `app.set('trust proxy', 1)` so that `req.ip` correctly resolves to the end-user IP and rate limiting and the proxy gateway work as intended.

2.5 WHEN a Chapa payment is created on a fresh database THEN the system SHALL succeed because the `orders` table migration includes the `chapa_tx_ref TEXT` column.

2.6 WHEN referrals or points are processed on a fresh database THEN the system SHALL succeed because the `users` table migration includes `referral_code TEXT` and `referred_by UUID REFERENCES users(id) ON DELETE SET NULL` and the `user_profiles` table includes a `points INTEGER NOT NULL DEFAULT 0` column.

2.7 WHEN the admin commission summary is queried THEN the system SHALL return meaningful data because the `commissions` table migration includes a `status TEXT NOT NULL DEFAULT 'collected'` column (or the query is corrected to not filter by a non-existent column).

2.8 WHEN the frontend is deployed to production THEN the system SHALL allow Socket.IO WebSocket connections to the configured `NEXT_PUBLIC_API_BASE_URL` host by including `wss://*.railway.app` (and similar) in `connect-src`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user logs in with email/password THEN the system SHALL CONTINUE TO issue a short-lived access token and set the `HttpOnly` refresh cookie exactly as before.

3.2 WHEN an authenticated API request is made THEN the system SHALL CONTINUE TO attach the `Authorization: Bearer <token>` header via the axios interceptor.

3.3 WHEN the `HttpOnly` refresh cookie is present and the access token has expired THEN the system SHALL CONTINUE TO silently refresh the access token via `POST /api/auth/refresh` and retry the original request.

3.4 WHEN the backend processes a non-Chapa order THEN the system SHALL CONTINUE TO store it correctly (the new `chapa_tx_ref` column is nullable and does not affect existing order creation).

3.5 WHEN Redis is unavailable THEN the system SHALL CONTINUE TO fall back to the in-memory rate-limit store without crashing.

3.6 WHEN Stripe payments are used THEN the system SHALL CONTINUE TO work unchanged (the Stripe webhook relies on `stripe_session_id`, not `chapa_tx_ref`).

3.7 WHEN the app runs in development with `NODE_ENV=development` THEN the system SHALL CONTINUE TO work with `ws://localhost:3001` WebSocket connections (the dev CSP must not be broken).
