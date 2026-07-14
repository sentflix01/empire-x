# Implementation Plan

## Overview

Fix eight deployment-blocking bugs found across the Empire X frontend and backend. The bugs span token storage inconsistency, missing Express `trust proxy` configuration, missing database schema columns, and a CSP misconfiguration that blocks WebSocket connections in production.

## Tasks

- [x] 1. Write bug condition exploration test — token storage mismatch
  - **Property 1: Bug Condition** — Access Token Not Persisted to localStorage
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples proving that `storeToken()` does not write to `localStorage`
  - **Scoped PBT Approach**: Scope the property to a concrete token string; call `storeToken('test-token-123')` and assert `localStorage.getItem('access_token') === 'test-token-123'`
  - Write a vitest unit test in `frontend-next/test/storeToken.test.ts`:
    - Import `storeToken`, `clearToken`, `getAccessToken` from `@/api/client`
    - Test 1 (Bug 1): call `storeToken('abc')` → assert `localStorage.getItem('access_token')` equals `'abc'`
    - Test 2 (Bug 2 mirror): call `storeToken('abc')` → assert `getAccessToken()` equals `'abc'` (in-memory sync)
    - Test 3: call `clearToken()` → assert `localStorage.getItem('access_token')` is null AND `getAccessToken()` is null
  - Run test on UNFIXED code: `npm test -- --run` in `frontend-next/`
  - **EXPECTED OUTCOME**: Test 1 FAILS (confirms Bug 1 — `storeToken` does not write to `localStorage`)
  - Document counterexample found: `storeToken('abc')` → `localStorage.getItem('access_token') === null`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Existing Token Flows Unchanged After Fix
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: `storeToken('x')` sets `getAccessToken()` to `'x'` ✓ (in-memory still works)
  - Observe on UNFIXED code: `clearToken()` sets `getAccessToken()` to `null` ✓
  - Observe on UNFIXED code: the JS cookie is set when `storeToken` is called ✓
  - Write property-based tests in `frontend-next/test/storeToken.test.ts`:
    - Property: for all random token strings `t`, `storeToken(t)` → `getAccessToken() === t` (in-memory must still work after fix)
    - Property: `clearToken()` always results in `getAccessToken() === null`
    - Property: `storeToken(t)` sets `document.cookie` to include `access_token=${t}` (cookie must still be set)
  - Use `fast-check` for the property-based cases
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behaviors to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix all deployment-blocking bugs

  - [x] 3.1 Fix `storeToken` and `clearToken` in `frontend-next/api/client.ts`
    - Add `localStorage.setItem('access_token', token)` inside `storeToken` (after the cookie line)
    - Add `localStorage.removeItem('access_token')` inside `clearToken` (after the cookie clear line)
    - Guard both with `typeof window !== 'undefined'` (already present, just extend the block)
    - Fix the JSDoc comment in `auth.ts` line 27: `// stores in memory, cookie, and localStorage`
    - _Bug_Condition: isBugCondition(context) where context.operation = 'storeToken' AND localStorage not written_
    - _Expected_Behavior: storeToken(t) → localStorage.getItem('access_token') === t AND getAccessToken() === t_
    - _Preservation: in-memory store and cookie behavior unchanged_
    - _Requirements: 2.1, 3.1, 3.2, 3.3_

  - [x] 3.2 Fix `Register.tsx` — replace raw `localStorage.setItem` with `storeToken`
    - File: `frontend-next/views/Register.tsx`
    - Add import: `import { storeToken } from '@/api/client';`
    - Replace the two lines:
      ```
      localStorage.setItem('access_token', result.data.access_token);
      document.cookie = `access_token=${result.data.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      ```
      with:
      ```
      storeToken(result.data.access_token);
      ```
    - _Requirements: 2.2_

  - [x] 3.3 Fix `googleAuth.ts` — replace raw `localStorage.setItem` with `storeToken`
    - File: `frontend-next/lib/googleAuth.ts`
    - Add import: `import { storeToken } from '@/api/client';`
    - Replace `localStorage.setItem('access_token', access_token);` with `storeToken(access_token);`
    - Also remove the outdated JSDoc comment line that says `localStorage.setItem('access_token', access_token);`
    - _Requirements: 2.3_

  - [x] 3.4 Add `trust proxy` to Express backend
    - File: `backend/index.js`
    - Add `app.set('trust proxy', 1);` immediately after `const app = express();` (before the Sentry init call)
    - This ensures `req.ip` resolves to the real end-user IP behind Railway/Render load balancers
    - _Requirements: 2.4_

  - [x] 3.5 Add missing columns to base database migration
    - File: `backend/db/migrate.js`
    - In the `orders` CREATE TABLE: add `chapa_tx_ref TEXT` column after `stripe_session_id TEXT`
    - In the `users` CREATE TABLE: add `referral_code TEXT UNIQUE` and `referred_by UUID REFERENCES users(id) ON DELETE SET NULL` after `updated_at`
    - In the `user_profiles` CREATE TABLE: add `points INTEGER NOT NULL DEFAULT 0` after `ticker_text`
    - Also add a `commissions` CREATE TABLE to `migrate.js` or confirm it exists in a later migration file and add a `status TEXT NOT NULL DEFAULT 'collected'` column — if the table is in a later migration file, add the column there instead
    - After editing, verify `node db/migrate-all.js` runs without errors on a fresh DB
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 3.6 Fix CSP WebSocket hosts in `next.config.ts`
    - File: `frontend-next/next.config.ts`
    - Update the `connect-src` line to dynamically derive the WebSocket URL from `apiHost`:
      ```typescript
      const wsHost = apiHost.replace(/^https?:/, 'wss:').replace(/^http:/, 'ws:');
      ```
    - Replace the hardcoded `ws://localhost:3001 wss://localhost:3001` entries with:
      ```
      `connect-src 'self' ${apiHost} ${wsHost} ws://localhost:3001 wss://localhost:3001 wss://*.railway.app wss://*.up.railway.app https://*.sentry.io https://api.stripe.com https://api.chapa.co`
      ```
    - This ensures production WebSocket connections to Railway are allowed while dev connections still work
    - _Requirements: 2.8, 3.7_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — `storeToken` Writes to localStorage
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run: `npm test -- --run` in `frontend-next/`
    - **EXPECTED OUTCOME**: All tests in `storeToken.test.ts` PASS (confirms Bugs 1-4 are fixed)
    - _Requirements: Expected Behavior Properties from design — 2.1, 2.2, 2.3_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** — In-Memory and Cookie Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `npm test -- --run` in `frontend-next/`
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions in existing auth flows)
    - Confirm `getAccessToken()` still returns the in-memory token
    - Confirm cookie is still being set by `storeToken`

- [x] 4. Checkpoint — Ensure all tests pass and manual smoke tests succeed
  - Run `npm test -- --run` in `frontend-next/` — all tests green
  - Run `npm run lint` in `frontend-next/` — no lint errors
  - Run `npx tsc --noEmit` in `frontend-next/` — no type errors
  - Manually verify: login → page refresh → user is still authenticated (not redirected to /login)
  - Manually verify: register → OTP verify → navigate to /feed → authenticated state preserved
  - Check backend: `node db/migrate-all.js` on a fresh PostgreSQL DB completes without errors
  - Ask the user if any questions arise before marking complete

## Notes

- Write exploration and preservation tests BEFORE implementing any fix (tasks 1 and 2 must be completed first).
- The exploration test (task 1) is expected to FAIL on unfixed code — this is correct and proves the bug exists.
- Run all tests with `npm test -- --run` (single-run mode, not watch mode).
- The database migration fix (task 3.5) only needs to be applied to `migrate.js` — later migrations that already add these columns should be reviewed and deduplicated if necessary to avoid conflicts on a fresh install.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "wave": 4, "tasks": ["3.7", "3.8"] },
    { "wave": 5, "tasks": ["4"] }
  ]
}
```

Tasks 3.1–3.6 can be implemented in any order (they are independent changes in different files). Tasks 3.7 and 3.8 must come after all implementation tasks are complete.
