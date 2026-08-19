# Design Document — Professional-Grade Upgrade

## Overview

Nodbusiness is a Next.js 16 + Express.js Global Superapp that is functionally complete but
carries seven categories of engineering-quality gaps. This upgrade resolves all seven areas
to bring the product to a production-ready baseline:

1. **TypeScript strict mode** — eliminate 931 suppressed type errors
2. **Error handling + retry** — every failed API call shows a user-facing error + RetryButton
3. **Global state with Zustand** — deduplicate API calls, centralise loading/error states
4. **Test coverage** — backend integration tests, frontend flow tests, property-based tests
5. **Observability** — Sentry fully wired, all logs structured via Pino
6. **API consistency** — standardised response envelope + API-Version header
7. **Database** — bounded connection pool, targeted composite indexes

Each area maps directly to one Requirement in the requirements document.

---

## Architecture

```mermaid
flowchart TD
    subgraph Frontend [Next.js 16 Frontend]
        A[Views / Pages] -->|subscribes| B[Zustand Store]
        B --> C[API Client — axios]
        A -->|wraps| D[ErrorBoundary]
        D -->|captureException| E[Sentry — @sentry/nextjs]
        B -->|persist auth| F[sessionStorage]
    end

    subgraph Backend [Express.js Backend]
        G[Routes] --> H[Response Middleware\nenvelope + API-Version + requestId]
        H --> I[pg.Pool — bounded, monitored]
        G -->|logger.info/error| J[Pino Logger]
        J -->|structured JSON| K[Log Aggregator]
        G -->|unhandled error| L[Sentry — @sentry/node]
        I --> M[PostgreSQL]
        N[/metrics endpoint] --> I
    end

    C -->|HTTP /api/...| G
    B -->|WebSocket| G
```

### Key Architectural Decisions

- **Zustand over React Context** — Context re-renders every consumer on any state change;
  Zustand allows components to subscribe to specific slices, avoiding unnecessary re-renders.
- **Slice-per-domain pattern** — `auth`, `notifications`, `cart`, `feed` are separate Zustand
  slices composed into a single store, keeping concerns isolated.
- **Response middleware pattern** — a single Express middleware wraps all route responses to
  inject `API-Version`, `X-Request-ID`, and normalise error shapes, rather than updating
  every route handler individually.
- **Migration-based index additions** — composite indexes are introduced via a dedicated
  migration file (migrate11.js) using `CREATE INDEX IF NOT EXISTS`, which is safe to re-run.

---

## Components and Interfaces

### 2.1 TypeScript — Strict Mode Enablement

**Files to change:**
- `frontend-next/tsconfig.json` — set `"strict": true`
- `frontend-next/next.config.ts` — remove `typescript.ignoreBuildErrors`
- All frontend `.tsx` / `.ts` files with type errors — fix inline

**Strategy:**
1. Enable `strict: true` in tsconfig.
2. Run `tsc --noEmit` to obtain the full error list.
3. Fix errors category by category:
   - Add `@types/*` devDependencies for untyped packages.
   - Replace `as any` with proper generic types or type guards.
   - Fix `forwardRef` signatures by using `React.forwardRef<ElType, PropType>`.
   - Add explicit return types where inference fails under strict null checks.
4. Add `@typescript-eslint/no-explicit-any` and `@typescript-eslint/ban-ts-comment` ESLint rules.
5. Remove `ignoreBuildErrors` only after step 4 passes.


### 2.2 Error Handling and RetryButton

**New shared components:**
- `frontend-next/components/ui/ErrorState.tsx` — renders icon + message + RetryButton
- `frontend-next/components/ui/ErrorBoundary.tsx` — class component, calls `Sentry.captureException`

**ErrorState props interface:**
```typescript
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}
```

**Network request timeout:**  
All `axios` calls are issued through `frontend-next/api/client.ts`. A `timeout: 30_000` is
set on the client instance. The response interceptor catches `ECONNABORTED`/`ERR_CANCELED`
errors and re-throws with a `{ isTimeout: true, message: '...' }` shape.

**View pattern (all 41 views):**
```typescript
// Each view exports a default component wrapped in ErrorBoundary
// with standardised error/loading state managed via the Zustand slice
const [error, setError] = useStore(s => [s.feed.error, s.feed.setError]);
if (error) return <ErrorState message={error} onRetry={reload} />;
```

**CartContext fix:**  
`removeItem`, `updateQty`, and `clearCart` in `CartContext.tsx` currently swallow errors
with empty `catch {}`. Each will be changed to `catch (err) { throw err; }` so callers
can display toast notifications.


### 2.3 Zustand Global State Store

**New directory:** `frontend-next/store/`

```
store/
  index.ts          — composes all slices into one store
  authSlice.ts      — auth user, status, sessionStorage persistence
  notificationsSlice.ts — unread count, list, WS update
  cartSlice.ts      — items, totals, optimistic mutations
  feedSlice.ts      — paginated home-feed posts
```

**Store interface (top-level):**
```typescript
interface AppStore {
  auth: AuthSlice;
  notifications: NotificationsSlice;
  cart: CartSlice;
  feed: FeedSlice;
}
```

**AuthSlice interface:**
```typescript
interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  logout: () => void;
}
```

**CartSlice interface:**
```typescript
interface CartSlice {
  items: CartItem[];
  total: number;
  count: number;
  isLoading: boolean;
  error: string | null;
  addItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQty: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}
```

**SessionStorage persistence** — Zustand `persist` middleware on the `auth` slice only:
```typescript
persist(authSlice, { name: 'nodbusiness-auth', storage: createJSONStorage(() => sessionStorage) })
```

**CartContext migration** — `CartContext.tsx` is rewritten to call into `useAppStore`
(the Zustand store hook) and re-export the same `useCart()` hook so all 41 call sites
require zero changes.

**Deduplication** — The `auth` slice `checkAuth` uses a `promise` ref to coalesce concurrent
calls: if a fetch is already in-flight, subsequent callers await the same promise.


### 2.4 Test Suite

**Backend — new files under `backend/test/`:**
- `test/integration/auth.test.js` — register, login, refresh, logout
- `test/integration/orders.test.js` — create order, list orders, update status
- `test/integration/wallet.test.js` — get balance, top-up (admin), withdraw
- `test/property/walletTransaction.test.js` — fast-check round-trip property

**Backend test setup:**
```javascript
// test/helpers/mockPool.js
const { Pool } = require('pg');
jest.mock('../db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));
```
Tests that need real SQL use a `TEST_DATABASE_URL` env var pointing to a separate test DB.
If neither mock pool nor test DB is available, the suite halts with a descriptive error.

**Frontend — new/updated files under `frontend-next/test/`:**
- `test/login.test.tsx` — login form validation (valid, empty, wrong credentials)
- `test/register.test.tsx` — registration form submission
- `test/cart.test.tsx` — cart add/remove operations against mocked store
- `test/walletTopup.test.tsx` — wallet top-up form validation

**Coverage thresholds** in `backend/package.json` (jest config):
```json
"coverageThreshold": {
  "global": {},
  "./routes/auth.js": { "lines": 80 },
  "./routes/orders.js": { "lines": 80 },
  "./routes/wallet.js": { "lines": 80 }
}
```


### 2.5 Observability — Sentry and Structured Logging

**Backend changes:**

`backend/lib/sentry.js` already conditionally initialises Sentry when `SENTRY_DSN` is set
and logs a warning when absent — this behaviour is correct and requires no change.

`backend/index.js` global error handler currently calls `console.error`; it will be updated
to call `logger.error` and is already positioned after the Sentry error handler middleware.

**Request ID middleware** — new file `backend/middleware/requestId.js`:
```javascript
const { v4: uuidv4 } = require('uuid');
module.exports = (req, res, next) => {
  const id = req.headers['x-request-id'] || uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};
```
Mounted before all routes in `index.js`.

**HTTP access log middleware** — new file `backend/middleware/httpLogger.js`:
```javascript
module.exports = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method, url: req.url,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - start,
      requestId: req.requestId,
    }, 'http');
  });
  next();
};
```

**Frontend changes:**

`frontend-next/lib/sentry.ts` is extended to call `Sentry.init` with
`NEXT_PUBLIC_SENTRY_DSN` and do nothing when the variable is absent.
The `ErrorBoundary` component's `componentDidCatch` calls `Sentry.captureException(error)`.


### 2.6 API Consistency and Versioning

**Response envelope middleware** — new file `backend/middleware/apiVersion.js`:
```javascript
module.exports = (_req, res, next) => {
  res.setHeader('API-Version', '1');
  next();
};
```
Mounted globally in `index.js` before route handlers.

**Standardised error helper** — new file `backend/lib/apiError.js`:
```javascript
function notFound(res, msg = 'Resource not found') {
  return res.status(404).json({ error: msg, code: 'NOT_FOUND' });
}
function validationError(res, summary, fields = []) {
  return res.status(422).json({ error: summary, code: 'VALIDATION_ERROR', fields });
}
function methodNotAllowed(res) {
  return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
}
function serverError(res, msg = 'Internal server error') {
  return res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
}
module.exports = { notFound, validationError, methodNotAllowed, serverError };
```

**Route updates** — `routes/auth.js`, `routes/orders.js`, `routes/wallet.js` are updated
to use the helpers above. Their success responses use a consistent `data` field for
collections and a top-level resource object for single-resource responses (matching current
convention already present in wallet).

**405 handler** — added to `index.js` after all `app.use()` route registrations:
```javascript
app.all('*', (_req, res) => apiError.methodNotAllowed(res));
```
(The current 404 fallback is replaced with this handler which covers both 404 and 405.)


### 2.7 Database Connection Pooling and Indexing

**`backend/db/pool.js` — updated pool configuration:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error({ err: err.message, component: 'db-pool' }, 'Unexpected PostgreSQL pool error');
});
```

**`/metrics` endpoint** — mounted in `index.js` and guarded by `requireAdmin` middleware:
```javascript
app.get('/metrics', requireAuth, requireAdmin, (req, res) => {
  res.json({
    db: {
      totalCount: pool.totalCount,
      idleCount:  pool.idleCount,
      waitingCount: pool.waitingCount,
    },
  });
});
```

**New migration `backend/db/migrate11.js`** — adds all required composite indexes:
```sql
-- Notifications: unread count query on every authenticated page load
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

-- Orders: seller and buyer list queries
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created
  ON orders(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status_created
  ON orders(buyer_id, status, created_at DESC);

-- Products: marketplace and showroom listing queries
CREATE INDEX IF NOT EXISTS idx_products_seller_status_created
  ON products(seller_id, status, created_at DESC);
```

---

## Data Models

### Wallet Transaction (for property-based test)

The existing `wallet_transactions` table record, as serialised to JSON:
```typescript
interface WalletTransaction {
  id: string;           // UUID
  wallet_id: string;    // UUID FK
  type: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'pending_topup' | 'failed_topup';
  amount: number;       // positive decimal
  description: string;
  reference: string | null;
  created_at: string;   // ISO 8601 timestamp
}
```
The round-trip property: `JSON.parse(JSON.stringify(tx))` must produce a value deeply equal
to `tx` for all valid instances.

### Zustand Auth Slice (persisted to sessionStorage)

```typescript
type AuthState = {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    is_verified: boolean;
    created_at: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};
```

### API Error Response Shape

```typescript
interface ApiErrorResponse {
  error: string;        // human-readable message
  code: string;         // machine-readable code: NOT_FOUND, VALIDATION_ERROR, etc.
  fields?: Array<{ field: string; message: string }>; // only for VALIDATION_ERROR
}
```


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions
of a system — essentially, a formal statement about what the system should do. Properties
serve as the bridge between human-readable specifications and machine-verifiable correctness
guarantees.*

**Property Reflection Summary:**

Before listing final properties the following redundancies were resolved:
- Requirements 2.1 and 2.2 both concern error-state rendering; they are combined into one
  property (error state includes RetryButton).
- Requirements 2.1, 2.2, and 2.8 all express the same universal view-level error/retry
  requirement; merged into Property 1.
- Requirements 6.3 (API-Version header) and 5.8 (X-Request-ID header) are both universal
  header-presence properties; kept separate because they test different middleware and
  different fields.
- Requirements 3.2 and 3.8 both concern deduplication/caching of auth state; kept separate
  because 3.2 tests concurrent component behaviour while 3.8 tests persistence across
  page reload.
- Requirements 6.1, 6.2, 6.4, 6.5, 6.6 are related; 6.4/6.5/6.6 are edge cases of the
  general error-shape property (6.2) and are covered by generators that include 404/422
  scenarios; they are not listed as separate properties.

---

### Property 1: View error state always includes a RetryButton

*For any* Frontend view and any failed API response (regardless of HTTP status code or
error message content), the rendered output SHALL contain a non-empty human-readable error
message and an interactive RetryButton element.

**Validates: Requirements 2.1, 2.2, 2.8**

---

### Property 2: Mutation error toast always contains a non-empty message

*For any* mutation operation (POST, PUT, DELETE) that fails, and for any API error response
shape (with or without an `error` field), the toast notification rendered by the Frontend
SHALL contain a non-empty string message.

**Validates: Requirements 2.4**

---

### Property 3: CartContext mutations propagate errors to callers

*For any* CartContext mutation (`addItem`, `removeItem`, `updateQty`, `clearCart`) where
the underlying API call rejects, the returned Promise SHALL reject with the original error,
making it observable by the calling component rather than silently swallowing it.

**Validates: Requirements 2.6**

---

### Property 4: Auth slice fetch coalesces concurrent requests

*For any* number of concurrent consumers that each call `checkAuth()` simultaneously, the
store SHALL issue exactly one `GET /api/auth/me` network request and deliver the same
result to all callers.

**Validates: Requirements 3.2**

---

### Property 5: Notification WebSocket events update the store slice in-place

*For any* valid notification payload received over the WebSocket connection, the Zustand
`notifications` slice SHALL increment `unreadCount` by one and prepend the notification
to the `list`, without requiring a page refresh.

**Validates: Requirements 3.3**

---

### Property 6: Cart optimistic update rolls back on API failure

*For any* cart state and any cart mutation that the API rejects, the Zustand `cart` slice
SHALL first apply the optimistic update (making the change visible immediately), and then
restore the slice to its pre-mutation state after the API call fails.

**Validates: Requirements 3.4**

---

### Property 7: Store slice always exposes isLoading and error fields

*For any* Zustand slice (`auth`, `notifications`, `cart`, `feed`) and any fetch operation
on that slice, the slice SHALL set `isLoading = true` while the fetch is in-flight, set
`isLoading = false` on completion, and set `error` to a non-null string if the fetch fails.

**Validates: Requirements 3.6**

---

### Property 8: Auth slice persists and rehydrates without a network call

*For any* valid auth state stored in the Zustand `auth` slice, clearing the in-memory
store and re-instantiating it (simulating a page reload within the same tab) SHALL restore
the auth state from `sessionStorage` without issuing a new `GET /api/auth/me` request.

**Validates: Requirements 3.8**

---

### Property 9: Wallet transaction round-trip serialisation

*For any* valid `WalletTransaction` record (varying `id`, `type`, `amount`, `description`,
`reference`, and `created_at`), serialising the record to JSON and then deserialising it
SHALL produce a value deeply equal to the original record.

**Validates: Requirements 4.3**

---

### Property 10: Every HTTP response carries the API-Version header

*For any* HTTP request to any backend route, the response SHALL include an `API-Version`
response header with the value `"1"`.

**Validates: Requirements 6.3**

---

### Property 11: Every backend route error response follows the standard error shape

*For any* error condition on any backend route (including 400, 401, 403, 404, 405, 422,
500), the JSON response body SHALL contain a non-empty `error` string and a non-empty
`code` string, and the HTTP status code SHALL be in the 4xx–5xx range.

**Validates: Requirements 6.2, 6.4, 6.5, 6.8**

---

### Property 12: Every HTTP request produces a structured log entry with all required fields

*For any* HTTP request to any backend route, the Pino logger SHALL emit a log entry that
contains all five fields: `method` (string), `url` (string), `statusCode` (integer),
`responseTimeMs` (non-negative integer), and `requestId` (valid UUID v4 string).

**Validates: Requirements 5.5, 5.8**

---

### Property 13: X-Request-ID header is a valid UUID on every response

*For any* HTTP request to any backend route, the `X-Request-ID` response header SHALL be
present and SHALL contain a valid UUID v4 string, matching the `requestId` field in the
corresponding Pino log entry.

**Validates: Requirements 5.8**


---

## Error Handling

### Backend

| Scenario | Handler | Response |
|---|---|---|
| Route-level async error (try/catch) | `apiError.serverError(res)` | 500 + `{ error, code: "INTERNAL_ERROR" }` |
| Validation failure | `apiError.validationError(res, summary, fields)` | 422 + standard shape |
| Resource missing | `apiError.notFound(res)` | 404 + `{ error, code: "NOT_FOUND" }` |
| Unsupported method | `apiError.methodNotAllowed(res)` | 405 + standard shape |
| Unhandled exception bubbles to global handler | `logger.error` + Sentry capture + `res.status(500)` | 500 |
| Pool connection error | `pool.on('error')` → `logger.error({ component: 'db-pool' })` | — (async, no HTTP response) |

### Frontend

| Scenario | Handler | UX |
|---|---|---|
| API call rejects | Zustand slice catches, sets `error` | `<ErrorState>` renders with RetryButton |
| Mutation fails | catch block → `toast.error(message)` | Sonner toast notification |
| Request times out (30 s) | axios timeout → interceptor sets `isTimeout: true` | Timeout-specific error message + RetryButton |
| React render crash | `<ErrorBoundary>` catches + `Sentry.captureException` | Fallback UI |
| CartContext mutation fails | re-throws error to caller | caller shows toast |

### Error Message Fallbacks

When an API response lacks an `error` field, the frontend falls back to:
- Timeout: `"Request timed out. Please try again."`
- Network: `"Network error. Please check your connection."`
- Server 5xx: `"Something went wrong. Please try again."`
- Unknown: `"An unexpected error occurred."`

---

## Testing Strategy

### Dual Testing Approach

Unit tests verify specific examples, edge cases, and error conditions. Property-based tests
(using `fast-check`) verify universal properties across generated inputs. Both are required
for comprehensive coverage.

### Property-Based Testing (fast-check)

fast-check is already present in both `backend/package.json` (v3) and
`frontend-next/package.json` (v4) devDependencies.

**Backend property tests** run under Jest with a minimum of 100 iterations per property:

```javascript
// Example — Property 9: Wallet transaction round-trip
const fc = require('fast-check');
test('wallet transaction JSON round-trip preserves all fields', () => {
  // Feature: professional-grade-upgrade, Property 9: wallet transaction round-trip serialisation
  const txArb = fc.record({
    id: fc.uuid(),
    wallet_id: fc.uuid(),
    type: fc.constantFrom('credit','debit','withdrawal','refund','pending_topup','failed_topup'),
    amount: fc.float({ min: 0.01, max: 1_000_000, noNaN: true }),
    description: fc.string({ minLength: 1 }),
    reference: fc.option(fc.string(), { nil: null }),
    created_at: fc.date().map(d => d.toISOString()),
  });
  fc.assert(fc.property(txArb, (tx) => {
    const result = JSON.parse(JSON.stringify(tx));
    expect(result).toEqual(tx);
  }), { numRuns: 100 });
});
```

**Frontend property tests** run under Vitest + fast-check:

- Property 1: For any view component + mocked rejected API call, rendered output contains
  error message and a button with retry-related aria-label or text.
- Property 2: For any `{ error?: string }` API response shape, the toast text is non-empty.
- Property 3: For any CartContext mutation that rejects, the Promise rejects with the error.
- Property 4: Concurrent `checkAuth()` calls result in exactly one `GET /auth/me`.
- Properties 5–8: Store slice behaviour tested against generated inputs using `@testing-library/react`.
- Properties 10–13: Backend middleware tested with supertest over generated route+method pairs.

**Tag format used in test comments:**  
`Feature: professional-grade-upgrade, Property {N}: {property_text}`

### Unit Tests (Example-Based)

**Backend integration tests** (Jest + supertest):
- `test/integration/auth.test.js`: register success/conflict, login success/invalid, refresh, logout
- `test/integration/orders.test.js`: create order, list by buyer/seller, status update
- `test/integration/wallet.test.js`: get balance, top-up (admin), withdraw (insufficient)
- `test/unit/apiError.test.js`: each helper returns correct status + shape
- `test/unit/sentry.test.js`: initSentry with/without DSN, error handler captures exception
- `test/unit/pool.test.js`: pool config values, error handler calls logger.error

**Frontend tests** (Vitest + Testing Library):
- `test/login.test.tsx`: empty form → validation errors; valid form → API call + redirect
- `test/register.test.tsx`: form submission, error display
- `test/cart.test.tsx`: add item, remove item, empty cart, error propagation
- `test/walletTopup.test.tsx`: invalid amount, valid submission

### CI Integration

CI pipeline (`.github/workflows/ci.yml`) runs:
1. `tsc --noEmit` (frontend) — type safety gate
2. `next build` (frontend) — build gate
3. `npm run test:unit` (backend) — unit + integration tests with coverage
4. `npm test` (frontend) — Vitest tests
5. ESLint with `no-explicit-any` and `ban-ts-comment` rules

