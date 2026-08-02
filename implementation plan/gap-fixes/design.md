# Gap Fixes Bugfix Design

## Overview

This document formalises the fix strategy for 13 identified bugs across the Empire X
full-stack application (Node.js/Express backend + Next.js frontend). The bugs fall into
four categories: migration/schema gaps, route/handler defects, CORS/connectivity issues,
and frontend auth-flow problems. One additional gap covers missing wallet transaction
endpoints.

Each bug is addressed with a minimal, targeted fix. The design uses the bug-condition
methodology: for every bug we formally specify the set of inputs that trigger it (C),
the property the fixed code must satisfy (P), and the set of inputs whose behaviour
must be left completely unchanged (¬C).

---

## Glossary

- **Bug_Condition (C)**: A predicate over inputs that returns `true` when the defective
  code path is reached.
- **Property (P)**: The observable behaviour the fixed code must exhibit for all inputs
  where C holds.
- **Preservation (¬C)**: All inputs for which C is false; the fix must not alter behaviour
  for these inputs.
- **`updateRecord`**: The generic CRUD helper in `backend/utils/crud.js` that performs
  a parameterised `UPDATE … RETURNING *` and returns the first row or `null`.
- **`isBugCondition(input)`**: Pseudocode function used throughout this document to
  identify whether a given input hits the bug.
- **feed_rank**: A synthetic integer column (1 = recent, 2 = popular, 3 = random) added
  inside the smart-feed CTE to drive sort order.
- **ALLOWED_TABLES**: The hardcoded Set of permitted table names added to `crud.js` to
  prevent SQL injection via table-name arguments.

---

## Bug Details

### Bug 1.1 — ticker_type Column Missing in migrate7.js

**Bug Condition**

`migrate7.js` executes `ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none'`
but the `ticker_type` column was never created by any earlier migration
(`migrate.js` through `migrate6.js`). The `user_profiles` DDL in `migrate.js` defines
`ticker_text TEXT` but omits `ticker_type`.

```
FUNCTION isBugCondition_1_1(context)
  INPUT:  context = { freshDatabase: boolean, migrate7HasRun: boolean }
  OUTPUT: boolean

  RETURN context.freshDatabase = true
         AND context.migrate7HasRun = false
         AND 'ticker_type' NOT IN columns('user_profiles')
END FUNCTION
```

**Examples**
- Fresh DB, run `node db/migrate7.js` → `ERROR: column "ticker_type" of relation "user_profiles" does not exist`
- DB upgraded from earlier version where ticker_type was manually added → succeeds (¬C)
- Run `node db/migrate-all.js` on a brand-new Postgres instance → fails at migrate7 step

---

### Bug 1.2 — Wrong Column Name in migrate8.js Stories Index

**Bug Condition**

`migrate8.js` creates `idx_stories_author_expires ON stories(author_id, expires_at)` but
the `stories` table (defined in `migrate2.js`) uses `user_id` as its author foreign key,
not `author_id`.

```
FUNCTION isBugCondition_1_2(context)
  INPUT:  context = { storiesTableExists: boolean, columnName: string }
  OUTPUT: boolean

  RETURN context.storiesTableExists = true
         AND context.columnName = 'author_id'
         AND 'author_id' NOT IN columns('stories')
END FUNCTION
```

**Examples**
- Run `node db/migrate8.js` after migrate2 → `ERROR: column "author_id" does not exist`
- Run migrate8 on a database where the index already exists (IF NOT EXISTS guard) → no-op (¬C)

---

### Bug 1.3 — Duplicate PUT /me/upsert in profiles.js

**Bug Condition**

`profiles.js` registers `router.put('/me/upsert', ...)` twice: once before `PUT /:id`
(correct position) and once after it (dead code). Express uses the first matching handler,
so the second registration is never reached — but it creates a maintenance hazard and
violates the "single handler per route" principle.

```
FUNCTION isBugCondition_1_3(routeTable)
  INPUT:  routeTable = list of registered Express routes
  OUTPUT: boolean

  RETURN COUNT(route IN routeTable WHERE route.method = 'PUT'
               AND route.path = '/me/upsert') > 1
END FUNCTION
```

**Examples**
- Load `profiles.js` and inspect `router.stack` → two entries for `PUT /me/upsert`
- Call `PUT /api/profiles/me/upsert` → only the first handler ever fires (¬C for end-users, but C for maintainability)

---

### Bug 1.4 — updateRecord Returns null Without Caller Null-Check

**Bug Condition**

When `updateRecord` matches zero rows it returns `null`. Three callers pass that `null`
directly to `res.json()`:
- `products.js` `PUT /:id` (after the ownership check has already passed)
- `profiles.js` `PUT /:id`
- `notifications.js` `PUT /:id/read`

```
FUNCTION isBugCondition_1_4(input)
  INPUT:  input = { recordExistsAtCheckTime: boolean,
                    recordExistsAtUpdateTime: boolean,
                    callerChecksNull: boolean }
  OUTPUT: boolean

  RETURN input.recordExistsAtCheckTime = true
         AND input.recordExistsAtUpdateTime = false
         AND input.callerChecksNull = false
END FUNCTION
```

**Examples**
- `PUT /api/products/:id` where product is deleted between the `getRecord` check and the
  `updateRecord` call → `res.json(null)` → client receives `null` as body, crashes
- `updateRecord` returns a valid row → `res.json(row)` works correctly (¬C)

---

### Bug 1.5 — Missing GET / Route in reviews.js

**Bug Condition**

`reviews.js` defines `GET /product/:productId`, `POST /`, and `DELETE /:id` but has no
`GET /` route. The frontend `entities.Review.list()` call (which maps to `GET /api/reviews`)
therefore receives HTTP 404.

```
FUNCTION isBugCondition_1_5(request)
  INPUT:  request = { method: string, path: string }
  OUTPUT: boolean

  RETURN request.method = 'GET'
         AND request.path = '/api/reviews'
         AND routeExists('GET', '/api/reviews') = false
END FUNCTION
```

**Examples**
- `GET /api/reviews` → 404 Not Found
- `GET /api/reviews?product_id=<uuid>` → 404 Not Found
- `GET /api/reviews/product/<uuid>` → 200 OK (¬C, existing route)

---

### Bug 1.6 — Feed Query Sorts by UUID

**Bug Condition**

The smart-feed query in `posts.js` uses `DISTINCT ON (id) … ORDER BY id, feed_rank`.
PostgreSQL requires the first `ORDER BY` expression in a `DISTINCT ON` query to match
the `DISTINCT ON` column (`id`). This forces the outer sort key to be the UUID primary
key, making `feed_rank` irrelevant — users see posts in random UUID order rather than
recency/popularity order.

```
FUNCTION isBugCondition_1_6(request)
  INPUT:  request = { feedParam: string, authorIdParam: string, postTypeParam: string }
  OUTPUT: boolean

  RETURN request.feedParam = 'true'
         AND request.authorIdParam IS NULL
         AND request.postTypeParam IS NULL
END FUNCTION
```

**Examples**
- `GET /api/posts?feed=true` → rows returned in UUID order (arbitrary), recent posts not
  consistently at the top
- `GET /api/posts?author_id=<uuid>` → normal sorted list, unaffected (¬C)
- `GET /api/posts` (no feed flag) → normal sorted list (¬C)

---

### Bug 1.7 — Table Name Not Validated in crud.js

**Bug Condition**

`listRecords`, `getRecord`, `createRecord`, `updateRecord`, and `deleteRecord` all
interpolate the `table` argument directly into SQL strings without validation. If a
table name ever originates from user-controlled data, this is a SQL injection vector.

```
FUNCTION isBugCondition_1_7(input)
  INPUT:  input = { tableName: string }
  OUTPUT: boolean

  RETURN input.tableName NOT IN ALLOWED_TABLES
END FUNCTION
```

**Examples**
- `tableName = "users; DROP TABLE orders; --"` → SQL injection (C)
- `tableName = "products"` → legitimate call (¬C)
- `tableName = "nonexistent_table"` → query error at runtime (C — unsafe even if benign)

---

### Bug 1.8 — CORS Single-Origin Blocks Next.js Frontend

**Bug Condition**

`index.js` sets `origin: process.env.FRONTEND_URL || 'http://localhost:5173'`. When the
Next.js dev server runs on `http://localhost:3000`, every credentialed request is
rejected by the CORS preflight check.

```
FUNCTION isBugCondition_1_8(request)
  INPUT:  request = { origin: string, corsConfig: string | string[] }
  OUTPUT: boolean

  RETURN typeof request.corsConfig = 'string'
         AND request.origin ≠ request.corsConfig
END FUNCTION
```

**Examples**
- Next.js at `http://localhost:3000` makes `GET /api/auth/me` → CORS error (C)
- Vite at `http://localhost:5173` makes same request → accepted (¬C)
- Production single-domain deployment → single string still works (¬C)

---

### Bug 1.9 — Socket.IO Single-Origin Blocks Next.js WebSocket

**Bug Condition**

`socket.js` `initSocket` passes the raw `corsOrigin` string directly to Socket.IO's CORS
config. When `corsOrigin` is `'http://localhost:5173'` the Next.js origin is blocked.

```
FUNCTION isBugCondition_1_9(input)
  INPUT:  input = { socketOrigin: string, corsConfig: string | string[] }
  OUTPUT: boolean

  RETURN typeof input.corsConfig = 'string'
         AND input.socketOrigin ≠ input.corsConfig
END FUNCTION
```

**Examples**
- Next.js frontend tries `io('http://localhost:3001')` → CORS error on WebSocket upgrade (C)
- Vite frontend connects → accepted (¬C)

---

### Bug 1.10 — CartProvider Wraps AuthProvider (Wrong Order)

**Bug Condition**

In `providers.tsx`, `CartProvider` is the outer wrapper and `AuthProvider` is inside it.
`CartProvider.fetchCart()` fires in a `useEffect` on mount — before `AuthProvider` has
resolved `checkUserAuth()`. The `localStorage` token may be present but auth state is
not yet confirmed, so cart fetches that depend on auth may silently fail or use stale state.

```
FUNCTION isBugCondition_1_10(providerTree)
  INPUT:  providerTree = ordered list of provider components from outermost to innermost
  OUTPUT: boolean

  RETURN indexOf('CartProvider', providerTree) < indexOf('AuthProvider', providerTree)
END FUNCTION
```

**Examples**
- Hard refresh on any page: CartProvider mounts and calls fetchCart before auth resolves (C)
- Token absent: fetchCart bails early via `if (!token) return` → no visible error, but
  the cart will not reload when auth later resolves (C — silent staleness)
- CartProvider inside AuthProvider: cart fetch deferred until auth is ready (¬C, fixed state)

---

### Bug 1.11 — AppLayout Duplicates Auth Fetch

**Bug Condition**

`AppLayout.tsx` calls `auth.me()` directly inside a `useEffect` and stores the result in
local `useState`. `AuthContext` already calls `client.get('/api/auth/me')` on mount. This
causes two identical API calls on every page load and creates a second source of truth for
the `user` object.

```
FUNCTION isBugCondition_1_11(component)
  INPUT:  component = 'AppLayout'
  OUTPUT: boolean

  RETURN component.calls('auth.me()') = true
         AND component.uses('useAuth()') = false
END FUNCTION
```

**Examples**
- Load any page wrapped in AppLayout → two `GET /api/auth/me` requests in DevTools (C)
- After fix: one request from AuthContext, AppLayout reads from context (¬C)

---

### Bug 1.12 — 401 in AppLayout Does Not Redirect to /login

**Bug Condition**

When `auth.me()` throws (401 or network error), `AppLayout.tsx` catches it and calls
`setCheckingProfile(false)` but does not navigate to `/login`. The user remains on a
protected page with no session.

```
FUNCTION isBugCondition_1_12(input)
  INPUT:  input = { authChecked: boolean, isAuthenticated: boolean,
                    redirectCalled: boolean }
  OUTPUT: boolean

  RETURN input.authChecked = true
         AND input.isAuthenticated = false
         AND input.redirectCalled = false
END FUNCTION
```

**Examples**
- Token expired, user navigates to `/` → stays on protected home page, no redirect (C)
- Token valid → authenticated, no redirect needed (¬C)
- After fix: `authChecked && !isAuthenticated` triggers `router.push('/login')` (¬C)

---

### Bug 1.13 — Missing Debit and Refund Wallet Routes

**Bug Condition**

`wallet.js` only defines `POST /topup` (inserts `'credit'`) and `POST /withdraw` (inserts
`'withdrawal'`). The `wallet_transactions` table schema allows `'credit'`, `'debit'`,
`'withdrawal'`, and `'refund'` types, but there are no routes to record debit or refund
transactions. `returns.js` uses a raw `pool.query` workaround to insert a `'credit'`
(mislabelled) instead of a proper `'refund'`.

```
FUNCTION isBugCondition_1_13(request)
  INPUT:  request = { method: string, path: string }
  OUTPUT: boolean

  RETURN request.method = 'POST'
         AND request.path IN ['/api/wallet/debit', '/api/wallet/refund']
         AND routeExists(request.method, request.path) = false
END FUNCTION
```

**Examples**
- `POST /api/wallet/debit` → 404 Not Found (C)
- `POST /api/wallet/refund` → 404 Not Found (C)
- `POST /api/wallet/topup` → 200 OK (¬C)
- `POST /api/wallet/withdraw` → 200 OK (¬C)

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors that must not regress:**

- `migrate.js` through `migrate6.js` continue to create all existing tables and indexes
  without error on a fresh database.
- `migrate8.js` continues to create all performance indexes other than the corrected
  stories index.
- `PUT /api/profiles/me/upsert` continues to upsert the profile correctly (create if
  absent, update if present); only the duplicate definition is removed.
- `updateRecord` continues to return the updated row when the record exists and the
  UPDATE matches at least one row.
- `GET /api/reviews/product/:productId` continues to return reviews joined with profile
  display name and avatar.
- `POST /api/reviews` and `DELETE /api/reviews/:id` continue to work and recalculate
  product rating stats.
- `GET /api/posts` without `feed=true` continues to return posts in the requested sort
  order, unaffected by the feed query fix.
- All currently hard-coded `crud.js` callers (`products`, `orders`, `tasks`, etc.)
  continue to work after the ALLOWED_TABLES guard is added.
- The Vite frontend on port 5173 continues to receive credentialed API and WebSocket
  responses after the multi-origin CORS fix.
- `AppLayout.tsx` continues to display the correct user name, avatar initial, and
  role-gated admin link after switching to `useAuth()`.
- `useAuth().logout()` continues to clear the token and redirect to `/login`.
- `POST /api/wallet/topup` and `POST /api/wallet/withdraw` continue to insert `'credit'`
  and `'withdrawal'` transaction records unchanged.
- `GET /api/wallet/me` continues to return the wallet balance and last 50 transactions.

**Scope of each fix:**
Each fix is targeted to the narrowest possible change. No unrelated behaviour is modified.

---

## Hypothesized Root Cause

### 1.1 — ticker_type Column Missing
The `user_profiles` DDL in `migrate.js` was written before the ticker feature was
designed. `ticker_text` was added in the original schema but `ticker_type` was overlooked.
`migrate7.js` assumes the column already exists (from some earlier point) and only sets
the default — no prior migration created it.

### 1.2 — Wrong Column Name in migrate8.js
The stories index was authored with `author_id` by analogy with the `posts` table (which
does use `author_id`). The `stories` table uses `user_id` instead, likely because stories
are simpler content tied directly to a user account rather than an authored post.

### 1.3 — Duplicate Route Registration
During a refactor of `profiles.js` the upsert handler was moved to appear before `/:id`
(to prevent the wildcard from consuming the literal segment `/me`), but the old
registration at the bottom of the file was not removed.

### 1.4 — Null Not Checked After updateRecord
The `updateRecord` helper was added to `crud.js` with an explicit `rows[0] || null`
return. The callers were written assuming a record found in a preceding `getRecord` call
will still exist at update time. The race condition (deletion between check and update)
was not considered, and the `null` return was not treated as an error path.

### 1.5 — Missing GET / in reviews.js
The `reviews.js` route was written to serve product-scoped review pages
(`GET /product/:productId`) but did not include a generic list endpoint. The frontend
SDK's `.list()` method maps to the bare `GET /` path which was never implemented.

### 1.6 — Feed Query Sorts by UUID
The CTE-free `DISTINCT ON` approach requires the first `ORDER BY` column to match the
`DISTINCT ON` column. Using `ORDER BY id, feed_rank` satisfies the PostgreSQL constraint
but defeats the intent: UUID ordering is effectively random. The developer likely added
`ORDER BY id` to satisfy the parser constraint without realising it would override the
feed ranking.

### 1.7 — No Table Name Allowlist
The `crud.js` helpers were written as internal utilities intended to be called only from
trusted route handlers with hard-coded table names. No allowlist was added because the
original authors assumed the table name would never come from user input. The risk is
latent but real as the code grows.

### 1.8 & 1.9 — Single-Origin CORS/Socket.IO
The application was originally built to serve a single Vite frontend. When the Next.js
frontend was added, `FRONTEND_URL` was not updated to a comma-separated list and the CORS
configuration was not revisited. `socket.js` mirrors the same string-only pattern.

### 1.10 — CartProvider Wraps AuthProvider
The provider ordering in `providers.tsx` has `CartProvider` as the outer wrapper. This
was likely a historical ordering that was not reconsidered when `AuthContext` was
introduced. Because `CartProvider.fetchCart` checks `localStorage` directly (not auth
context state), the dependency on auth being resolved first was not obvious.

### 1.11 & 1.12 — AppLayout Auth Duplication and Missing Redirect
`AppLayout.tsx` was initially written before `AuthContext` existed and managed its own
auth state. When `AuthContext` was added, the local `auth.me()` call was not removed and
the redirect-on-401 logic was never ported to use the context's `authChecked` flag.

### 1.13 — Missing Wallet Route Handlers
`wallet.js` was implemented with the two most common user-facing operations (top-up and
withdrawal). The debit and refund types exist in the schema (added speculatively in the
wallet_transactions DDL) but the corresponding route handlers were deferred and never
implemented. `returns.js` worked around this by issuing a raw `pool.query` instead of
calling a wallet route.

---

## Correctness Properties

Property 1: Bug Condition — Migration Idempotency

_For any_ fresh database on which `migrate.js` through `migrate8.js` are run in order,
each migration script SHALL complete without error, and the resulting schema SHALL
contain all expected tables and columns including `user_profiles.ticker_type` and the
correct `idx_stories_author_expires ON stories(user_id, expires_at)` index.

**Validates: Requirements 2.1, 2.2**

---

Property 2: Preservation — Prior Migration Behaviour Unchanged

_For any_ database that has already run `migrate.js` through `migrate6.js` successfully,
re-running those scripts SHALL produce no errors and no schema changes, confirming that
the ticker_type column addition in migrate7 does not break previously migrated databases.

**Validates: Requirements 3.1, 3.2**

---

Property 3: Bug Condition — Single Route Registration

_For any_ Express application instance that loads `profiles.js`, the route table SHALL
contain exactly one handler for `PUT /me/upsert`, and calling `PUT /api/profiles/me/upsert`
SHALL invoke that handler and return the upserted profile.

**Validates: Requirement 2.3**

---

Property 4: Preservation — Upsert Behaviour Unchanged After Deduplication

_For any_ authenticated request to `PUT /api/profiles/me/upsert`, the fixed handler SHALL
produce the same response (upserted profile JSON) as the original first handler, with no
change in observable API behaviour.

**Validates: Requirement 3.3**

---

Property 5: Bug Condition — Null updateRecord Yields 404

_For any_ PUT route handler that calls `updateRecord` and receives `null` back (record
deleted between check and update), the fixed handler SHALL respond with
`HTTP 404 { error: 'Record not found' }` rather than `HTTP 200 null`.

**Validates: Requirement 2.4**

---

Property 6: Preservation — Successful updateRecord Still Returns Updated Row

_For any_ PUT route handler where `updateRecord` returns a non-null row, the fixed
handler SHALL respond with `HTTP 200` and the updated row, identical to prior behaviour.

**Validates: Requirement 3.4**

---

Property 7: Bug Condition — GET /api/reviews Returns 200

_For any_ `GET /api/reviews` request (with optional `product_id`, `reviewer_id`, `sort`,
`limit` query params), the fixed `reviews.js` SHALL return `HTTP 200` with a JSON array
of review rows joined with `display_name` and `avatar_url` from `user_profiles`.

**Validates: Requirement 2.5**

---

Property 8: Preservation — Existing reviews.js Routes Unaffected

_For any_ request to `GET /api/reviews/product/:productId`, `POST /api/reviews`, or
`DELETE /api/reviews/:id`, the fixed `reviews.js` SHALL return the same responses as
before the `GET /` route was added.

**Validates: Requirements 3.5, 3.6, 3.7**

---

Property 9: Bug Condition — Feed Returns Posts in feed_rank / recency Order

_For any_ `GET /api/posts?feed=true` request, the fixed query SHALL return posts ordered
primarily by `feed_rank ASC` (1=recent first, then popular, then random mix) and
secondarily by `created_at DESC`, so recent posts consistently appear before older ones.

**Validates: Requirement 2.6**

---

Property 10: Preservation — Non-Feed Post Queries Unaffected

_For any_ `GET /api/posts` request where `feed` is not `'true'`, the response order and
content SHALL be identical to before the feed query was rewritten.

**Validates: Requirement 3.8**

---

Property 11: Bug Condition — Invalid Table Names Rejected by crud.js

_For any_ call to a `crud.js` function where the `table` argument is not a member of
`ALLOWED_TABLES`, the function SHALL throw `Error('Invalid table name: <table>')` before
executing any SQL.

**Validates: Requirement 2.7**

---

Property 12: Preservation — Allowed Table Names Still Work in crud.js

_For any_ call to a `crud.js` function where the `table` argument is a member of
`ALLOWED_TABLES`, the function SHALL execute identically to before the allowlist was
added, with no change to query results.

**Validates: Requirement 3.9**

---

Property 13: Bug Condition — Multi-Origin CORS Accepts Both Frontends

_For any_ credentialed HTTP request from either `http://localhost:5173` or
`http://localhost:3000`, the fixed CORS configuration SHALL respond with the matching
`Access-Control-Allow-Origin` header and accept the request.

**Validates: Requirement 2.8**

---

Property 14: Preservation — Existing Vite Origin Continues to Work After CORS Fix

_For any_ request from `http://localhost:5173`, the fixed multi-origin CORS config SHALL
behave identically to the previous single-origin config.

**Validates: Requirement 3.10**

---

Property 15: Bug Condition — Socket.IO Accepts Both Frontend Origins

_For any_ WebSocket connection attempt from either `http://localhost:5173` or
`http://localhost:3000`, the fixed `initSocket` SHALL allow the connection without a CORS
error.

**Validates: Requirement 2.9**

---

Property 16: Bug Condition — CartProvider Defers Cart Fetch Until Auth Resolves

_For any_ page load where a stored `access_token` is present, `CartProvider.fetchCart`
SHALL NOT fire before `AuthContext.checkUserAuth` has set `authChecked = true`, so the
cart API call is made with a confirmed-valid auth state.

**Validates: Requirement 2.10**

---

Property 17: Bug Condition — AppLayout Uses useAuth() Not Direct auth.me()

_For any_ render of `AppLayout`, the component SHALL NOT call `auth.me()` directly; it
SHALL read `user`, `isAuthenticated`, and `authChecked` from `useAuth()`, resulting in
exactly one `GET /api/auth/me` request per session (from `AuthContext`).

**Validates: Requirement 2.11**

---

Property 18: Preservation — AppLayout Still Displays Correct User Data

_For any_ authenticated session, the fixed `AppLayout` SHALL display the correct
`user.full_name` initial in the avatar, the correct `user.role`-gated admin link, and
all other user-dependent UI elements.

**Validates: Requirement 3.11**

---

Property 19: Bug Condition — 401 in AppLayout Redirects to /login

_For any_ `AppLayout` render where `authChecked = true` and `isAuthenticated = false`,
the component SHALL call `router.push('/login')`, redirecting the user to the login page
rather than leaving them on a protected route.

**Validates: Requirement 2.12**

---

Property 20: Preservation — Authenticated Users Are Not Redirected

_For any_ `AppLayout` render where `authChecked = true` and `isAuthenticated = true`,
no redirect SHALL occur.

**Validates: Requirement 3.12**

---

Property 21: Bug Condition — POST /api/wallet/debit and /refund Exist and Work

_For any_ `POST /api/wallet/debit` request by an authenticated admin/system caller with
a valid positive `amount`, the fixed `wallet.js` SHALL decrement the user's wallet
balance and insert a `'debit'` transaction record, returning the updated wallet.

_For any_ `POST /api/wallet/refund` request by an authenticated caller with a valid
positive `amount`, the fixed `wallet.js` SHALL increment the target user's balance and
insert a `'refund'` transaction record.

**Validates: Requirement 2.13**

---

Property 22: Preservation — Existing Wallet Routes Unchanged

_For any_ call to `POST /api/wallet/topup` or `POST /api/wallet/withdraw` or
`GET /api/wallet/me`, the fixed `wallet.js` SHALL return the same responses as before
the debit/refund handlers were added.

**Validates: Requirements 3.13, 3.14**

---

## Fix Implementation

### Changes Required

---

#### Bug 1.1 — Add ticker_type Column in migrate7.js

**File:** `backend/db/migrate7.js`

**Specific Changes:**

1. Add `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ticker_type TEXT DEFAULT 'none';`
   as the first statement in the migration schema string, before the existing
   `ALTER COLUMN ticker_type SET DEFAULT 'none'` line.
2. The `IF NOT EXISTS` guard makes it safe on databases that already have the column
   (e.g., production instances upgraded through an earlier ad-hoc migration).

```sql
-- Insert at TOP of schema string:
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ticker_type TEXT DEFAULT 'none';
-- Existing line stays:
ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none';
```

---

#### Bug 1.2 — Fix Column Name in migrate8.js

**File:** `backend/db/migrate8.js`

**Specific Changes:**

1. Change `ON stories(author_id, expires_at)` to `ON stories(user_id, expires_at)`.

```sql
-- Before:
CREATE INDEX IF NOT EXISTS idx_stories_author_expires ON stories(author_id, expires_at);
-- After:
CREATE INDEX IF NOT EXISTS idx_stories_author_expires ON stories(user_id, expires_at);
```

---

#### Bug 1.3 — Remove Duplicate PUT /me/upsert in profiles.js

**File:** `backend/routes/profiles.js`

**Specific Changes:**

1. Remove the second `router.put('/me/upsert', ...)` block that appears after
   `router.put('/:id', ...)`. The first registration (before `/:id`) is correct and
   must be preserved.

---

#### Bug 1.4 — Add Null Checks After updateRecord Calls

**Files:** `backend/routes/products.js`, `backend/routes/profiles.js`,
`backend/routes/notifications.js`

**Specific Changes:**

In every handler that calls `updateRecord` and currently passes the result directly to
`res.json()`, insert a null guard:

```js
const updated = await updateRecord(tableName, req.params.id, req.body);
if (!updated) return res.status(404).json({ error: 'Record not found' });
res.json(updated);
```

Apply to:
- `products.js` `PUT /:id` — after `const updated = await updateRecord(...)`
- `profiles.js` `PUT /:id` — after `const updated = await updateRecord(...)`
- `notifications.js` `PUT /:id/read` — after `const updated = await updateRecord(...)`

---

#### Bug 1.5 — Add GET / Route to reviews.js

**File:** `backend/routes/reviews.js`

**Specific Changes:**

Add the following route before the existing `GET /product/:productId` route:

```js
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { product_id, reviewer_id, sort = '-created_at', limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    if (product_id) {
      params.push(product_id);
      conditions.push(`r.product_id = $${params.length}`);
    }
    if (reviewer_id) {
      params.push(reviewer_id);
      conditions.push(`r.reviewer_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort.startsWith('-')
      ? `r.${sort.slice(1)} DESC`
      : `r.${sort} ASC`;
    params.push(Math.min(parseInt(limit) || 50, 200));
    const { rows } = await pool.query(
      `SELECT r.*, up.display_name, up.avatar_url
       FROM reviews r
       LEFT JOIN user_profiles up ON up.user_id = r.reviewer_id
       ${where} ORDER BY ${orderBy} LIMIT $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});
```

---

#### Bug 1.6 — Rewrite Feed Query with CTE

**File:** `backend/routes/posts.js`

**Specific Changes:**

Replace the `SELECT DISTINCT ON (id)` query block with a CTE-based approach that avoids
the `DISTINCT ON` ordering constraint:

```js
const { rows } = await pool.query(
  `WITH ranked AS (
     SELECT DISTINCT ON (id) *, feed_rank
     FROM (
       (SELECT *, 1 AS feed_rank FROM posts
        WHERE created_at > NOW() - INTERVAL '3 days'
        ORDER BY RANDOM() LIMIT $1)
       UNION ALL
       (SELECT *, 2 AS feed_rank FROM posts
        WHERE like_count > 5
        ORDER BY like_count DESC LIMIT $2)
       UNION ALL
       (SELECT *, 3 AS feed_rank FROM posts
        ORDER BY RANDOM() LIMIT $3)
     ) combined
     ORDER BY id, feed_rank
   )
   SELECT * FROM ranked ORDER BY feed_rank, created_at DESC LIMIT $4`,
  [Math.ceil(lim * 0.5), Math.ceil(lim * 0.3), lim, lim]
);
```

The outer `ORDER BY feed_rank, created_at DESC` is now on the outer query, free from the
`DISTINCT ON` constraint.

---

#### Bug 1.7 — Add ALLOWED_TABLES Validation to crud.js

**File:** `backend/utils/crud.js`

**Specific Changes:**

1. Add the `ALLOWED_TABLES` Set at the top of the file (after the `require` statements).
2. Add a `validateTable(table)` function.
3. Call `validateTable(table)` as the first line of each CRUD function.

```js
const ALLOWED_TABLES = new Set([
  'users','user_profiles','posts','products','businesses','showrooms',
  'orders','tasks','task_bids','conversations','messages','notifications',
  'follows','likes','comments','stories','story_views','reviews','saves',
  'reports','blocks','wallets','wallet_transactions','events','event_tickets',
  'jobs','job_applications','courses','course_lessons','course_enrollments',
  'point_transactions','push_subscriptions','cart_items','wishlists',
  'product_variants','return_requests','delivery_updates','price_alerts',
  'hashtags','post_hashtags','poll_votes','coupons','commissions',
]);

function validateTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
}
```

---

#### Bug 1.8 — Multi-Origin CORS in index.js

**File:** `backend/index.js`, `backend/.env.example`

**Specific Changes:**

Replace the single-string CORS origin with a parsed multi-origin approach:

```js
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  if (!allowedOrigins.includes('http://localhost:3000'))
    allowedOrigins.push('http://localhost:3000');
  if (!allowedOrigins.includes('http://localhost:5173'))
    allowedOrigins.push('http://localhost:5173');
}
const corsOptions = {
  origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  credentials: true,
};
```

Update `.env.example`:
```
FRONTEND_URL=http://localhost:5173,http://localhost:3000
```

---

#### Bug 1.9 — Multi-Origin Socket.IO in socket.js

**File:** `backend/socket.js`

**Specific Changes:**

Update `initSocket` to accept and handle an array of origins:

```js
function initSocket(httpServer, corsOrigin) {
  const { Server } = require('socket.io');
  const origins = Array.isArray(corsOrigin)
    ? corsOrigin
    : [corsOrigin || 'http://localhost:5173'];
  ioInstance = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
  });
  // ... rest of handler unchanged
}
```

In `index.js`, pass the `allowedOrigins` array:
```js
initSocket(server, allowedOrigins);
```

---

#### Bug 1.10 — Reorder Providers in providers.tsx

**File:** `frontend-next/app/providers.tsx`

**Specific Changes:**

Move `CartProvider` inside `AuthProvider`:

```tsx
<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <AuthProvider>
    <CartProvider>
      <QueryClientProvider client={queryClientInstance}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </CartProvider>
  </AuthProvider>
</ThemeProvider>
```

Update `CartContext.tsx` to re-fetch the cart when the auth token changes. Import
`useAuth` and add a `useEffect` that depends on `authChecked`:

```tsx
import { useAuth } from '@/lib/AuthContext';
// Inside CartProvider:
const { authChecked, isAuthenticated } = useAuth();
useEffect(() => {
  if (authChecked && isAuthenticated) {
    fetchCart();
  }
}, [authChecked, isAuthenticated, fetchCart]);
```

---

#### Bug 1.11 — Replace auth.me() with useAuth() in AppLayout.tsx

**File:** `frontend-next/components/layout/AppLayout.tsx`

**Specific Changes:**

1. Remove `import { auth } from '@/api/auth'` (if no longer needed elsewhere in the file).
2. Add `import { useAuth } from '@/lib/AuthContext'`.
3. Replace `const [user, setUser] = useState(null)` with destructuring from `useAuth()`:
   ```tsx
   const { user, isAuthenticated, authChecked } = useAuth();
   ```
4. Remove the `auth.me().then(...)` block from the `useEffect`. Replace only the logic
   that depends on `user` being resolved (profile check, socket setup) by moving it into
   a separate `useEffect` that depends on `[user]`.

---

#### Bug 1.12 — Add /login Redirect on 401 in AppLayout.tsx

**File:** `frontend-next/components/layout/AppLayout.tsx`

**Specific Changes:**

Add a dedicated `useEffect` that watches `authChecked` and `isAuthenticated`:

```tsx
useEffect(() => {
  if (authChecked && !isAuthenticated) {
    router.push('/login');
  }
}, [authChecked, isAuthenticated, router]);
```

This fires after `AuthContext` has resolved the auth state, redirecting unauthenticated
users to `/login`.

---

#### Bug 1.13 — Add Debit and Refund Routes to wallet.js

**File:** `backend/routes/wallet.js`

**Specific Changes:**

Add two new routes after the existing `POST /withdraw` handler:

```js
// Debit wallet (admin/system only — e.g., commission deduction)
router.post('/debit', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { user_id, amount, description, reference } = req.body;
  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'user_id and a positive amount are required' });
  }
  try {
    const wallet = await getOrCreateWallet(user_id);
    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await pool.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );
    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
       VALUES ($1, 'debit', $2, $3, $4)`,
      [wallet.id, amount, description || 'Debit', reference || null]
    );
    const updated = await pool.query('SELECT * FROM wallets WHERE id = $1', [wallet.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process debit' });
  }
});

// Refund wallet (called when a return request is approved)
router.post('/refund', requireAuth, async (req, res) => {
  const { user_id, amount, description, reference } = req.body;
  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'user_id and a positive amount are required' });
  }
  try {
    const wallet = await getOrCreateWallet(user_id);
    await pool.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );
    await pool.query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
       VALUES ($1, 'refund', $2, $3, $4)`,
      [wallet.id, amount, description || 'Refund', reference || null]
    );
    const updated = await pool.query('SELECT * FROM wallets WHERE id = $1', [wallet.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process refund' });
  }
});
```

Also update `returns.js` `PUT /:id` to call `POST /api/wallet/refund` (or invoke the
shared wallet logic directly) instead of using the raw `pool.query` workaround that
inserts a mislabelled `'credit'` transaction.

---

## Testing Strategy

### Validation Approach

The testing strategy follows the two-phase bug-condition methodology:

1. **Exploratory Phase**: Run tests against the *unfixed* code to surface concrete
   counterexamples and confirm the root-cause hypotheses. If a test passes unexpectedly
   on unfixed code, the root cause was wrong and must be re-analysed.

2. **Fix + Preservation Phase**: After applying each fix, run the same tests plus
   preservation tests to verify the fix is correct and no regressions were introduced.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on unfixed code to confirm root causes.

#### 1.1 — Migration Failure
- **Test**: Run `node db/migrate7.js` on a fresh database (no prior migrations).
- **Expected on unfixed code**: `ERROR: column "ticker_type" of relation "user_profiles" does not exist`
- **Confirms**: Column was never created.

#### 1.2 — Wrong Stories Index Column
- **Test**: Run `node db/migrate8.js` after `migrate2.js` has set up the stories table.
- **Expected on unfixed code**: `ERROR: column "author_id" does not exist`
- **Confirms**: Column name mismatch.

#### 1.3 — Duplicate Route
- **Test**: Load `profiles.js` and log `router.stack` to count `PUT /me/upsert` entries.
- **Expected on unfixed code**: Two matching entries in the stack.

#### 1.4 — Null from updateRecord
- **Test**: Create a product, delete it, then call `PUT /api/products/:id` with the deleted
  product's ID (bypassing the existence pre-check by calling `updateRecord` directly).
- **Expected on unfixed code**: Response body is `null`, HTTP 200.

#### 1.5 — Missing GET /api/reviews
- **Test**: `GET /api/reviews` with no query params.
- **Expected on unfixed code**: HTTP 404.

#### 1.6 — Feed Sorted by UUID
- **Test**: Call `GET /api/posts?feed=true` 5 times, collect `id` ordering each time.
  Assert that `created_at` values are not monotonically decreasing in the results.
- **Expected on unfixed code**: Posts returned in UUID order, not recency order.

#### 1.7 — SQL Injection via Table Name
- **Test**: Call `listRecords("users; SELECT 1; --", {})` and observe whether it throws
  before executing.
- **Expected on unfixed code**: No validation error; query executes (or fails at DB level).

#### 1.8 — CORS Rejection
- **Test**: Send a credentialed `GET /api/auth/me` from `http://localhost:3000` origin.
- **Expected on unfixed code**: `Access-Control-Allow-Origin` header is `http://localhost:5173`,
  browser blocks the request.

#### 1.9 — Socket.IO CORS Rejection
- **Test**: Attempt `io('http://localhost:3001')` from the Next.js origin.
- **Expected on unfixed code**: WebSocket upgrade fails with CORS error.

#### 1.10 — CartProvider Fires Before Auth
- **Test**: Hard refresh a page; add a `console.log` timestamp in `fetchCart` and in
  `checkUserAuth`. Assert that `fetchCart` runs before `authChecked` is set to `true`.
- **Expected on unfixed code**: `fetchCart` timestamp is earlier than `authChecked=true`.

#### 1.11 — Duplicate auth.me() Calls
- **Test**: Open DevTools Network tab; load any AppLayout page. Count requests to
  `GET /api/auth/me`.
- **Expected on unfixed code**: Two requests.

#### 1.12 — No Redirect on 401
- **Test**: Manually clear `localStorage.access_token`, navigate to `/`. Check whether
  `router.push('/login')` is called.
- **Expected on unfixed code**: User stays on `/` with no session and no redirect.

#### 1.13 — Missing Debit/Refund Routes
- **Test**: `POST /api/wallet/debit` and `POST /api/wallet/refund` with valid bodies.
- **Expected on unfixed code**: HTTP 404.

---

### Fix Checking

**Goal**: After applying each fix, verify that all bug-condition inputs now produce the
correct behaviour (Properties 1–22 above).

```
FOR ALL input WHERE isBugCondition_N(input) DO
  result := fixedCode(input)
  ASSERT expectedBehavior_N(result)
END FOR
```

Key assertions per fix:
- **1.1**: `node db/migrate7.js` on fresh DB → exits 0, `ticker_type` column exists.
- **1.2**: `node db/migrate8.js` → `idx_stories_author_expires` created on `user_id`.
- **1.3**: `router.stack` has exactly one `PUT /me/upsert` entry.
- **1.4**: `PUT /api/products/:id` with deleted-product ID → HTTP 404 `{ error: 'Record not found' }`.
- **1.5**: `GET /api/reviews` → HTTP 200, JSON array.
- **1.6**: `GET /api/posts?feed=true` → `created_at` values decrease (most recent first among feed_rank=1 posts).
- **1.7**: `listRecords("evil; DROP TABLE users; --", {})` → throws `Invalid table name` error.
- **1.8**: Request from `http://localhost:3000` → `Access-Control-Allow-Origin: http://localhost:3000`.
- **1.9**: Socket.IO connection from Next.js origin → handshake succeeds.
- **1.10**: `fetchCart` does not run until `authChecked = true`.
- **1.11**: Only one `GET /api/auth/me` request per page load.
- **1.12**: Token absent → `router.push('/login')` called.
- **1.13**: `POST /api/wallet/debit` → HTTP 200, balance decremented, `'debit'` transaction record inserted.
           `POST /api/wallet/refund` → HTTP 200, balance incremented, `'refund'` transaction record inserted.

---

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, the fixed code produces
the same result as the original code.

```
FOR ALL input WHERE NOT isBugCondition_N(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

Key preservation assertions:
- `migrate.js`–`migrate6.js` run without error and produce identical schemas.
- `GET /api/reviews/product/:productId` returns same response as before.
- `PUT /api/profiles/me/upsert` upserts correctly, same response format.
- `updateRecord` returning a valid row → callers still return HTTP 200 with the row.
- `GET /api/posts` (no feed) → sort order and content identical.
- All ALLOWED_TABLES names continue to work in crud.js functions.
- `http://localhost:5173` continues to pass CORS checks.
- `POST /api/wallet/topup` and `POST /api/wallet/withdraw` → unchanged behaviour.
- `GET /api/wallet/me` → unchanged response.
- Authenticated user in AppLayout → no redirect, correct user data displayed.

**Property-Based Testing is recommended for:**
- **Table allowlist** (1.7): Generate random table names and assert only ALLOWED_TABLES
  members pass validation.
- **CORS origin matching** (1.8, 1.9): Generate random origin headers and assert only
  listed origins receive the `Allow-Origin` header.
- **updateRecord null path** (1.4): Generate random IDs not present in the DB and assert
  all callers return HTTP 404.
- **Feed ordering** (1.6): Generate posts with varying `created_at` and `like_count`
  values and assert the returned `feed_rank=1` posts are all within the last 3 days.

---

### Unit Tests

- `migrate7.js` adds `ticker_type` column on fresh DB and does not error on DB with
  existing column.
- `migrate8.js` creates all indexes, stories index uses `user_id`.
- `profiles.js` route stack contains exactly one `PUT /me/upsert`.
- `updateRecord` returning `null` causes each affected handler to return 404.
- `GET /api/reviews` returns 200 with correct JOIN data.
- Feed query returns posts ordered by `feed_rank` then `created_at DESC`.
- `validateTable` in `crud.js` throws on unknown tables, passes on all ALLOWED_TABLES members.
- CORS `allowedOrigins` array built correctly from comma-separated `FRONTEND_URL`.
- `initSocket` accepts an array and a single string for `corsOrigin`.
- `CartProvider.fetchCart` is called only after `authChecked = true`.
- `AppLayout` renders with user data from `useAuth()` without calling `auth.me()`.
- `AppLayout` redirects to `/login` when `authChecked = true` and `isAuthenticated = false`.
- `POST /api/wallet/debit` decrements balance, inserts `'debit'` transaction.
- `POST /api/wallet/refund` increments balance, inserts `'refund'` transaction.

---

### Property-Based Tests

- **Table name validation**: For 1000 random strings, assert `validateTable` throws unless
  the string is in ALLOWED_TABLES.
- **CORS origin array**: For any array of origin strings passed to `initSocket`, assert
  all listed origins are accepted and unlisted origins are rejected.
- **updateRecord null check**: For any UUID not present in the `products`, `user_profiles`,
  or `notifications` table, the corresponding PUT handler returns 404.
- **Feed ranking invariant**: For any set of posts with varying `created_at` and
  `like_count`, the feed query's first `feed_rank=1` result has `created_at` more recent
  than the first `feed_rank=2` result (on average, across many random datasets).
- **Wallet balance non-negative**: For any sequence of topup, debit, and refund operations
  where the debit amount never exceeds the current balance, the final balance equals
  (sum of credits + refunds) − (sum of debits + withdrawals).

---

### Integration Tests

- Run `node db/migrate-all.js` on a fresh test database → all 8 migrations succeed,
  schema contains `ticker_type` column and correct stories index.
- End-to-end: authenticated Next.js frontend makes API request and WebSocket connection →
  both succeed (CORS + Socket.IO fix validated together).
- Full return flow: buyer submits order → seller approves return with refund → buyer wallet
  balance increases by refund amount → `'refund'` transaction appears in `GET /api/wallet/me`.
- Full auth flow: token absent → AppLayout → redirect to `/login` → login → redirect back.
- Cart sync: hard refresh with valid token → cart items load correctly after auth resolves.
