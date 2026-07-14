# Deployment Readiness Fix — Bugfix Design

## Overview

Eight distinct bugs prevent the Empire X application from deploying cleanly to production. They fall into four layers:

- **Frontend auth token storage** — `client.ts`'s in-memory + cookie design is not communicated to the rest of the frontend; several files still use `localStorage` directly, breaking post-refresh auth state and WebSocket connections.
- **Backend proxy trust** — `app.set('trust proxy', 1)` is missing, so IP-based rate limiting and the proxy gateway use the wrong IP behind Railway/Render.
- **Database schema gaps** — five columns used at runtime are absent from the migrations: `orders.chapa_tx_ref`, `users.referral_code`, `users.referred_by`, `user_profiles.points`, and `commissions.status`.
- **Frontend CSP** — `connect-src` only lists localhost WebSocket URLs; production Railway WebSocket hosts are blocked.

The fix is minimal and surgical — no architecture changes, only targeted code and migration corrections.

---

## Glossary

- **Bug_Condition (C)**: The specific input/state that triggers each bug.
- **Property (P)**: The desired behavior once the fix is applied.
- **Preservation**: All existing behaviors that must not change after the fix.
- **`storeToken(token)`**: The `api/client.ts` function that saves the access token to the in-memory variable and a JS-readable cookie (used by Next.js middleware for route protection).
- **`_accessToken`**: The module-level in-memory variable in `api/client.ts` that the axios interceptor reads.
- **`trust proxy`**: An Express setting that tells the framework to trust the `X-Forwarded-For` header set by a load-balancer, so `req.ip` resolves to the real end-user IP.

---

## Bug Details

### Bug Condition

The system has eight distinct bug conditions that all share the same trigger: **running in a production deployment**.

**Formal Specification:**
```
FUNCTION isBugCondition(context)
  INPUT: context of type DeploymentContext
  OUTPUT: boolean

  RETURN (
    // Bug 1-4: token storage mismatch
    context.component IN ['AuthContext', 'CartContext', 'socket.ts', 'ChatRoom.tsx',
                          'Register.tsx', 'googleAuth.ts']
    AND context.operation IN ['checkUserAuth', 'fetchCart', 'getSocket', 'otp_verify', 'google_signin']

    // Bug 5: trust proxy
    OR context.environment = 'production'
       AND context.infra = 'reverse_proxy'
       AND NOT app.trustProxy

    // Bug 6-8: missing DB columns
    OR context.operation IN ['chapa_checkout', 'apply_referral', 'award_points', 'commission_summary']
       AND context.database = 'fresh_migration'

    // Bug 9: CSP WebSocket
    OR context.environment = 'production'
       AND context.feature = 'realtime_websocket'
  )
END FUNCTION
```

### Examples

- **Bug 1**: User logs in → `auth.loginViaEmailPassword` calls `storeToken(token)` → token stored in memory → page refresh → `AuthContext.checkUserAuth` calls `localStorage.getItem('access_token')` → returns `null` → user treated as logged out despite valid `HttpOnly` refresh cookie.
- **Bug 2**: Register OTP verify → `Register.tsx` calls `localStorage.setItem('access_token', token)` → token in `localStorage` only, NOT in `_accessToken` memory → subsequent axios requests send no `Authorization` header → all API calls return 401.
- **Bug 3**: Google sign-in → `googleAuth.ts` calls `localStorage.setItem('access_token', token)` → same problem as Bug 2.
- **Bug 4**: `socket.ts` reads `localStorage.getItem("access_token")` → always empty if user logged in via email/password (which uses `storeToken`) → socket connects with empty token → socket auth fails → real-time features broken.
- **Bug 5**: Railway deployment → `req.ip = '10.0.0.1'` (load-balancer) → all 1000 concurrent users share one rate-limit bucket → one user exhausts quota, all others get 429.
- **Bug 6**: Fresh DB deploy → `POST /api/orders/checkout/chapa` → `INSERT INTO orders (..., chapa_tx_ref, ...)` → `ERROR: column "chapa_tx_ref" of relation "orders" does not exist`.
- **Bug 7**: Fresh DB deploy → `GET /api/referral/my-code` → `ERROR: column "referral_code" does not exist`; `POST /api/referral/apply` → `ERROR: column "points" does not exist`.
- **Bug 8**: Production → browser `console.error: Refused to connect to 'wss://empire-x-backend.railway.app/socket.io/...' because it violates the following Content Security Policy directive: "connect-src 'self' http://..."`.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Login/logout, OTP verification, password reset — all existing flows must work exactly as before.
- Stripe payment flow — `stripe_session_id` column and Stripe webhook must be unaffected.
- Non-Chapa orders (manual, COD) — `chapa_tx_ref` column is nullable; existing order inserts without it must still work.
- Development mode — localhost WebSocket and dev OTP console logging must continue working.
- The `HttpOnly` refresh cookie silent-refresh flow in `client.ts` must be unchanged.

**Scope:**
All behavior that does NOT involve the eight specific bug conditions described above must remain identical before and after the fix.

---

## Hypothesized Root Cause

1. **Token storage mismatch**: The design intent (access token in memory only) was implemented in `client.ts` but never propagated to the rest of the codebase. Several files were written before or independently of this design decision and still use `localStorage` directly.

2. **Missing `trust proxy`**: The `index.js` file sets up rate limiting and uses `req.ip` in the proxy gateway, but the standard Express configuration for proxied environments (`app.set('trust proxy', 1)`) was never added.

3. **Chapa column absent from migration**: `migrate.js` was written before Chapa payments were added. The `chapa_tx_ref` column was added only to `migrate5.js` or a later migration that does not run on a fresh install without running all migrations in order — but `migrate-all.js` lists 10 files, so this needs verification. After checking, `orders` table in `migrate.js` indeed has no `chapa_tx_ref`. The later migration (`migrate5.js`) likely adds it, but if `migrate-all.js` fails partway or the column is expected in `migrate.js`, a gap exists.

4. **Points/referral columns absent**: Same pattern — base schema (`migrate.js`) doesn't include `referral_code`, `referred_by`, `points`. These were added in later migrations.

5. **`commissions.status`**: The admin summary uses `WHERE status = 'collected'` but the base commission table (likely in `migrate4.js` or similar) doesn't define this column, or it was added afterward.

6. **CSP WebSocket hosts**: The `connect-src` in `next.config.ts` was written for local development and was never updated to include the production Railway WebSocket host pattern.

---

## Correctness Properties

Property 1: Bug Condition — Token Storage Consistency

_For any_ authentication action (login, OTP verify, Google sign-in) where `isBugCondition` is true (i.e. the token write path diverges from the token read path), the fixed system SHALL store the access token in BOTH the in-memory `_accessToken` variable AND `localStorage` via `storeToken()`, so that any component reading `localStorage.getItem('access_token')` after a page refresh will find a valid token and not treat the user as logged out.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Existing Auth Flows Unchanged

_For any_ input that does NOT trigger the token storage mismatch (i.e., login that already calls `storeToken`, silent refresh, logout), the fixed system SHALL produce exactly the same behavior as the original — the `HttpOnly` refresh cookie flow, the axios 401 interceptor, and the `clearToken` function must be unmodified.

**Validates: Requirements 3.1, 3.2, 3.3**

---

## Fix Implementation

### Changes Required

**Fix 1 — `frontend-next/api/client.ts`: Add `localStorage` write to `storeToken`**

The `storeToken` function currently only writes to memory and a cookie. It must also write to `localStorage` so the rest of the codebase can read the token on page load.

```
// BEFORE
export function storeToken(token: string) {
  _accessToken = token;
  if (typeof document !== 'undefined') {
    document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

// AFTER
export function storeToken(token: string) {
  _accessToken = token;
  if (typeof window !== 'undefined') {
    const maxAge = 15 * 60;
    document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    localStorage.setItem('access_token', token);
  }
}
```

Also update `clearToken` to remove from `localStorage`:
```
export function clearToken() {
  _accessToken = null;
  if (typeof window !== 'undefined') {
    document.cookie = 'access_token=; path=/; max-age=0';
    localStorage.removeItem('access_token');
  }
}
```

**Fix 2 — `frontend-next/views/Register.tsx`: Replace direct `localStorage.setItem` with `storeToken`**

```
// BEFORE
localStorage.setItem('access_token', result.data.access_token);
document.cookie = `access_token=${result.data.access_token}; ...`;

// AFTER
import { storeToken } from '@/api/client';
storeToken(result.data.access_token);
```

**Fix 3 — `frontend-next/lib/googleAuth.ts`: Replace direct `localStorage.setItem` with `storeToken`**

```
// BEFORE
localStorage.setItem('access_token', access_token);

// AFTER
import { storeToken } from '@/api/client';
storeToken(access_token);
```

Also fix the JSDoc comment in `auth.ts` that says "stores in both localStorage and cookie" — this was aspirationally correct but misleading; after Fix 1, it will be accurate.

**Fix 4 — `backend/index.js`: Add `app.set('trust proxy', 1)`**

Add directly after `const app = express()`:
```javascript
app.set('trust proxy', 1); // trust the first proxy hop (Railway, Render, Nginx)
```

**Fix 5 — `backend/db/migrate.js`: Add `chapa_tx_ref` to orders table**

Add `chapa_tx_ref TEXT` to the `orders` CREATE TABLE statement.

**Fix 6 — `backend/db/migrate.js`: Add `referral_code`, `referred_by` to users; add `points` to user_profiles**

- Add `referral_code TEXT UNIQUE` and `referred_by UUID REFERENCES users(id) ON DELETE SET NULL` to the `users` CREATE TABLE.
- Add `points INTEGER NOT NULL DEFAULT 0` to `user_profiles` CREATE TABLE.

**Fix 7 — `backend/db/migrate.js` or commission migration: Add `status` column to `commissions` table (or fix the query)**

The cleanest fix is to ensure `commissions` table has `status TEXT NOT NULL DEFAULT 'collected'` in the base CREATE TABLE, or change the admin summary query to remove the `WHERE status = 'collected'` filter since it is the only status that makes sense for a commission record.

**Fix 8 — `frontend-next/next.config.ts`: Add production WebSocket hosts to CSP `connect-src`**

Update the `connect-src` directive to include `wss://*.railway.app` and `wss://*.up.railway.app` (and allow the configured `NEXT_PUBLIC_API_BASE_URL` as a `wss://` origin):

```
// AFTER
`connect-src 'self' ${apiHost} ${apiHost.replace(/^https?:/, 'wss:')} ws://localhost:3001 wss://localhost:3001 wss://*.railway.app wss://*.up.railway.app https://*.sentry.io https://api.stripe.com https://api.chapa.co`,
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Confirm each bug exists on the unfixed code before applying the fix.

**Test Plan for Bug 1-4 (token storage)**:
- Open the app in a browser, log in, note the in-memory token is set.
- Reload the page: `localStorage.getItem('access_token')` returns `null`.
- `AuthContext.checkUserAuth` treats user as logged out — confirmed.
- Log in via Register OTP path: inspect `_accessToken` in `api/client.ts` — it is `null` because `Register.tsx` only wrote to `localStorage`.

**Test Plan for Bug 5 (trust proxy)**:
- Deploy to Railway. Check backend logs for `req.ip` — it shows `::ffff:10.x.x.x` (internal proxy IP) instead of the real user IP.

**Test Plan for Bug 6-8 (missing columns)**:
- Run `node db/migrate-all.js` on a fresh database.
- `POST /api/orders/checkout/chapa` → observe PostgreSQL error about `chapa_tx_ref`.
- `GET /api/referral/my-code` → observe PostgreSQL error about `referral_code`.

**Test Plan for Bug 9 (CSP)**:
- Deploy frontend to Vercel. Open browser DevTools → Console → observe CSP violation for WebSocket connection to the Railway backend.

### Fix Checking

```
FOR ALL context WHERE isBugCondition(context) DO
  result := fixedSystem(context)
  ASSERT expectedBehavior(result)
END FOR
```

- After Fix 1-4: Log in, reload, verify `localStorage.getItem('access_token')` returns the token and auth state is preserved.
- After Fix 5: Verify `req.ip` in Railway logs shows real user IP.
- After Fix 6-8: Run fresh migrations and exercise all affected endpoints — no DB errors.
- After Fix 9: Verify browser console shows no CSP violations for WebSocket connections.

### Preservation Checking

```
FOR ALL context WHERE NOT isBugCondition(context) DO
  ASSERT originalSystem(context) = fixedSystem(context)
END FOR
```

- Email/password login still works, `HttpOnly` cookie is still set.
- Silent refresh (401 → refresh → retry) still works.
- Logout clears both `localStorage` and the cookie.
- Stripe payments still work (no schema changes to `stripe_session_id`).
- Non-Chapa orders can still be created without `chapa_tx_ref`.

### Unit Tests

- Test `storeToken` writes to `localStorage` AND memory AND cookie.
- Test `clearToken` removes from all three stores.
- Test that `Register.tsx` OTP path calls `storeToken` (not raw `localStorage.setItem`).

### Property-Based Tests

- Generate random token strings; verify `storeToken(t)` → `localStorage.getItem('access_token') === t`.
- Generate random token strings; verify `clearToken()` → `localStorage.getItem('access_token') === null` AND `_accessToken === null`.

### Integration Tests

- Full login → page reload → API call: expect 200 (not 401).
- Full register → OTP verify → navigate to /feed: expect authenticated state, not redirect to login.
- Google sign-in → API call: expect 200 with correct `Authorization` header.
