# Requirements Document

## Introduction

Empire X is a Next.js 16 + Express.js African Superapp (social feed, marketplace, wallet,
tasks, messaging, showrooms, and more). The codebase is functionally complete but carries
several engineering-quality gaps that must be resolved before the product can be considered
production-grade. This document captures requirements across seven upgrade areas:

1. TypeScript discipline — 931 type errors, `ignoreBuildErrors: true`, `strict: false`
2. Error handling — ~20 views with empty `catch {}` blocks, no user-visible retry states
3. State management — no global store, per-component data fetching, duplicate API calls
4. Testing — 19 frontend tests, 0 backend route integration tests
5. Observability — Sentry DSN unconfigured, no performance monitoring
6. API consistency — mixed response shapes, no versioning
7. Database — no connection-pool limits, missing composite indexes

---

## Glossary

- **System**: The Empire X application as a whole (frontend + backend).
- **Frontend**: The Next.js 16 TypeScript application in `frontend-next/`.
- **Backend**: The Express.js application in `backend/`.
- **TypeChecker**: The TypeScript compiler (`tsc --noEmit`) running over the Frontend.
- **Build_Pipeline**: The `next build` command executed during CI and deployment.
- **Sentry**: The `@sentry/node` / `@sentry/nextjs` error-tracking service.
- **Logger**: The Pino-based structured logger in `backend/lib/logger.js`.
- **Store**: The Zustand global state store introduced by this upgrade.
- **Pool**: The `pg.Pool` PostgreSQL connection pool in `backend/db/pool.js`.
- **PgBouncer**: A connection-pooling proxy that sits between the Backend and PostgreSQL.
- **API_Response**: A JSON object returned by the Backend for any HTTP request.
- **Test_Suite**: The collection of Jest (backend) and Vitest (frontend) tests.
- **ErrorBoundary**: A React component that catches render errors and shows a fallback UI.
- **RetryButton**: A UI element that re-invokes the last failed data-fetch or mutation.
- **CatchBlock**: A JavaScript `catch` clause in a `try/catch` construct.
- **CompositeIndex**: A PostgreSQL index defined over two or more columns.

---

## Requirements

---

### Requirement 1: TypeScript Strict Mode

**User Story:** As a developer, I want the entire Frontend to compile without suppressed
type errors, so that type safety catches bugs at compile time rather than at runtime.

#### Acceptance Criteria

1. THE TypeChecker SHALL produce zero type errors when run against the Frontend codebase.

2. WHEN the Build_Pipeline runs, THE Build_Pipeline SHALL succeed with `ignoreBuildErrors`
   removed from `next.config.ts`.

3. THE Frontend `tsconfig.json` SHALL enable `"strict": true`, replacing the current
   `"strict": false`.

4. WHEN a `forwardRef` component wraps a Radix UI or shadcn/ui primitive, THE TypeChecker
   SHALL accept the component's `children` prop type without a cast to `any`.

5. THE Frontend codebase SHALL contain zero uses of `as any` or `@ts-ignore` that exist
   solely to suppress a type error rather than to bridge a genuine third-party gap.

6. WHEN a new TypeScript file is added to the Frontend, THE Build_Pipeline SHALL reject
   the file if it introduces a new type error, ensuring the zero-error baseline is maintained.

7. IF the TypeChecker encounters a missing type definition for a third-party package, THEN
   THE Frontend package.json SHALL declare a corresponding `@types/*` devDependency.

---

### Requirement 2: Error Handling and User-Visible Retry

**User Story:** As an end user, I want to see a clear error message with a retry option
whenever an API call fails, so that I am never left staring at a blank or frozen screen.

#### Acceptance Criteria

1. WHEN an API call in any Frontend view or component throws an error, THE Frontend SHALL
   render an error state containing a human-readable message derived from the API response
   or a fallback string, rather than remaining in the loading state or rendering nothing.

2. WHEN an error state is rendered, THE Frontend SHALL display a RetryButton that, when
   activated, re-invokes the failed fetch or mutation without requiring a full page reload.

3. THE Frontend codebase SHALL contain zero empty CatchBlocks of the form `catch {}` or
   `catch (e) {}` in code paths that perform network requests to the Backend.

4. WHEN a mutation (POST, PUT, DELETE) fails, THE Frontend SHALL surface the error via a
   toast notification containing a message derived from the API response's `error` field,
   or a localised fallback string if that field is absent.

5. WHERE a view manages its own loading and error state, THE Frontend SHALL also export or
   compose an `<ErrorBoundary>` that catches unexpected render-time exceptions and displays
   a fallback UI instead of an empty white screen.

6. WHEN the CartContext fails to remove, update, or clear a cart item, THE CartContext
   SHALL propagate the error to the calling component so that the UI can notify the user,
   rather than silently swallowing the failure.

7. IF a network request has not received a response after exactly 30 seconds, THEN THE
   Frontend SHALL cancel the request, display a timeout-specific error message, and offer
   the user a RetryButton; the timeout threshold SHALL be exactly 30,000 ms with no
   tolerance applied.

8. FOR ALL views listed in `frontend-next/views/`, THE Frontend SHALL display an error
   state and RetryButton when the initial data-load request fails, matching the pattern
   already present in `Wallet.tsx` and `Orders.tsx`.

---

### Requirement 3: Global State Management with Zustand

**User Story:** As a developer, I want shared application state managed in a single Zustand
store, so that API calls are deduplicated, loading states are consistent, and components
can subscribe to the data they need without prop-drilling or redundant fetches.

#### Acceptance Criteria

1. THE Frontend SHALL include a Zustand store (`frontend-next/store/`) that exposes slices
   for at least: `auth` (current user, auth status), `notifications` (unread count and list),
   `cart` (cart items and totals), and `feed` (paginated home-feed posts).

2. WHEN the authenticated user's data is needed by two or more components rendered on the
   same page, THE Store SHALL provide the data from a single cached value rather than
   triggering two separate `GET /api/auth/me` requests.

3. WHEN a notification is received over the WebSocket, THE Store SHALL update the
   `notifications` slice in-place so that the notification badge in the navbar reflects
   the new count without a page refresh.

4. WHEN a cart mutation (add, remove, update) succeeds, THE Store SHALL update the `cart`
   slice optimistically before the API response returns, and SHALL roll back the optimistic
   update IF the API request fails.

5. THE `CartContext` in `frontend-next/lib/CartContext.tsx` SHALL be migrated to read from
   and write to the Zustand `cart` slice, maintaining the same `useCart()` public API so
   that existing call sites require no changes.

6. WHEN the Store fetches data for any slice, including background refreshes and cached
   data updates, THE Store SHALL expose an `isLoading` flag and an `error` field for
   that slice so that consuming components can render appropriate loading and error states
   for all data-fetching operations without exception.

7. WHERE a view currently uses a local `useEffect` + `useState` pair to fetch and hold
   data that is also needed by other views (e.g., user profile, notification count), THE
   Frontend SHALL replace that pattern with a Store subscription.

8. THE Store SHALL persist the `auth` slice to `sessionStorage` so that a page refresh
   within the same browser tab does not require a new `GET /api/auth/me` request.

---

### Requirement 4: Test Coverage

**User Story:** As an engineer, I want a meaningful test suite covering critical backend
routes and key frontend user flows, so that regressions are caught before they reach
production.

#### Acceptance Criteria

1. THE Test_Suite SHALL include backend integration tests for the following route groups:
   `auth` (register, login, refresh, logout), `orders` (create, list, status update), and
   `wallet` (get balance, top-up, withdraw).

2. WHEN a backend integration test runs, THE Backend SHALL use an isolated test database
   or mocked pool, so that test execution does not affect the development database; IF
   the isolated test database or mocked pool cannot be initialised, THEN THE Test_Suite
   SHALL halt the test run entirely rather than proceeding against the development database.

3. THE Test_Suite SHALL include at least one property-based test using `fast-check` that
   verifies the round-trip property: for all valid wallet transaction records, serialising
   then deserialising the record produces a value equivalent to the original.

4. THE Test_Suite SHALL include frontend tests for the following user flows: login form
   validation, registration form submission, cart add/remove operations, and the Wallet
   top-up form validation.

5. WHEN the `npm test` script runs in CI, THE Test_Suite SHALL execute all backend unit
   and integration tests and exit with code 0 when all tests pass.

6. WHEN the `npm test` script runs in the Frontend, THE Test_Suite SHALL execute all
   Vitest tests and exit with code 0 when all tests pass.

7. THE Test_Suite SHALL achieve at least 80% line coverage on the following backend route
   files: `routes/auth.js`, `routes/orders.js`, and `routes/wallet.js`.

8. IF a pull request introduces a new backend route handler, THEN THE Test_Suite SHALL
   include at least one integration test that exercises the happy path of that handler.

---

### Requirement 5: Observability — Sentry and Structured Logging

**User Story:** As an operator, I want every unhandled exception and slow transaction
captured in Sentry, and every server-side event emitted as structured JSON, so that I can
diagnose issues in production without reading raw `console.log` output.

#### Acceptance Criteria

1. THE Backend SHALL initialise Sentry using the `SENTRY_DSN` environment variable on
   startup; WHEN `SENTRY_DSN` is absent, THE Backend SHALL log a warning and continue
   without Sentry rather than exiting.

2. THE Frontend SHALL initialise `@sentry/nextjs` using `NEXT_PUBLIC_SENTRY_DSN`;
   WHEN the variable is absent, THE Frontend SHALL skip Sentry initialisation without
   throwing an error.

3. WHEN an unhandled exception reaches the Backend global error handler, THE Backend SHALL
   capture the exception in Sentry before returning the HTTP 500 response to the client.

4. WHEN a React render error is caught by an ErrorBoundary, THE Frontend SHALL call
   `Sentry.captureException` so the error is reported to the Sentry project.

5. THE Backend SHALL emit every HTTP request and response as a structured Pino log entry
   containing at minimum: `method`, `url`, `statusCode`, `responseTimeMs`, and
   `requestId`.

6. THE Backend SHALL replace all remaining `console.error`, `console.warn`, and
   `console.log` calls in route handlers with equivalent `logger.error`, `logger.warn`,
   and `logger.info` calls so that all logs share the same structured format.

7. WHEN `NODE_ENV` is `production`, THE Backend SHALL set Sentry `tracesSampleRate` to
   a value between `0.1` and `0.5` so that performance traces are collected without
   excessive overhead.

8. THE Backend SHALL include a `requestId` (UUID) in every log entry and HTTP response
   header (`X-Request-ID`) for the lifetime of a single request, enabling log correlation.

---

### Requirement 6: API Consistency and Versioning

**User Story:** As a client developer, I want every API response to follow a predictable
shape and carry a version indicator, so that I can write generic error-handling logic and
detect breaking changes without inspecting each endpoint individually.

#### Acceptance Criteria

1. THE Backend SHALL respond to every successful request with a JSON body that contains
   either a `data` field (for single-resource or collection responses) or a top-level
   resource object; THE Backend SHALL NOT mix these two conventions within the same route
   group.

2. WHEN a Backend route returns an error, THE Backend SHALL respond with a JSON body of
   the form `{ "error": "<human-readable message>", "code": "<machine-readable code>" }`
   and an appropriate HTTP status code.

3. THE Backend SHALL include an `API-Version` response header with value `1` on every
   HTTP response, so that clients can detect when a breaking version is deployed.

4. WHEN a 404 Not Found response is required, THE Backend SHALL respond with
   `{ "error": "Resource not found", "code": "NOT_FOUND" }` and HTTP status 404, rather
   than the default Express HTML error page.

5. WHEN a 422 Unprocessable Entity response is required for validation failures, THE
   Backend SHALL respond with `{ "error": "<summary>", "code": "VALIDATION_ERROR",
   "fields": [{ "field": "<name>", "message": "<reason>" }] }` and HTTP status 422.

6. THE Backend routes in `routes/auth.js`, `routes/orders.js`, and `routes/wallet.js`
   SHALL conform to the standardised response shape defined in Acceptance Criteria 1–5
   of this requirement.

7. THE Backend SHALL expose all existing routes under a path prefix of `/api/` (already
   present); WHEN a future breaking change is introduced, THE Backend SHALL introduce a
   `/api/v2/` prefix rather than modifying existing `/api/` routes, preserving backwards
   compatibility.

8. WHEN the Backend receives a request with an unsupported HTTP method on a known path,
   THE Backend SHALL respond with HTTP 405 Method Not Allowed and a body of the form
   `{ "error": "Method not allowed", "code": "METHOD_NOT_ALLOWED" }`.

---

### Requirement 7: Database Connection Pooling and Indexing

**User Story:** As a database administrator, I want the PostgreSQL connection pool to be
bounded and monitored, and high-traffic query paths to be covered by appropriate indexes,
so that the application handles concurrent load without exhausting database connections or
executing full-table scans.

#### Acceptance Criteria

1. THE Pool SHALL be configured with an explicit `max` connection limit of no more than
   20 connections in production, replacing the current unbounded default.

2. THE Pool SHALL be configured with an explicit `idleTimeoutMillis` of 30,000 ms and a
   `connectionTimeoutMillis` of 5,000 ms so that idle connections are reclaimed and
   connection acquisition failures surface quickly.

3. WHEN a pool connection error occurs, THE Backend SHALL always emit a structured
   `logger.error` entry containing the error message and a `component: "db-pool"` field,
   regardless of whether the application recovers automatically, rather than calling
   `console.error`.

4. THE Backend database schema SHALL include a CompositeIndex on
   `notifications(user_id, is_read, created_at DESC)` to accelerate the unread
   notification count query executed on every authenticated page load.

5. THE Backend database schema SHALL include a CompositeIndex on
   `orders(seller_id, status, created_at DESC)` and a separate CompositeIndex on
   `orders(buyer_id, status, created_at DESC)` to accelerate the order list queries
   used in the Orders view.

6. THE Backend database schema SHALL include a CompositeIndex on
   `products(seller_id, status, created_at DESC)` to accelerate the product listing
   queries used in the Marketplace and Showroom views.

7. WHEN PgBouncer is deployed between the Backend and PostgreSQL, THE Pool's
   `DATABASE_URL` SHALL point to the PgBouncer endpoint, and the `Pool` SHALL operate
   in transaction-pooling mode by setting `statement_timeout` at the session level on
   each acquired connection.

8. THE Backend SHALL export a `/metrics` endpoint (restricted to internal network or admin
   role) that reports current pool statistics: `totalCount`, `idleCount`, and
   `waitingCount`, so that pool health can be monitored without access to the database
   server directly.

9. FOR ALL new migration files added to `backend/db/`, THE migration SHALL include
   `CREATE INDEX IF NOT EXISTS` statements for any foreign-key column that does not
   already have a single-column index, ensuring join performance for newly introduced
   tables.
