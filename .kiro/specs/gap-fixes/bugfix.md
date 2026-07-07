# Bugfix Requirements Document

## Introduction

This document captures all identified bugs and gaps across the full-stack application (Node.js/Express backend + Next.js frontend). The issues span four categories: migration correctness (schema gaps that break fresh database setup), route correctness (duplicate handlers, missing endpoints, incorrect SQL), CORS/connectivity (multi-frontend origin blocking), and frontend auth flow (provider ordering and duplicated auth logic). Each bug is documented with its defective behavior, the correct expected behavior, and the existing correct behaviors that must not regress.

---

## Bug Analysis

### Current Behavior (Defect)

#### Migration & Schema Bugs

1.1 WHEN `migrate7.js` runs on a fresh database THEN the system fails with a PostgreSQL error because `ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none'` references a column (`ticker_type`) that was never added by any prior migration (`migrate.js` through `migrate6.js`).

1.2 WHEN `migrate8.js` runs on a fresh database THEN the system fails to create the index `idx_stories_author_expires ON stories(author_id, expires_at)` because the `stories` table uses `user_id` as its foreign-key column, not `author_id`.

#### Route & Handler Bugs

1.3 WHEN `profiles.js` is loaded by Express THEN the system registers `PUT /me/upsert` twice — an identical second definition appears after `PUT /:id` — so the first handler is permanently shadowed by the second, making the code misleading and fragile if the two definitions ever diverge.

1.4 WHEN `updateRecord` in `crud.js` executes an UPDATE that matches zero rows (e.g., record deleted between a prior existence check and the update) THEN the system returns `null` silently, and callers such as the `products.js` PUT handler respond with `res.json(null)`, which sends an invalid JSON body and crashes the client.

1.5 WHEN a client calls `GET /api/reviews` (i.e., `entities.Review.list()`) THEN the system returns HTTP 404 because `reviews.js` has no `GET /` route — only `GET /product/:productId`, `POST /`, and `DELETE /:id` are defined.

1.6 WHEN the smart feed query in `posts.js` executes with `feed=true` THEN the system returns posts sorted by UUID (`ORDER BY id, feed_rank`) instead of by recency or relevance, because `DISTINCT ON (id)` requires the first `ORDER BY` expression to match `id`, which makes `feed_rank` irrelevant for ordering — users see posts in random UUID order.

1.7 WHEN the `crud.js` `listRecords`, `getRecord`, `createRecord`, `updateRecord`, and `deleteRecord` functions receive a `table` argument THEN the system interpolates the table name directly into the SQL string without validating it against an allowlist, creating a latent SQL injection vector if table names ever come from user-controlled input.

#### CORS & Connectivity Bugs

1.8 WHEN the Next.js frontend (running on `http://localhost:3000`) makes a credentialed API request THEN the system rejects it with a CORS error because `index.js` sets `origin: process.env.FRONTEND_URL || 'http://localhost:5173'` — a single string that blocks all other origins including `http://localhost:3000`.

1.9 WHEN the Next.js frontend attempts a WebSocket connection THEN the system rejects it because `socket.js` `initSocket` passes the same single-origin value to Socket.IO's CORS config (`cors: { origin: corsOrigin || 'http://localhost:5173' }`), blocking `http://localhost:3000`.

#### Frontend Auth & Provider Bugs

1.10 WHEN the application mounts and the user has a stored `access_token` THEN `CartProvider` runs its `useEffect` and calls `fetchCart()` before `AuthProvider` has completed its own `checkUserAuth()`, because `CartProvider` wraps `AuthProvider` in `providers.tsx` — meaning the cart fetch may fire before auth state is established, silently ignoring the token on first render after a hard refresh.

1.11 WHEN `AppLayout.tsx` mounts THEN the system calls `auth.me()` directly (bypassing `useAuth()`) to fetch and set its own local `user` state, duplicating the auth fetch that `AuthContext` already performs — causing a redundant API call on every page load.

1.12 WHEN `auth.me()` fails with a 401 in `AppLayout.tsx` THEN the system calls `setCheckingProfile(false)` silently without redirecting the user to `/login`, leaving an unauthenticated user on a protected page with no session and no feedback.

#### Wallet & Transaction Type Gaps

1.13 WHEN business logic needs to record a `debit` or `refund` wallet transaction THEN the system has no route or handler for these types — `wallet.js` only inserts `'credit'` (top-up) and `'withdrawal'` types — even though the `wallet_transactions` table schema allows `'credit'`, `'debit'`, `'withdrawal'`, and `'refund'`.

---

### Expected Behavior (Correct)

#### Migration & Schema Bugs

2.1 WHEN `migrate7.js` runs on a fresh database THEN the system SHALL succeed because a prior migration (or `migrate7.js` itself using `ADD COLUMN IF NOT EXISTS`) SHALL have added `ticker_type TEXT DEFAULT 'none'` to `user_profiles` before attempting to alter its default.

2.2 WHEN `migrate8.js` runs on a fresh database THEN the system SHALL create the stories index successfully using the correct column name `user_id` — i.e., `CREATE INDEX IF NOT EXISTS idx_stories_author_expires ON stories(user_id, expires_at)`.

#### Route & Handler Bugs

2.3 WHEN `profiles.js` is loaded by Express THEN the system SHALL register `PUT /me/upsert` exactly once; the duplicate definition SHALL be removed so the route table is unambiguous.

2.4 WHEN `updateRecord` in `crud.js` matches zero rows THEN the system SHALL return a clear 404 response to the client — callers like `products.js` PUT handler SHALL detect `null` and respond with `res.status(404).json({ error: 'Record not found' })` instead of `res.json(null)`.

2.5 WHEN a client calls `GET /api/reviews` THEN the system SHALL return an array of all reviews (or reviews filtered by query params) with HTTP 200, because a `GET /` route SHALL exist in `reviews.js`.

2.6 WHEN the smart feed query in `posts.js` executes with `feed=true` THEN the system SHALL return posts ordered by feed relevance (recency first, then popularity) rather than by UUID — the outer `ORDER BY` SHALL use `feed_rank` as the primary sort key, not `id`.

2.7 WHEN `crud.js` CRUD functions receive a `table` argument THEN the system SHALL validate the value against a hardcoded allowlist of permitted table names and SHALL reject any table name not on the list with an internal error, preventing SQL injection.

#### CORS & Connectivity Bugs

2.8 WHEN any frontend (Vite on port 5173 or Next.js on port 3000) makes a credentialed API request THEN the system SHALL accept the request — `index.js` CORS config SHALL allow both origins by reading multiple values from environment configuration (e.g., `FRONTEND_URL` as a comma-separated list or a separate `FRONTEND_URL_NEXT` var).

2.9 WHEN the Next.js frontend attempts a WebSocket connection THEN the system SHALL accept it — `socket.js` `initSocket` SHALL use the same multi-origin array as the HTTP CORS config so both frontends can establish real-time connections.

#### Frontend Auth & Provider Bugs

2.10 WHEN the application mounts THEN `CartProvider` SHALL be nested inside `AuthProvider` (or at minimum re-trigger `fetchCart` when auth state changes) so that the cart fetch fires only after the auth token is confirmed present and valid.

2.11 WHEN `AppLayout.tsx` needs the current user THEN the system SHALL use `useAuth()` from `AuthContext` instead of calling `auth.me()` directly, eliminating the duplicate API call and ensuring a single source of truth for auth state.

2.12 WHEN `auth.me()` (or `checkUserAuth()` via `useAuth()`) returns a 401 in `AppLayout.tsx` THEN the system SHALL redirect the user to `/login` so they are not silently left on a protected page without a session.

#### Wallet & Transaction Type Gaps

2.13 WHEN an order is fulfilled or a refund is processed THEN the system SHALL have route handlers for `debit` and `refund` wallet transaction types so that wallet balances accurately reflect all money movements.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `migrate.js` through `migrate6.js` run on a fresh database THEN the system SHALL CONTINUE TO create all existing tables and indexes without error.

3.2 WHEN `migrate8.js` runs after a `migrate2.js` that already created the `stories` table with `user_id` THEN the system SHALL CONTINUE TO create all other performance indexes in that migration successfully.

3.3 WHEN `PUT /api/profiles/me/upsert` is called by an authenticated user THEN the system SHALL CONTINUE TO upsert the profile correctly (create if not exists, update if exists) — removing the duplicate definition must not change observable behavior.

3.4 WHEN `updateRecord` in `crud.js` matches one or more rows THEN the system SHALL CONTINUE TO return the updated row as before.

3.5 WHEN `GET /api/reviews/product/:productId` is called THEN the system SHALL CONTINUE TO return reviews for that product with joined display name and avatar from user profiles.

3.6 WHEN `POST /api/reviews` is called with valid `product_id` and `rating` THEN the system SHALL CONTINUE TO upsert the review and recalculate the product's `average_rating` and `review_count`.

3.7 WHEN `DELETE /api/reviews/:id` is called by the reviewer or an admin THEN the system SHALL CONTINUE TO delete the review and recalculate product rating stats.

3.8 WHEN `GET /api/posts` is called without `feed=true` THEN the system SHALL CONTINUE TO return posts in the requested sort order unaffected by the feed query fix.

3.9 WHEN `crud.js` receives a table name from the existing set of hardcoded callers (`products`, `orders`, `tasks`, etc.) THEN the system SHALL CONTINUE TO execute queries correctly — the allowlist must include all currently used table names.

3.10 WHEN the Vite frontend (port 5173) makes credentialed API or WebSocket requests THEN the system SHALL CONTINUE TO accept them after the CORS config is updated to support multiple origins.

3.11 WHEN a user is authenticated and `AuthContext` has loaded THEN `AppLayout.tsx` SHALL CONTINUE TO display the correct user name, avatar initial, and role-gated admin link.

3.12 WHEN a user logs out via `useAuth().logout()` THEN the system SHALL CONTINUE TO clear the token and redirect to `/login`.

3.13 WHEN `POST /api/wallet/topup` and `POST /api/wallet/withdraw` are called THEN the system SHALL CONTINUE TO insert `'credit'` and `'withdrawal'` transaction records respectively, unchanged by the addition of `debit`/`refund` handlers.

3.14 WHEN `GET /api/wallet/me` is called THEN the system SHALL CONTINUE TO return the wallet balance and the last 50 transactions.
