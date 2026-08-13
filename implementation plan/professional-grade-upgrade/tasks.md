# Implementation Plan: Professional-Grade Upgrade

## Overview

This plan converts the seven engineering-quality upgrade areas into incremental coding tasks.
Each task builds on the previous, starting with infrastructure/config changes, then
implementing each upgrade area, and finally wiring everything together. The stack is
JavaScript/TypeScript — Express.js backend and Next.js 16 frontend.

---

## Tasks

- [x] 1. Backend infrastructure — middleware, error helpers, and pool config
  - [x] 1.1 Create `backend/middleware/requestId.js` — UUID injection middleware
    - Import `uuid` (`v4`) and mount as described in the design
    - Attach `req.requestId` and set `X-Request-ID` response header
    - _Requirements: 5.8_
  - [x] 1.2 Create `backend/middleware/httpLogger.js` — structured HTTP access log
    - Use Pino logger; log `method`, `url`, `statusCode`, `responseTimeMs`, `requestId` on `res.finish`
    - _Requirements: 5.5_
  - [x] 1.3 Create `backend/middleware/apiVersion.js` — API-Version header middleware
    - Set `API-Version: 1` response header on every response
    - _Requirements: 6.3_
  - [x] 1.4 Create `backend/lib/apiError.js` — standardised error helpers
    - Implement `notFound`, `validationError`, `methodNotAllowed`, `serverError` helpers
    - Each helper returns the correct HTTP status + `{ error, code }` shape
    - _Requirements: 6.2, 6.4, 6.5, 6.8_
  - [x] 1.5 Update `backend/db/pool.js` — bounded, monitored connection pool
    - Set `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` from env vars / defaults
    - Wire `pool.on('error')` to `logger.error` with `component: "db-pool"`
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 1.6 Write unit tests for `apiError.js` helpers (`backend/test/unit/apiError.test.js`)
    - Test each helper: correct status code + correct JSON shape
    - _Requirements: 6.2, 6.4, 6.5, 6.8_
  - [ ]* 1.7 Write unit tests for pool error handler (`backend/test/unit/pool.test.js`)
    - Mock `pg.Pool`; assert `logger.error` is called with `component: "db-pool"`
    - _Requirements: 7.3_

- [x] 2. Mount new middleware and update `backend/index.js`
  - [x] 2.1 Mount `requestId`, `httpLogger`, and `apiVersion` middleware in `backend/index.js`
    - Mount before all route registrations in the correct order
    - Replace `console.error` in the global error handler with `logger.error`
    - _Requirements: 5.5, 5.6, 5.8, 6.3_
  - [x] 2.2 Add `/metrics` endpoint (admin-guarded) to `backend/index.js`
    - Report `pool.totalCount`, `pool.idleCount`, `pool.waitingCount`
    - Guard with `requireAuth` + `requireAdmin` middleware
    - _Requirements: 7.8_
  - [x] 2.3 Add 405 catch-all handler at the end of all route registrations in `backend/index.js`
    - Call `apiError.methodNotAllowed(res)` for any unmatched method on any path
    - Replaces the previous 404 fallback; covers both 404 and 405 cases
    - _Requirements: 6.8_
  - [ ]* 2.4 Write property test: every HTTP response carries `API-Version` header (`backend/test/property/apiVersion.test.js`)
    - **Property 10: Every HTTP response carries the API-Version header**
    - **Validates: Requirements 6.3**
    - Use `supertest` + `fast-check` over generated route+method pairs; `numRuns: 100`
  - [ ]* 2.5 Write property test: every backend error response follows standard shape (`backend/test/property/errorShape.test.js`)
    - **Property 11: Every backend route error response follows the standard error shape**
    - **Validates: Requirements 6.2, 6.4, 6.5, 6.8**
    - Assert JSON body contains non-empty `error` string and non-empty `code` string; status in 4xx–5xx
  - [ ]* 2.6 Write property test: every HTTP request produces a structured log entry (`backend/test/property/httpLogger.test.js`)
    - **Property 12: Every HTTP request produces a structured log entry with all required fields**
    - **Validates: Requirements 5.5, 5.8**
    - Assert log entry contains: `method`, `url`, `statusCode`, `responseTimeMs`, `requestId`
  - [ ]* 2.7 Write property test: X-Request-ID is a valid UUID on every response (`backend/test/property/requestId.test.js`)
    - **Property 13: X-Request-ID header is a valid UUID on every response**
    - **Validates: Requirements 5.8**
    - Assert `X-Request-ID` header is present and matches UUID v4 format on all responses

- [x] 3. Update `routes/auth.js`, `routes/orders.js`, `routes/wallet.js` to use `apiError` helpers
  - [x] 3.1 Update `routes/auth.js` — replace ad-hoc error responses with `apiError` helpers
    - Replace `console.*` calls with `logger.*`; use `notFound`, `validationError`, `serverError`
    - Ensure success responses use `data` field for collections / top-level object for single resources
    - _Requirements: 5.6, 6.1, 6.2, 6.6_
  - [x] 3.2 Update `routes/orders.js` — same apiError + response-shape standardisation
    - Replace `console.*` calls with `logger.*`; apply `notFound`, `validationError`, `serverError`
    - _Requirements: 5.6, 6.1, 6.2, 6.6_
  - [x] 3.3 Update `routes/wallet.js` — same apiError + response-shape standardisation
    - Replace `console.*` calls with `logger.*`; apply `notFound`, `validationError`, `serverError`
    - _Requirements: 5.6, 6.1, 6.2, 6.6_
  - [ ]* 3.4 Write unit tests for `sentry.js` initialisation (`backend/test/unit/sentry.test.js`)
    - Test: initialises when `SENTRY_DSN` is set; logs warning when absent; does not throw
    - _Requirements: 5.1_

- [x] 4. Backend integration tests for auth, orders, and wallet routes
  - [x] 4.1 Create `backend/test/helpers/mockPool.js` — Jest mock for `db/pool.js`
    - Export `query` and `connect` as `jest.fn()`; provide `TEST_DATABASE_URL` fallback logic
    - If neither mock pool nor test DB is available, halt the test run with a descriptive error
    - _Requirements: 4.2_
  - [x] 4.2 Write `backend/test/integration/auth.test.js`
    - Cover: register (success + conflict), login (success + invalid), refresh, logout
    - Use mock pool; achieve ≥ 80% line coverage on `routes/auth.js`
    - _Requirements: 4.1, 4.2, 4.5, 4.7_
  - [x] 4.3 Write `backend/test/integration/orders.test.js`
    - Cover: create order, list by buyer, list by seller, status update
    - Use mock pool; achieve ≥ 80% line coverage on `routes/orders.js`
    - _Requirements: 4.1, 4.2, 4.5, 4.7_
  - [x] 4.4 Write `backend/test/integration/wallet.test.js`
    - Cover: get balance, top-up (admin), withdraw (success + insufficient funds)
    - Use mock pool; achieve ≥ 80% line coverage on `routes/wallet.js`
    - _Requirements: 4.1, 4.2, 4.5, 4.7_
  - [ ]* 4.5 Write property test: wallet transaction JSON round-trip (`backend/test/property/walletTransaction.test.js`)
    - **Property 9: Wallet transaction round-trip serialisation**
    - **Validates: Requirements 4.3**
    - Use `fast-check`; `numRuns: 100`; vary all fields including `type` union (`credit`, `debit`, `withdrawal`, `refund`, `pending_topup`, `failed_topup`)
    - Assert `JSON.parse(JSON.stringify(tx))` deeply equals original `tx`

- [ ] 5. Checkpoint — backend tests and middleware
  - Ensure all tests pass (`npm run test:unit` in `backend/`), ask the user if questions arise.

- [x] 6. Database migration — composite indexes
  - [x] 6.1 Create `backend/db/migrate11.js` — add composite indexes
    - `CREATE INDEX IF NOT EXISTS` for notifications, orders (seller + buyer), and products
    - Follow the same module structure as existing migrate files
    - _Requirements: 7.4, 7.5, 7.6, 7.9_

- [ ] 7. TypeScript strict mode — frontend config and type fixes
  - [x] 7.1 Update `frontend-next/tsconfig.json` — set `"strict": true`
    - Replace `"strict": false` with `"strict": true`
    - _Requirements: 1.3_
  - [-] 7.2 Update `frontend-next/next.config.ts` — add ESLint rules; do NOT remove `ignoreBuildErrors` yet
    - Add `@typescript-eslint/no-explicit-any` and `@typescript-eslint/ban-ts-comment` ESLint rules to the ESLint config
    - Leave `typescript.ignoreBuildErrors: true` in place until all type errors in 7.3 are resolved
    - _Requirements: 1.2, 1.5_
  - [-] 7.3 Fix TypeScript strict-mode errors across all frontend `.tsx` / `.ts` files
    - Run `tsc --noEmit` to obtain the full error list; fix errors category by category:
      - Add `@types/*` devDependencies for any untyped third-party packages (_Requirements: 1.7_)
      - Fix `forwardRef` signatures for Radix UI / shadcn/ui wrappers using `React.forwardRef<ElType, PropType>` (_Requirements: 1.4_)
      - Replace `as any` / `@ts-ignore` with proper generic types or type guards (_Requirements: 1.5_)
      - Add explicit return types where inference fails under strict null checks (_Requirements: 1.1_)
    - `tsc --noEmit` must exit with code 0 before proceeding to 7.4
    - _Requirements: 1.1, 1.4, 1.5, 1.7_
  - [~] 7.4 Remove `typescript.ignoreBuildErrors` from `next.config.ts` after zero errors confirmed
    - Verify `tsc --noEmit` exits with code 0 before applying this change
    - Ensures the Build_Pipeline enforces the zero-error baseline going forward
    - _Requirements: 1.2, 1.6_

- [x] 8. Frontend — Zustand global store setup
  - [x] 8.1 Create `frontend-next/store/authSlice.ts`
    - Implement `AuthSlice` interface: `user`, `isAuthenticated`, `isLoading`, `error`, `checkAuth`, `logout`
    - Add `checkAuth` promise-ref deduplication (coalesce concurrent calls to one `GET /api/auth/me`)
    - Wire `persist` middleware to `sessionStorage` with key `halehame-auth`
    - _Requirements: 3.1, 3.2, 3.8_
  - [x] 8.2 Create `frontend-next/store/notificationsSlice.ts`
    - Implement `unreadCount`, `list`, `isLoading`, `error` fields, and WebSocket update action
    - WebSocket update action increments `unreadCount` and prepends the notification to `list`
    - _Requirements: 3.1, 3.3_
  - [x] 8.3 Create `frontend-next/store/cartSlice.ts`
    - Implement `CartSlice` interface: `items`, `total`, `count`, `isLoading`, `error`, `addItem`, `removeItem`, `updateQty`, `clearCart`
    - Add optimistic update + rollback pattern for all mutations
    - _Requirements: 3.1, 3.4_
  - [x] 8.4 Create `frontend-next/store/feedSlice.ts`
    - Implement paginated feed with `isLoading` and `error` fields
    - _Requirements: 3.1, 3.6_
  - [x] 8.5 Create `frontend-next/store/index.ts` — compose all slices into `AppStore`
    - Export `useAppStore` hook combining `auth`, `notifications`, `cart`, and `feed` slices
    - _Requirements: 3.1_
  - [ ]* 8.6 Write property test: auth slice fetch coalesces concurrent requests (`frontend-next/test/property/authSlice.test.ts`)
    - **Property 4: Auth slice fetch coalesces concurrent requests**
    - **Validates: Requirements 3.2**
    - Call `checkAuth()` N times concurrently; assert exactly one `GET /api/auth/me` was made
  - [ ]* 8.7 Write property test: notification WebSocket events update store slice in-place (`frontend-next/test/property/notificationsSlice.test.ts`)
    - **Property 5: Notification WebSocket events update the store slice in-place**
    - **Validates: Requirements 3.3**
    - For any valid notification payload, assert `unreadCount` incremented by 1 and notification prepended to `list`
  - [ ]* 8.8 Write property test: cart optimistic update rolls back on API failure (`frontend-next/test/property/cartSlice.test.ts`)
    - **Property 6: Cart optimistic update rolls back on API failure**
    - **Validates: Requirements 3.4**
    - For any cart state and any rejected API mutation, assert pre-mutation state is restored
  - [ ]* 8.9 Write property test: every store slice exposes `isLoading` and `error` fields (`frontend-next/test/property/storeSlices.test.ts`)
    - **Property 7: Store slice always exposes isLoading and error fields**
    - **Validates: Requirements 3.6**
    - For each slice (`auth`, `notifications`, `cart`, `feed`), assert `isLoading` and `error` fields exist and transition correctly during fetches
  - [ ]* 8.10 Write property test: auth slice persists and rehydrates without a network call (`frontend-next/test/property/authPersistence.test.ts`)
    - **Property 8: Auth slice persists and rehydrates without a network call**
    - **Validates: Requirements 3.8**
    - Simulate page reload (clear in-memory store, re-instantiate); assert auth state restored from `sessionStorage` without a new `GET /api/auth/me`

- [ ] 9. Migrate CartContext to Zustand and replace per-component fetch patterns
  - [x] 9.1 Rewrite `frontend-next/lib/CartContext.tsx` to delegate to `useAppStore` cart slice
    - Maintain same `useCart()` public API — zero changes to existing call sites
    - _Requirements: 3.5_
  - [-] 9.2 Replace local `useEffect + useState` fetch patterns in shared-data views
    - Identify views that fetch user profile, notification count, or other globally-shared data using local state
    - Replace with Store subscriptions via `useAppStore` so data is fetched once and shared
    - _Requirements: 3.7_
  - [ ]* 9.3 Write property test: CartContext mutations propagate errors to callers (`frontend-next/test/property/cartContext.test.ts`)
    - **Property 3: CartContext mutations propagate errors to callers**
    - **Validates: Requirements 2.6**
    - For any CartContext mutation (`addItem`, `removeItem`, `updateQty`, `clearCart`) whose API call rejects, assert the returned Promise rejects with the original error

- [x] 10. Create frontend API client and error/retry UI components
  - [x] 10.1 Create or update `frontend-next/api/client.ts` — axios instance with timeout + interceptor
    - Set `timeout: 30_000`; response interceptor catches `ECONNABORTED`/`ERR_CANCELED` and re-throws with `{ isTimeout: true, message: '...' }` shape
    - _Requirements: 2.7_
  - [x] 10.2 Create `frontend-next/components/ui/ErrorState.tsx`
    - Implement `ErrorStateProps` interface: `message: string`, `onRetry?: () => void`, `retryLabel?: string`
    - Renders icon + human-readable message + RetryButton
    - _Requirements: 2.1, 2.2_
  - [x] 10.3 Create `frontend-next/components/ui/ErrorBoundary.tsx`
    - Class component; `componentDidCatch` calls `Sentry.captureException(error)`
    - Renders fallback UI on render error
    - _Requirements: 2.5, 5.4_
  - [x] 10.4 Wire Sentry initialisation in `frontend-next/lib/sentry.ts`
    - Call `Sentry.init` with `NEXT_PUBLIC_SENTRY_DSN`; no-op (skip without throwing) when variable is absent
    - _Requirements: 5.2_
  - [ ]* 10.5 Write property test: view error state always includes a RetryButton (`frontend-next/test/property/errorState.test.tsx`)
    - **Property 1: View error state always includes a RetryButton**
    - **Validates: Requirements 2.1, 2.2, 2.8**
    - For any view + any failed API response (any status code, any message), assert rendered output contains a non-empty error message and an interactive RetryButton
  - [ ]* 10.6 Write property test: mutation error toast always contains a non-empty message (`frontend-next/test/property/mutationToast.test.tsx`)
    - **Property 2: Mutation error toast always contains a non-empty message**
    - **Validates: Requirements 2.4**
    - For any `{ error?: string }` API response shape, assert the toast text rendered by Sonner is a non-empty string

- [ ] 11. Apply error-handling pattern to all frontend views
  - [-] 11.1 Fix empty `catch {}` blocks in all views that perform network requests
    - For fetch errors: set the relevant Zustand slice `error` field; render `<ErrorState onRetry={reload} />`
    - For mutation errors: call `toast.error(message)` using Sonner with a fallback string if the `error` field is absent
    - Zero empty `catch {}` or `catch (e) {}` blocks may remain in network-request code paths
    - _Requirements: 2.3, 2.4_
  - [-] 11.2 Wrap all views listed in `frontend-next/views/` with `<ErrorBoundary>`
    - Match the pattern already present in `Wallet.tsx` and `Orders.tsx`
    - Every view file must export its default component wrapped in `<ErrorBoundary>`
    - _Requirements: 2.8_
  - [-] 11.3 Fix CartContext `removeItem`, `updateQty`, `clearCart` — re-throw errors in catch blocks
    - Change `catch {}` → `catch (err) { throw err; }` in each of the three methods
    - Enables callers to receive the error and display a toast notification
    - _Requirements: 2.6_

- [ ] 12. Frontend tests — user flows
  - [-] 12.1 Write `frontend-next/test/login.test.tsx`
    - Cover: empty form submission → validation errors displayed; valid credentials → API call made + redirect
    - _Requirements: 4.4, 4.6_
  - [ ] 12.2 Write `frontend-next/test/register.test.tsx`
    - Cover: valid form submission → API call + success flow; API failure → error message displayed
    - _Requirements: 4.4, 4.6_
  - [~] 12.3 Write `frontend-next/test/cart.test.tsx`
    - Cover: add item, remove item, empty cart state, error propagation to caller
    - Tests run against mocked Zustand store
    - _Requirements: 4.4, 4.6_
  - [~] 12.4 Write `frontend-next/test/walletTopup.test.tsx`
    - Cover: invalid amount → validation error displayed; valid amount → successful submission flow
    - _Requirements: 4.4, 4.6_

- [~] 13. Final checkpoint — full suite green
  - Run `tsc --noEmit` (must exit 0), `npm run test:unit` in `backend/`, and `npm test` in `frontend-next/`
  - Ensure all tests pass. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they implement property-based tests.
- Each task references specific requirements for traceability.
- The TypeScript strict-mode fix (Task 7) must be completed in order: enable strict (7.1) → add ESLint rules (7.2) → fix all type errors (7.3) → only then remove `ignoreBuildErrors` (7.4).
- Backend middleware tasks (1–3) should be completed before frontend tasks to keep the stack consistent.
- `fast-check` is already installed in both `backend/package.json` (v3) and `frontend-next/package.json` (v4) devDependencies.
- Property tests must include the tag comment: `// Feature: professional-grade-upgrade, Property {N}: {text}`
- Error message fallbacks when API response lacks an `error` field: timeout → `"Request timed out. Please try again."`, network → `"Network error. Please check your connection."`, 5xx → `"Something went wrong. Please try again."`, unknown → `"An unexpected error occurred."`

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "6.1", "7.1"] },
    { "id": 1, "tasks": ["1.6", "1.7", "2.1", "2.2", "2.3", "4.1", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 2, "tasks": ["2.4", "2.5", "2.6", "2.7", "3.1", "3.2", "3.3", "8.5", "8.6", "8.7", "8.8", "8.9", "8.10"] },
    { "id": 3, "tasks": ["3.4", "4.2", "4.3", "4.4", "9.1", "9.2", "10.1", "10.2", "10.3", "10.4", "7.2"] },
    { "id": 4, "tasks": ["4.5", "9.3", "10.5", "10.6", "7.3"] },
    { "id": 5, "tasks": ["11.1", "11.2", "11.3", "7.4"] },
    { "id": 6, "tasks": ["12.1", "12.2", "12.3", "12.4"] }
  ]
}
```
