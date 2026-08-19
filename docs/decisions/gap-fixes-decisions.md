# Application-Wide Gap Fixes — Spec Decisions

**Spec location:** `.kiro/specs/gap-fixes/`  
**Files:** `bugfix.md` · `design.md` · `tasks.md`  
**Type:** Bugfix spec (13 bugs across 5 categories)

---

## Introduction

This spec covers 13 bugs across the full-stack application, grouped into five categories:

| Category | Bugs | Files Affected |
|----------|------|---------------|
| Migration & Schema | 1.1, 1.2 | `migrate7.js`, `migrate8.js` |
| Route & Handler | 1.3, 1.4, 1.5, 1.6, 1.7 | `profiles.js`, `products.js`, `notifications.js`, `reviews.js`, `posts.js`, `crud.js` |
| CORS & Connectivity | 1.8, 1.9 | `index.js`, `socket.js`, `.env.example` |
| Frontend Auth & Providers | 1.10, 1.11, 1.12 | `providers.tsx`, `CartContext.tsx`, `AppLayout.tsx` |
| Wallet Transactions | 1.13 | `wallet.js`, `returns.js` |

Each decision below documents why a particular fix strategy was chosen over alternatives.

---

## Category 1: Migration & Schema Bugs

### Decision M.1 — Bug 1.1: How to add the missing `ticker_type` column in migrate7.js

**Bug:** `migrate7.js` attempts `ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none'`
but `ticker_type` was never created by any prior migration.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Fix in migrate.js (original schema file) | Changes already-run migrations; breaks idempotency |
| B — New migrate9.js with column add | Requires a new migration file for a single column |
| **C — Add `ADD COLUMN IF NOT EXISTS` at the top of migrate7.js** ✅ | Fixes the issue in the same file; `IF NOT EXISTS` is safe for already-migrated DBs |

**Decision Made:** Option C.

**Rationale:** Adding `ADD COLUMN IF NOT EXISTS ticker_type TEXT DEFAULT 'none'` as the first
statement in `migrate7.js` — before the existing `ALTER COLUMN … SET DEFAULT` — makes the
script self-contained. The `IF NOT EXISTS` guard ensures it's a no-op on databases that
already have the column (e.g., production instances where it was added manually).

**Impact:** The fix is two SQL lines in `migrate7.js`:
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ticker_type TEXT DEFAULT 'none';
ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none';
```

---

### Decision M.2 — Bug 1.2: Column name `author_id` vs `user_id` in migrate8.js

**Bug:** `migrate8.js` creates `idx_stories_author_expires ON stories(author_id, expires_at)` but
the `stories` table uses `user_id`, not `author_id`.

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Change `author_id` to `user_id` in the index definition** ✅ | One-character fix; correct |
| B — Rename the column in stories to `author_id` | Breaking schema change affecting all story queries |
| C — Drop the index entirely | Loses the performance benefit |

**Decision Made:** Option A — minimal fix, change the column name in the index.

**Rationale:** The `stories` table was designed with `user_id` (not `author_id`) for
consistency with other user-owned resources. The index definition was authored by analogy
with the `posts` table (which uses `author_id`) — a copy-paste error. The correct fix
is to use the actual column name.

**Impact:** One line changes in `migrate8.js`.

---

## Category 2: Route & Handler Bugs

### Decision R.1 — Bug 1.3: Duplicate `PUT /me/upsert` — which registration to keep?

**Bug:** `profiles.js` registers `PUT /me/upsert` twice. Express uses the first match.

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Remove the second registration (after `PUT /:id`)** ✅ | The first registration (before `PUT /:id`) is in the correct position |
| B — Remove the first registration | The second would shadow `/:id`; wrong behavior |
| C — Merge both into one | Unnecessary; they're identical |

**Decision Made:** Option A — remove the second registration.

**Rationale:** The route `PUT /me/upsert` must come *before* `PUT /:id` so Express doesn't
treat `me` as a wildcard `:id`. The first registration is in the correct position. The
second is dead code that was never cleaned up during a refactor.

**Impact:** The duplicate block (~15 lines) is removed from the bottom of `profiles.js`.
Observable API behavior is unchanged.

---

### Decision R.2 — Bug 1.4: What should `updateRecord` return when zero rows are updated?

**Bug:** `updateRecord` returns `null` when no rows match, but callers pass `null` directly
to `res.json()`, sending an invalid body.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Make `updateRecord` throw on zero rows | Would require try/catch in all callers |
| **B — Add null guard in each caller: if null → 404** ✅ | Minimal change; clear HTTP semantics |
| C — Change `updateRecord` to return an empty object `{}` | Masks the "not found" condition |

**Decision Made:** Option B — null guard in each affected caller.

**Rationale:** The CRUD helper's contract is clear: `null` means zero rows matched. The fix
belongs in the callers, which are responsible for translating database results to HTTP
responses. HTTP 404 is the correct status when a record is not found.

**Affected callers:**
- `products.js` `PUT /:id`
- `profiles.js` `PUT /:id`
- `notifications.js` `PUT /:id/read`

**Impact:** Each caller gets one added guard:
```js
if (!updated) return res.status(404).json({ error: 'Record not found' });
```

---

### Decision R.3 — Bug 1.5: What should `GET /api/reviews` return?

**Bug:** No `GET /` route exists in `reviews.js`. Frontend `entities.Review.list()` → 404.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Return all reviews, no filtering | Simple; potentially large result sets |
| **B — Return filtered reviews with optional query params** ✅ | `product_id`, `reviewer_id`, `sort`, `limit` |
| C — Return paginated reviews | More complex; adds cursor/page logic |

**Decision Made:** Option B — filtered list with optional `product_id`, `reviewer_id`,
`sort`, and `limit` query parameters.

**Rationale:** The frontend SDK's `.list()` method may pass query params for filtering.
Simple filtering with a max `limit` (200) is safe and consistent with other list endpoints.
Full pagination is not required for the current scale.

**Impact:** A new `GET /` route is added as the **first** route in `reviews.js` (before
`GET /product/:productId`) to avoid route conflicts.

---

### Decision R.4 — Bug 1.6: How to fix the smart feed sort order?

**Bug:** `DISTINCT ON (id) … ORDER BY id, feed_rank` forces sorting by UUID, making
`feed_rank` irrelevant.

**Root cause:** PostgreSQL requires the first `ORDER BY` expression in a `DISTINCT ON`
query to match the `DISTINCT ON` column. When that column is `id` (a UUID), sorting is
effectively random.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Remove `DISTINCT ON`, use `GROUP BY` | Different deduplication semantics; may change which rows are selected |
| **B — CTE-based query: inner query handles DISTINCT ON; outer query sorts by feed_rank** ✅ | Satisfies the PostgreSQL constraint AND enables meaningful sorting |
| C — Switch to `ORDER BY RANDOM()` explicitly | Gives up on feed ranking entirely |

**Decision Made:** Option B — CTE-based query.

**Rationale:** The inner query uses `DISTINCT ON (id) ORDER BY id, feed_rank` to satisfy
the PostgreSQL parser. The outer `SELECT * FROM ranked ORDER BY feed_rank, created_at DESC`
is free to sort by relevance because it operates on the already-deduplicated CTE result.

**Impact:** The `if (feed === 'true' && !author_id && !post_type)` branch in `posts.js`
is replaced with the CTE query. No other branches are touched.

---

### Decision R.5 — Bug 1.7: How to prevent SQL injection via table name in `crud.js`?

**Bug:** The `table` argument in all five CRUD functions is interpolated directly into SQL
without validation.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Use parameterized queries for table names | Not possible — PostgreSQL does not allow table names as bind parameters |
| **B — Hardcoded allowlist (`ALLOWED_TABLES` Set)** ✅ | Simple; fast O(1) lookup; explicitly enumerates all valid tables |
| C — Regex validation (alphanumeric + underscore) | Prevents injection but doesn't prevent accessing unintended tables |

**Decision Made:** Option B — hardcoded `Set` of permitted table names.

**Rationale:** The CRUD helpers are internal utilities called with hard-coded table names.
An allowlist is the most explicit and secure approach: it proves the valid set is known and
bounded. Any new table that needs CRUD operations must be consciously added to the list.

**ALLOWED_TABLES includes all currently used tables:**
`users`, `user_profiles`, `posts`, `products`, `businesses`, `showrooms`, `orders`,
`tasks`, `task_bids`, `conversations`, `messages`, `notifications`, `follows`, `likes`,
`comments`, `stories`, `story_views`, `reviews`, `saves`, `reports`, `blocks`, `wallets`,
`wallet_transactions`, `events`, `event_tickets`, `jobs`, `job_applications`, `courses`,
`course_lessons`, `course_enrollments`, `point_transactions`, `push_subscriptions`,
`cart_items`, `wishlists`, `product_variants`, `return_requests`, `delivery_updates`,
`price_alerts`, `hashtags`, `post_hashtags`, `poll_votes`, `coupons`, `commissions`.

**Impact:** `validateTable(table)` is called as the first line in each of the five exported
functions. It throws `Error('Invalid table name: <table>')` before any SQL executes.

---

## Category 3: CORS & Connectivity Bugs

### Decision C.1 — Bug 1.8: How to support multiple CORS origins?

**Bug:** `FRONTEND_URL` is a single string; Next.js origin (`http://localhost:3000`)
is blocked.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Add a separate `FRONTEND_URL_NEXT` env var | Two vars to manage; risk of forgetting to update both |
| **B — Parse `FRONTEND_URL` as comma-separated list** ✅ | One env var; backward compatible; easy to extend |
| C — Allow all origins (`cors({ origin: '*' })`) | Insecure; breaks credentialed requests |

**Decision Made:** Option B — comma-separated `FRONTEND_URL`.

**Rationale:** Parsing a comma-separated string is a common pattern (`FRONTEND_URL=http://localhost:5173,http://localhost:3000`). It keeps configuration in one place and is backward compatible (single URL with no comma still works). In non-production environments, both localhost origins are added automatically so developers don't need to update `.env` manually.

**Auto-injection logic (non-production only):**
```js
if (process.env.NODE_ENV !== 'production') {
  if (!allowedOrigins.includes('http://localhost:3000'))
    allowedOrigins.push('http://localhost:3000');
  if (!allowedOrigins.includes('http://localhost:5173'))
    allowedOrigins.push('http://localhost:5173');
}
```

**Impact:** `index.js` CORS config and the `initSocket` call are updated. `.env.example`
shows the comma-separated format.

---

### Decision C.2 — Bug 1.9: Should Socket.IO CORS use the same origin list as HTTP?

**Bug:** `socket.js` `initSocket` passes the raw `corsOrigin` string directly to Socket.IO,
blocking the Next.js origin.

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Pass the same `allowedOrigins` array from index.js** ✅ | Single source of truth; guaranteed consistency |
| B — Maintain a separate Socket.IO origin list | Two configs to keep in sync; fragile |

**Decision Made:** Option A.

**Rationale:** HTTP CORS and Socket.IO CORS should always agree on which origins are
permitted. `index.js` builds the `allowedOrigins` array and passes it to both
`cors(corsOptions)` and `initSocket(server, allowedOrigins)`.

**Impact:** `initSocket` signature is unchanged but now accepts an array. Inside `socket.js`,
`const origins = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin || 'http://localhost:5173']`
ensures backward compatibility.

---

## Category 4: Frontend Auth & Provider Bugs

### Decision A.1 — Bug 1.10: How to ensure CartProvider defers cart fetch until auth resolves?

**Bug:** `CartProvider` wraps `AuthProvider` in `providers.tsx`, causing `fetchCart` to fire
before `checkUserAuth()` completes.

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Reorder providers: AuthProvider wraps CartProvider** ✅ | AuthProvider is available in context when CartProvider mounts |
| B — Make CartProvider poll for auth state | Polling is fragile and introduces timing dependencies |
| C — Delay CartProvider with a setTimeout | Arbitrary delay; not guaranteed to outlast auth check |

**Decision Made:** Option A — reorder providers plus add a `useEffect` in `CartContext.tsx`
that re-fetches the cart when `authChecked && isAuthenticated` becomes true.

**Rationale:** Simply reordering providers means `AuthProvider` is available in context when
`CartProvider` mounts. But the initial `fetchCart` on mount may still fire before auth
resolves if it reads `localStorage` directly. The additional `useEffect` in `CartContext.tsx`
ensures a re-fetch happens after auth is confirmed, catching the hard-refresh scenario.

**Provider order after fix:**
```tsx
<AuthProvider>       ← outer
  <CartProvider>     ← inner; useAuth() now works
    ...
  </CartProvider>
</AuthProvider>
```

---

### Decision A.2 — Bug 1.11: How to eliminate the duplicate `auth.me()` call in AppLayout?

**Bug:** `AppLayout.tsx` calls `auth.me()` directly inside its own `useEffect`, duplicating
the `GET /api/auth/me` call that `AuthContext` already makes.

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Replace `auth.me()` call with `useAuth()` hook** ✅ | Single source of truth; one API call per session |
| B — Cache the `auth.me()` response and share it | Requires a custom cache; adds complexity |
| C — Remove `auth.me()` from AppLayout; re-add auth state as props | Threading props through layout is verbose |

**Decision Made:** Option A.

**Rationale:** `AuthContext` already manages the user object, `isAuthenticated` flag, and
`authChecked` flag. `AppLayout` should consume these via `useAuth()` — that's the entire
purpose of the context. The local `useState` and `useEffect` for auth in `AppLayout` become
unnecessary and are removed.

**Removed from AppLayout:**
- `const [user, setUser] = useState(null)` — replaced by `const { user } = useAuth()`
- `const [checkingProfile, setCheckingProfile] = useState(true)` — replaced by `authChecked` from context
- The `useEffect` that calls `auth.me().then(...)` — replaced by a single `useEffect([user])`

---

### Decision A.3 — Bug 1.12: How should AppLayout handle 401 (unauthenticated)?

**Bug:** When `auth.me()` fails with 401, `AppLayout` calls `setCheckingProfile(false)` but
does not redirect to `/login`. The user is silently left on a protected page.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Show an error message | User sees an error but stays on a protected page |
| **B — Redirect to `/login`** ✅ | Standard behavior for protected routes; clean UX |
| C — Redirect to a dedicated "session expired" page | Extra route to maintain; same effect as /login |

**Decision Made:** Option B.

**Rationale:** The standard UX pattern for expired or absent sessions on protected routes
is to redirect to the login page. The user can re-authenticate and return.

**Implementation:** After switching to `useAuth()`, the redirect logic becomes:
```tsx
useEffect(() => {
  if (authChecked && !isAuthenticated) {
    router.push('/login');
  }
}, [authChecked, isAuthenticated]);
```

**Impact:** Authenticated users are never redirected. The `authChecked && isAuthenticated`
branch is covered by a preservation test.

---

## Category 5: Wallet Transaction Gaps

### Decision W.1 — Bug 1.13: How to add debit and refund wallet routes?

**Bug:** `wallet.js` only has `POST /topup` (credit) and `POST /withdraw`. The schema
supports `debit` and `refund` types but no routes exist.

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Add `debit` and `refund` to the existing `topup`/`withdraw` handler via a `type` param | Combines all four transaction types into one route |
| **B — Add dedicated `POST /debit` and `POST /refund` routes** ✅ | Explicit; mirrors the pattern of existing routes; easy to protect individually |
| C — Handle via order/return lifecycle events only | Defers wallet changes to other routes; harder to audit |

**Decision Made:** Option B.

**Rationale:** The existing pattern uses dedicated routes per transaction type (`/topup`, `/withdraw`).
Following the same pattern keeps the code consistent and allows each route to have its own
authorization logic (e.g., `debit` may require admin role; `refund` may require system or admin).

**Key difference from existing routes:**
- `POST /debit` — decrements balance; requires admin/system caller
- `POST /refund` — increments balance (like credit); intended for return/order refund flows

**Impact:** `returns.js` currently does a raw `pool.query` to insert a `'credit'` transaction
(mislabelled) instead of a `'refund'`. After this fix, it can call `POST /api/wallet/refund`
instead.

---

## Testing Methodology Decisions

### Decision TM.1 — Test execution order: bug condition tests before fixes

All test groups in this spec follow the exploratory bugfix methodology:

1. **Write bug condition exploration tests** (expected to FAIL on unfixed code)
2. **Write preservation tests** (expected to PASS on unfixed code — baseline)
3. **Implement the fix**
4. **Re-run bug condition tests** (now expected to PASS)
5. **Re-run preservation tests** (still expected to PASS)
6. **Group checkpoint**

**Why write failing tests first?**  
A test that was written after the fix cannot prove the fix was necessary. Writing tests
that fail on unfixed code and pass on fixed code provides proof of both the bug and the
solution.

---

### Decision TM.2 — Can groups run in parallel?

**Question:** The five fix categories are independent. Can the task groups run in parallel?

**Decision:** Yes — the task dependency graph specifies all five Wave 1 tasks (`1, 2, 5, 6, 9, 10, 13, 14, 17, 18`) can run concurrently. Within each group, the sequence is sequential (exploration → preservation → fix → verify).

---

### Decision TM.3 — Property-based testing scope for crud.js allowlist

**Question:** For the `ALLOWED_TABLES` validation, should PBT generate random strings or
use a constrained set?

**Decision:** PBT generates random strings (via `fc.string()` with word characters) and
asserts that only Set members pass. The test also generates all current table names
and asserts each one passes. This gives confidence that:
- Arbitrary strings are rejected
- All legitimate table names remain functional

---

## Preservation Requirements Summary

The following behaviors were verified on unfixed code and must remain unchanged after all fixes:

| # | Behavior | Affected Bug |
|---|----------|-------------|
| 3.1 | `migrate.js` → `migrate6.js` succeed on fresh DB | 1.1, 1.2 |
| 3.2 | All non-stories indexes in migrate8.js created correctly | 1.2 |
| 3.3 | `PUT /api/profiles/me/upsert` upserts correctly | 1.3 |
| 3.4 | `updateRecord` returning a row → HTTP 200 with row | 1.4 |
| 3.5 | `GET /api/reviews/product/:productId` → 200 with joined profiles | 1.5 |
| 3.6 | `POST /api/reviews` upserts and recalculates rating | 1.5 |
| 3.7 | `DELETE /api/reviews/:id` deletes and recalculates | 1.5 |
| 3.8 | `GET /api/posts` without `feed=true` sorts correctly | 1.6 |
| 3.9 | All current crud.js callers still work (in ALLOWED_TABLES) | 1.7 |
| 3.10 | Vite frontend (port 5173) continues to work after CORS fix | 1.8, 1.9 |
| 3.11 | AppLayout displays correct user name, avatar, admin link | 1.11 |
| 3.12 | `logout()` clears token and redirects to /login | 1.12 |
| 3.13 | `POST /api/wallet/topup` and `/withdraw` unchanged | 1.13 |
| 3.14 | `GET /api/wallet/me` returns balance + last 50 transactions | 1.13 |

---

## Correctness Properties Summary

| Property | Bug(s) | What It Verifies |
|----------|--------|-----------------|
| P1 | 1.1, 1.2 | All migrations succeed on fresh DB |
| P2 | 1.1, 1.2 | Prior migrations (1–6) unchanged |
| P3 | 1.3 | Exactly one `PUT /me/upsert` handler registered |
| P4 | 1.3 | Upsert behavior identical after removing duplicate |
| P5 | 1.4 | `updateRecord` null → HTTP 404 |
| P6 | 1.4 | `updateRecord` non-null → HTTP 200 with row |
| P7 | 1.5 | `GET /api/reviews` → HTTP 200 with array |
| P8 | 1.5 | Existing reviews routes unaffected |
| P9 | 1.6 | Feed query returns posts in `feed_rank` order |
| P10 | 1.6 | Non-feed post queries unaffected |
| P11 | 1.7 | Invalid table names throw before SQL executes |
| P12 | 1.7 | Allowed table names continue to work |
| P13 | 1.8 | Multi-origin CORS accepts both frontends |
| P14 | 1.8 | Vite origin still accepted after CORS fix |
| P15 | 1.9 | Socket.IO accepts both frontend origins |
| P16 | 1.10 | CartProvider fetchCart defers until authChecked=true |
| P17 | 1.11 | AppLayout uses `useAuth()`, not direct `auth.me()` |
| P18 | 1.11 | AppLayout still displays correct user data |
| P19 | 1.12 | 401 in AppLayout triggers `/login` redirect |
| P20 | 1.12 | Authenticated users are not redirected |
| P21 | 1.13 | `POST /debit` and `POST /refund` exist and work |
| P22 | 1.13 | Existing wallet routes unchanged |
