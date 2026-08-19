# Implementation Plan

## Overview

This task list covers all 13 gap fixes across the Nodbusiness full-stack application. Tasks are grouped by category, each following the exploratory bugfix workflow: write bug-condition tests first (expect failure), write preservation tests (expect pass), implement the fix, then verify both sets pass. Groups map to the five fix categories from the design document.

## Task Dependency Graph

```json
{
  "waves": [
    ["1", "2", "5", "6", "9", "10", "13", "14", "17", "18"],
    ["3", "7", "11", "15", "19"],
    ["4", "8", "12", "16", "20"],
    ["21"]
  ]
}
```

Groups are independent of each other and can be worked in parallel. Within each group, exploration tests must precede implementation tasks, which must precede preservation verification.

## Tasks

<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 1 — DATABASE MIGRATION FIXES (bugs 1.1, 1.2)
     Files: backend/db/migrate7.js, backend/db/migrate8.js
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 1. Write bug condition exploration test — Migration failures on fresh database
  - **Property 1: Bug Condition** - Migration Schema Gaps (bugs 1.1 & 1.2)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes expected migration behaviour — it validates the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both migration bugs exist
  - **Scoped PBT Approach**: Scope to the two concrete failing cases for reproducibility
  - Test 1.1: Run `node db/migrate7.js` against a fresh database (migrate.js–migrate6.js already run, migrate7 not yet run); assert the process exits 0 and `ticker_type` column exists in `user_profiles`
  - Test 1.2: Run `node db/migrate8.js` after `migrate2.js`; assert `idx_stories_author_expires` is created without error (verify it uses `user_id`, not `author_id`)
  - Run both tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — migrate7 errors "column ticker_type does not exist"; migrate8 errors "column author_id does not exist"
  - Document counterexamples: `ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none'` fails; `ON stories(author_id, expires_at)` fails
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2_


- [ ] 2. Write preservation property tests — Prior migrations unaffected (BEFORE implementing fix)
  - **Property 2: Preservation** - Migrations 1–6 Continue to Succeed
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Run `node db/migrate-all.js` on a fresh DB using only migrate.js–migrate6.js; all succeed
  - Write property-based test: for any fresh database, running migrate.js through migrate6.js produces all expected tables without error (isBugCondition = false for those scripts)
  - Verify test passes on UNFIXED code (migrations 1–6 are already correct)
  - **EXPECTED OUTCOME**: Tests PASS — confirms the baseline to preserve
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2_

- [ ] 3. Fix Group 1 — Database Migration Bugs

  - [ ] 3.1 Fix migrate7.js — add ticker_type column before altering its default
    - File: `backend/db/migrate7.js`
    - Insert `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ticker_type TEXT DEFAULT 'none';` as the FIRST statement in the `schema` string, before the existing `ALTER COLUMN ticker_type SET DEFAULT 'none'` line
    - The `IF NOT EXISTS` guard keeps it safe on databases that already have the column
    - Final first two SQL lines in `schema`:
      ```sql
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ticker_type TEXT DEFAULT 'none';
      ALTER TABLE user_profiles ALTER COLUMN ticker_type SET DEFAULT 'none';
      ```
    - _Bug_Condition: isBugCondition_1_1(context) — fresh DB, ticker_type not in user_profiles columns_
    - _Expected_Behavior: migrate7.js exits 0, ticker_type column exists with default 'none'_
    - _Preservation: migrate.js–migrate6.js schemas unchanged; existing ticker backfill UPDATE statements unchanged_
    - _Requirements: 2.1, 3.1_


  - [ ] 3.2 Fix migrate8.js — correct column name in stories index
    - File: `backend/db/migrate8.js`
    - Change `ON stories(author_id, expires_at)` → `ON stories(user_id, expires_at)`
    - Before: `CREATE INDEX IF NOT EXISTS idx_stories_author_expires ON stories(author_id, expires_at);`
    - After:  `CREATE INDEX IF NOT EXISTS idx_stories_author_expires ON stories(user_id, expires_at);`
    - No other lines in migrate8.js are touched
    - _Bug_Condition: isBugCondition_1_2(context) — storiesTableExists=true, columnName='author_id', 'author_id' NOT IN columns('stories')_
    - _Expected_Behavior: idx_stories_author_expires created on user_id column without error_
    - _Preservation: all other performance indexes in migrate8.js created identically_
    - _Requirements: 2.2, 3.2_

  - [ ] 3.3 Verify bug condition exploration test now passes (Property 1: Expected Behavior)
    - **Property 1: Expected Behavior** - Migration Schema Gaps Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run migrate7 and migrate8 tests against freshly patched files
    - **EXPECTED OUTCOME**: Both tests PASS — no column errors, correct index created
    - _Requirements: 2.1, 2.2_

  - [ ] 3.4 Verify preservation tests still pass (Property 2: Preservation)
    - **Property 2: Preservation** - Migrations 1–6 Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run migrate.js–migrate6.js tests again
    - **EXPECTED OUTCOME**: Tests PASS — no regressions in prior migrations

- [ ] 4. Checkpoint Group 1 — run `node db/migrate-all.js` on a fresh test database; assert all 8 migrations succeed and schema contains `ticker_type` column and correct stories index


<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 2 — ROUTE & HANDLER FIXES (bugs 1.3, 1.4, 1.5, 1.6, 1.7)
     Files: profiles.js, products.js, profiles.js, notifications.js,
            reviews.js, posts.js, crud.js
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 5. Write bug condition exploration test — Route and handler defects
  - **Property 1: Bug Condition** - Route & Handler Defects (bugs 1.3–1.7)
  - **CRITICAL**: These tests MUST FAIL on unfixed code
  - **DO NOT attempt to fix the test or the code when they fail**
  - **GOAL**: Surface counterexamples that confirm each route/handler defect exists
  - Test 1.3: Load `profiles.js` and inspect `router.stack`; assert exactly 1 handler for `PUT /me/upsert` — expected FAIL: count is 2
  - Test 1.4: Call `PUT /api/products/:id` with a product ID that was deleted after the pre-check (simulate race: call `updateRecord('products', nonExistentId, {...})` directly); assert HTTP 404 — expected FAIL: response is HTTP 200 with body `null`
  - Test 1.5: `GET /api/reviews` with no query params; assert HTTP 200 — expected FAIL: HTTP 404
  - Test 1.6: `GET /api/posts?feed=true`; collect `created_at` of first 5 results; assert first result is more recent than last result — expected FAIL: posts sorted by UUID, no recency guarantee
  - Test 1.7: Call `listRecords("users; SELECT 1; --", {})` in a unit test context; assert it throws `Error('Invalid table name: ...')` before any DB call — expected FAIL: no validation error
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL (confirms bugs 1.3–1.7 exist)
  - Document counterexamples found for each
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_


- [ ] 6. Write preservation property tests — Existing route behaviour unchanged (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Route Behaviours
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code:
    - `PUT /api/profiles/me/upsert` with valid auth → correct upserted profile (first handler fires, second is dead code)
    - `updateRecord` with an existing record → returns the updated row, caller returns HTTP 200
    - `GET /api/reviews/product/:productId` → HTTP 200 with joined display_name and avatar_url
    - `POST /api/reviews` and `DELETE /api/reviews/:id` → work correctly
    - `GET /api/posts` without `feed=true` → sorted by requested field, unaffected
    - `listRecords('products', {...})` → executes correctly (legitimate table name)
  - Write property-based test: for any ALLOWED_TABLES member passed to a crud.js function, the result is identical to the pre-allowlist behaviour
  - Write property-based test: for any `GET /api/posts` request without `feed=true`, response order matches the `sort` param
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — confirms baselines to preserve
  - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 7. Fix Group 2 — Route & Handler Bugs

  - [ ] 7.1 Remove duplicate PUT /me/upsert from profiles.js
    - File: `backend/routes/profiles.js`
    - Delete the SECOND `router.put('/me/upsert', requireAuth, async (req, res) => { ... })` block — the one that appears AFTER `router.put('/:id', requireAuth, ...)` (lines approx. 89–104 in current file)
    - Keep the first registration (before `PUT /:id`) intact; it is the correct one
    - After the fix, `router.stack` must contain exactly one entry for `PUT /me/upsert`
    - _Bug_Condition: isBugCondition_1_3(routeTable) — COUNT of PUT /me/upsert > 1_
    - _Expected_Behavior: exactly one PUT /me/upsert handler; upsert behaviour unchanged_
    - _Preservation: PUT /me/upsert API response format unchanged (Requirements 3.3)_
    - _Requirements: 2.3, 3.3_


  - [ ] 7.2 Add null checks after updateRecord in products.js, profiles.js, and notifications.js
    - **products.js** `PUT /:id` — after `const updated = await updateRecord('products', req.params.id, req.body);` insert:
      ```js
      if (!updated) return res.status(404).json({ error: 'Record not found' });
      ```
      Place it before `res.json(updated)` and before the low-stock / price-alert logic
    - **profiles.js** `PUT /:id` — after `const updated = await updateRecord('user_profiles', req.params.id, req.body);` insert:
      ```js
      if (!updated) return res.status(404).json({ error: 'Record not found' });
      ```
    - **notifications.js** `PUT /:id/read` — after `const updated = await updateRecord('notifications', req.params.id, { is_read: true });` insert:
      ```js
      if (!updated) return res.status(404).json({ error: 'Record not found' });
      ```
    - _Bug_Condition: isBugCondition_1_4(input) — record existed at check time, deleted before update, callerChecksNull=false_
    - _Expected_Behavior: HTTP 404 { error: 'Record not found' } when updateRecord returns null_
    - _Preservation: updateRecord returning a valid row → HTTP 200 with updated row (Requirements 3.4)_
    - _Requirements: 2.4, 3.4_

  - [ ] 7.3 Add GET / route to reviews.js
    - File: `backend/routes/reviews.js`
    - Add the following route as the FIRST route definition in the file (before `GET /product/:productId`):
      ```js
      router.get('/', optionalAuth, async (req, res) => {
        try {
          const { product_id, reviewer_id, sort = '-created_at', limit = 50 } = req.query;
          const conditions = [];
          const params = [];
          if (product_id) { params.push(product_id); conditions.push(`r.product_id = $${params.length}`); }
          if (reviewer_id) { params.push(reviewer_id); conditions.push(`r.reviewer_id = $${params.length}`); }
          const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
          const orderBy = sort.startsWith('-') ? `r.${sort.slice(1)} DESC` : `r.${sort} ASC`;
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
    - `optionalAuth` is already imported; `pool` is already required
    - _Bug_Condition: isBugCondition_1_5(request) — GET /api/reviews, routeExists returns false_
    - _Expected_Behavior: HTTP 200, JSON array of reviews joined with display_name and avatar_url_
    - _Preservation: GET /product/:productId, POST /, DELETE /:id all unchanged (Requirements 3.5, 3.6, 3.7)_
    - _Requirements: 2.5, 3.5, 3.6, 3.7_


  - [ ] 7.4 Rewrite smart feed query in posts.js to sort by feed_rank
    - File: `backend/routes/posts.js`
    - Replace the existing `SELECT DISTINCT ON (id) ... ORDER BY id, feed_rank LIMIT $4` block inside the `if (feed === 'true' && !author_id && !post_type)` branch with a CTE-based query:
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
    - The inner CTE handles the `DISTINCT ON (id)` + `ORDER BY id` constraint; the outer `ORDER BY feed_rank, created_at DESC` is now free to sort by relevance
    - No changes to the `return res.json(rows)` call or any other branch
    - _Bug_Condition: isBugCondition_1_6(request) — feedParam='true', authorIdParam=null, postTypeParam=null_
    - _Expected_Behavior: posts returned ordered by feed_rank ASC then created_at DESC; feed_rank=1 (recent) posts appear before feed_rank=2 (popular) posts_
    - _Preservation: GET /api/posts without feed=true → sort order identical to before (Requirements 3.8)_
    - _Requirements: 2.6, 3.8_

  - [ ] 7.5 Add ALLOWED_TABLES validation to crud.js
    - File: `backend/utils/crud.js`
    - Add the following after the `const pool = require('../db/pool');` line:
      ```js
      const ALLOWED_TABLES = new Set([
        'users', 'user_profiles', 'posts', 'products', 'businesses', 'showrooms',
        'orders', 'tasks', 'task_bids', 'conversations', 'messages', 'notifications',
        'follows', 'likes', 'comments', 'stories', 'story_views', 'reviews', 'saves',
        'reports', 'blocks', 'wallets', 'wallet_transactions', 'events', 'event_tickets',
        'jobs', 'job_applications', 'courses', 'course_lessons', 'course_enrollments',
        'point_transactions', 'push_subscriptions', 'cart_items', 'wishlists',
        'product_variants', 'return_requests', 'delivery_updates', 'price_alerts',
        'hashtags', 'post_hashtags', 'poll_votes', 'coupons', 'commissions',
      ]);

      function validateTable(table) {
        if (!ALLOWED_TABLES.has(table)) {
          throw new Error(`Invalid table name: ${table}`);
        }
      }
      ```
    - Call `validateTable(table);` as the very first line inside each of the five exported functions: `listRecords`, `getRecord`, `createRecord`, `updateRecord`, `deleteRecord`
    - Export `validateTable` by adding it to `module.exports`
    - _Bug_Condition: isBugCondition_1_7(input) — tableName NOT IN ALLOWED_TABLES_
    - _Expected_Behavior: throws Error('Invalid table name: <table>') before any SQL executes_
    - _Preservation: all current callers use table names in ALLOWED_TABLES; their behaviour is unchanged (Requirements 3.9)_
    - _Requirements: 2.7, 3.9_


  - [ ] 7.6 Verify bug condition exploration test now passes (Property 1: Expected Behavior)
    - **Property 1: Expected Behavior** - Route & Handler Defects Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 5 — do NOT write new tests
    - Run all five route/handler bug condition tests against patched files
    - **EXPECTED OUTCOME**: All tests PASS — one PUT /me/upsert handler; updateRecord null → 404; GET /api/reviews → 200; feed sorted by feed_rank; invalid table → throws
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 7.7 Verify preservation tests still pass (Property 2: Preservation)
    - **Property 2: Preservation** - Route Behaviours Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS — no regressions in existing route behaviour

- [ ] 8. Checkpoint Group 2 — confirm all route/handler integration tests pass; run the property-based test for ALLOWED_TABLES (generate 1000 random strings, assert only Set members pass)


<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 3 — CORS & CONNECTIVITY FIXES (bugs 1.8, 1.9)
     Files: backend/index.js, backend/socket.js, backend/.env.example
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 9. Write bug condition exploration test — CORS blocks Next.js origin
  - **Property 1: Bug Condition** - Single-Origin CORS Blocks Next.js (bugs 1.8 & 1.9)
  - **CRITICAL**: These tests MUST FAIL on unfixed code
  - **DO NOT attempt to fix the test or the code when they fail**
  - **GOAL**: Confirm that both HTTP CORS and Socket.IO CORS reject the Next.js origin
  - Test 1.8: Send a credentialed `GET /api/auth/me` request with `Origin: http://localhost:3000`; assert the response `Access-Control-Allow-Origin` header equals `http://localhost:3000` — expected FAIL: header is `http://localhost:5173` or absent
  - Test 1.9: Attempt a Socket.IO connection from `http://localhost:3000` origin; assert the upgrade handshake succeeds — expected FAIL: CORS error on WebSocket upgrade
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL — Next.js origin blocked by single-string CORS config
  - Document counterexample: CORS header is `http://localhost:5173` when request comes from `http://localhost:3000`
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.8, 1.9_

- [ ] 10. Write preservation property tests — Vite origin continues to work (BEFORE implementing fix)
  - **Property 2: Preservation** - Vite Origin (port 5173) Still Accepted
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code: credentialed request from `http://localhost:5173` → response includes `Access-Control-Allow-Origin: http://localhost:5173`
  - Write property-based test: for any request from `http://localhost:5173`, response accepts it (mimics current single-origin behaviour)
  - Verify test passes on UNFIXED code
  - **EXPECTED OUTCOME**: Test PASSES — baseline confirmed
  - _Requirements: 3.10_


- [ ] 11. Fix Group 3 — CORS & Connectivity Bugs

  - [ ] 11.1 Update CORS to support multiple origins in index.js
    - File: `backend/index.js`
    - Replace the current `const corsOptions = { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true };` block with:
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
    - Also update the `initSocket` call at the bottom of the file: change `initSocket(server, process.env.FRONTEND_URL || 'http://localhost:5173')` to `initSocket(server, allowedOrigins)`
    - _Bug_Condition: isBugCondition_1_8(request) — typeof corsConfig='string', request.origin ≠ corsConfig_
    - _Expected_Behavior: Access-Control-Allow-Origin matches the requesting origin for any origin in allowedOrigins_
    - _Preservation: http://localhost:5173 continues to be accepted (Requirements 3.10)_
    - _Requirements: 2.8, 3.10_

  - [ ] 11.2 Update Socket.IO CORS to support multiple origins in socket.js
    - File: `backend/socket.js`
    - In `initSocket(httpServer, corsOrigin)`, replace `cors: { origin: corsOrigin || 'http://localhost:5173', credentials: true }` with:
      ```js
      const origins = Array.isArray(corsOrigin)
        ? corsOrigin
        : [corsOrigin || 'http://localhost:5173'];
      ioInstance = new Server(httpServer, {
        cors: { origin: origins, credentials: true },
      });
      ```
    - No other changes to socket.js
    - _Bug_Condition: isBugCondition_1_9(input) — typeof corsConfig='string', socketOrigin ≠ corsConfig_
    - _Expected_Behavior: Socket.IO accepts WebSocket connections from both http://localhost:5173 and http://localhost:3000_
    - _Preservation: Vite frontend Socket.IO connections continue to work_
    - _Requirements: 2.9, 3.10_

  - [ ] 11.3 Update .env.example with comma-separated FRONTEND_URL example
    - File: `backend/.env.example`
    - Change `FRONTEND_URL=http://localhost:5173` to `FRONTEND_URL=http://localhost:5173,http://localhost:3000`
    - No other changes to this file
    - _Requirements: 2.8_

  - [ ] 11.4 Verify bug condition exploration test now passes (Property 1: Expected Behavior)
    - **Property 1: Expected Behavior** - Multi-Origin CORS Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 9 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS — both `http://localhost:3000` HTTP and Socket.IO connections accepted

  - [ ] 11.5 Verify preservation tests still pass (Property 2: Preservation)
    - **Property 2: Preservation** - Vite Origin Still Accepted
    - **IMPORTANT**: Re-run the SAME tests from task 10 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS — http://localhost:5173 continues to work

- [ ] 12. Checkpoint Group 3 — start both Vite (port 5173) and Next.js (port 3000) dev frontends; confirm credentialed API requests and WebSocket connections from both origins succeed without CORS errors


<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 4 — FRONTEND AUTH & PROVIDER FIXES (bugs 1.10, 1.11, 1.12)
     Files: frontend-next/app/providers.tsx,
            frontend-next/lib/CartContext.tsx,
            frontend-next/components/layout/AppLayout.tsx
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 13. Write bug condition exploration test — Frontend auth and provider ordering defects
  - **Property 1: Bug Condition** - Auth & Provider Defects (bugs 1.10, 1.11, 1.12)
  - **CRITICAL**: These tests MUST FAIL on unfixed code
  - **DO NOT attempt to fix the test or the code when they fail**
  - **GOAL**: Confirm cart fires before auth, auth.me() called twice, and 401 has no redirect
  - Test 1.10: In a unit test, mount `providers.tsx` with a mock `authChecked=false` state; record the timestamp when `fetchCart` is invoked vs when `authChecked` flips to `true`; assert `fetchCart` does NOT fire before `authChecked=true` — expected FAIL: `fetchCart` fires immediately on mount
  - Test 1.11: Mount `AppLayout` inside a test renderer with a mock auth token; intercept network calls; assert exactly 1 call to `GET /api/auth/me` — expected FAIL: 2 calls observed
  - Test 1.12: Mount `AppLayout` with `authChecked=true` and `isAuthenticated=false`; assert `router.push('/login')` is called — expected FAIL: no redirect
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All tests FAIL — confirms bugs 1.10, 1.11, 1.12
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.10, 1.11, 1.12_

- [ ] 14. Write preservation property tests — Authenticated UI behaviour unchanged (BEFORE implementing fix)
  - **Property 2: Preservation** - Authenticated AppLayout Renders Correctly
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code (authenticated state):
    - `AppLayout` displays `user.full_name` initial in the avatar
    - Admin link is shown when `user.role === 'admin'`
    - `useAuth().logout()` clears the token and redirects to `/login`
    - Cart count in the header reflects the current cart state
  - Write property-based test: for any authenticated user, `AppLayout` renders `user.full_name.charAt(0)` in the avatar element
  - Verify preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS
  - _Requirements: 3.11, 3.12_


- [ ] 15. Fix Group 4 — Frontend Auth & Provider Bugs

  - [ ] 15.1 Reorder providers in providers.tsx — CartProvider inside AuthProvider
    - File: `frontend-next/app/providers.tsx`
    - Change the provider nesting so `AuthProvider` wraps `CartProvider` (not the other way):
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
    - No other changes to this file
    - _Bug_Condition: isBugCondition_1_10(providerTree) — indexOf('CartProvider') < indexOf('AuthProvider')_
    - _Expected_Behavior: CartProvider mounts after AuthProvider; auth context is available when CartProvider mounts_
    - _Preservation: ThemeProvider and QueryClientProvider positions unchanged_
    - _Requirements: 2.10_

  - [ ] 15.2 Update CartContext.tsx to re-fetch cart after auth resolves
    - File: `frontend-next/lib/CartContext.tsx`
    - Add `import { useAuth } from '@/lib/AuthContext';` after the existing `import client from '@/api/client';` line
    - Inside `CartProvider`, add the following after the existing `useEffect(() => { fetchCart(); }, [fetchCart]);`:
      ```tsx
      const { authChecked, isAuthenticated } = useAuth();
      useEffect(() => {
        if (authChecked && isAuthenticated) {
          fetchCart();
        }
      }, [authChecked, isAuthenticated, fetchCart]);
      ```
    - Keep the existing `useEffect(() => { fetchCart(); }, [fetchCart]);` — it handles the initial anonymous fetch; the new effect handles the post-auth re-fetch
    - _Bug_Condition: isBugCondition_1_10 — cart fetched before authChecked=true_
    - _Expected_Behavior: fetchCart fires again when authChecked flips to true and isAuthenticated=true, ensuring cart reflects authenticated state_
    - _Preservation: fetchCart still called on initial mount for unauthenticated users_
    - _Requirements: 2.10_


  - [ ] 15.3 Replace auth.me() with useAuth() in AppLayout.tsx
    - File: `frontend-next/components/layout/AppLayout.tsx`
    - Add `import { useAuth } from '@/lib/AuthContext';` near the top (with other imports); remove or keep `import { auth } from '@/api/auth'` only if `auth` is used elsewhere in this file (it is not — safe to remove)
    - Remove `const [user, setUser] = useState(null);` and `const [checkingProfile, setCheckingProfile] = useState(true);` from the component's local state declarations
    - Add the following line inside `AppLayout` after the existing hook calls:
      ```tsx
      const { user, isAuthenticated, authChecked } = useAuth();
      ```
    - Remove the entire `useEffect` block that calls `auth.me().then(async u => { ... }).catch(() => setCheckingProfile(false))` — this is the auth-fetch effect
    - Replace it with a new effect that handles only the side-effects that depend on `user` being resolved (profile check, socket setup):
      ```tsx
      useEffect(() => {
        if (!user) return;
        entities.UserProfile.filter({ user_id: user.id }).then(profiles => {
          if (profiles.length === 0 && pathname !== '/onboarding') {
            router.push('/onboarding');
            return;
          }
          loadUnreadCount(user);
          connectSocket();
          const s = getSocket();
          s.on('new_notification', (notif) => {
            setUnreadCount(c => c + 1);
            toast(notif.title, {
              description: notif.body || undefined,
              duration: 5000,
              action: notif.link
                ? { label: 'View', onClick: () => { window.location.href = notif.link; } }
                : undefined,
            });
          });
        });
        return () => { disconnectSocket(); };
      }, [user]);
      ```
    - _Bug_Condition: isBugCondition_1_11(component) — component.calls('auth.me()') && !component.uses('useAuth()')_
    - _Expected_Behavior: exactly one GET /api/auth/me per page load; user state from AuthContext_
    - _Preservation: avatar initial, admin link, and user display name continue to render correctly (Requirements 3.11)_
    - _Requirements: 2.11, 3.11_

  - [ ] 15.4 Add /login redirect when authChecked=true and isAuthenticated=false in AppLayout.tsx
    - File: `frontend-next/components/layout/AppLayout.tsx`
    - Add the following `useEffect` after the `user`-dependent effect added in 15.3:
      ```tsx
      useEffect(() => {
        if (authChecked && !isAuthenticated) {
          router.push('/login');
        }
      }, [authChecked, isAuthenticated, router]);
      ```
    - This must depend on `authChecked` and `isAuthenticated` from `useAuth()` (already destructured in 15.3)
    - _Bug_Condition: isBugCondition_1_12(input) — authChecked=true, isAuthenticated=false, redirectCalled=false_
    - _Expected_Behavior: router.push('/login') called; user redirected to login page_
    - _Preservation: authenticated users (authChecked=true, isAuthenticated=true) are NOT redirected (Requirements 3.12)_
    - _Requirements: 2.12, 3.12_

  - [ ] 15.5 Verify bug condition exploration test now passes (Property 1: Expected Behavior)
    - **Property 1: Expected Behavior** - Frontend Auth & Provider Defects Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 13 — do NOT write new tests
    - **EXPECTED OUTCOME**: All tests PASS — cart deferred until auth resolves; one auth/me call; 401 redirects to /login

  - [ ] 15.6 Verify preservation tests still pass (Property 2: Preservation)
    - **Property 2: Preservation** - Authenticated UI Renders Correctly
    - **IMPORTANT**: Re-run the SAME tests from task 14 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS — avatar initial, admin link, logout, and cart count all correct

- [ ] 16. Checkpoint Group 4 — perform end-to-end auth flow test: clear localStorage, navigate to any protected page, confirm redirect to /login; log in, confirm user data renders in AppLayout, cart loads after auth, socket connects; log out, confirm token cleared and redirect occurs


<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 5 — WALLET TRANSACTION TYPE GAPS (bug 1.13)
     File: backend/routes/wallet.js
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 17. Write bug condition exploration test — Missing debit and refund wallet routes
  - **Property 1: Bug Condition** - Missing POST /debit and POST /refund (bug 1.13)
  - **CRITICAL**: These tests MUST FAIL on unfixed code
  - **DO NOT attempt to fix the test or the code when they fail**
  - **GOAL**: Confirm that both wallet routes return 404 on unfixed code
  - Test: `POST /api/wallet/debit` with body `{ user_id: '<valid-uuid>', amount: 50, description: 'Commission' }` and admin auth token; assert HTTP 200 — expected FAIL: HTTP 404
  - Test: `POST /api/wallet/refund` with body `{ user_id: '<valid-uuid>', amount: 100, description: 'Order refund' }` and valid auth token; assert HTTP 200 — expected FAIL: HTTP 404
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Both tests FAIL with HTTP 404 — confirms routes do not exist
  - Document counterexample: `POST /api/wallet/debit` → 404 Not Found; `POST /api/wallet/refund` → 404 Not Found
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.13_

- [ ] 18. Write preservation property tests — Existing wallet routes unchanged (BEFORE implementing fix)
  - **Property 2: Preservation** - topup, withdraw, and GET /me Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on unfixed code:
    - `POST /api/wallet/topup` with `{ amount: 100 }` → HTTP 200, balance increased, `'credit'` transaction inserted
    - `POST /api/wallet/withdraw` with `{ amount: 50, bank_name: 'Test', account_number: '123' }` → HTTP 200, balance decreased, `'withdrawal'` transaction inserted
    - `GET /api/wallet/me` → HTTP 200, wallet with `transactions` array (last 50)
  - Write property-based test: for any valid topup amount, wallet balance increases by exactly that amount and a 'credit' transaction is inserted
  - Write property-based test: for any sequence of topup + withdraw where withdraw ≤ balance, final balance = sum(credits) − sum(withdrawals)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS — baselines confirmed
  - _Requirements: 3.13, 3.14_

- [ ] 19. Fix Group 5 — Wallet Transaction Type Gaps

  - [ ] 19.1 Add POST /debit route to wallet.js
    - File: `backend/routes/wallet.js`
    - Add the following route after the existing `POST /withdraw` handler (before `module.exports`):
      ```js
      // Debit wallet (admin/system only — e.g. commission deduction)
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
      ```
    - _Bug_Condition: isBugCondition_1_13(request) — POST /api/wallet/debit, routeExists=false_
    - _Expected_Behavior: balance decremented by amount, 'debit' transaction record inserted, updated wallet returned_
    - _Preservation: topup, withdraw, and GET /me routes unchanged (Requirements 3.13, 3.14)_
    - _Requirements: 2.13, 3.13, 3.14_

  - [ ] 19.2 Add POST /refund route to wallet.js
    - File: `backend/routes/wallet.js`
    - Add the following route after the POST /debit handler added in 19.1 (before `module.exports`):
      ```js
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
    - _Bug_Condition: isBugCondition_1_13(request) — POST /api/wallet/refund, routeExists=false_
    - _Expected_Behavior: balance incremented by amount, 'refund' transaction record inserted, updated wallet returned_
    - _Preservation: topup, withdraw, and GET /me routes unchanged (Requirements 3.13, 3.14)_
    - _Requirements: 2.13, 3.13, 3.14_

  - [ ] 19.3 Verify bug condition exploration test now passes (Property 1: Expected Behavior)
    - **Property 1: Expected Behavior** - Debit and Refund Routes Exist and Work
    - **IMPORTANT**: Re-run the SAME tests from task 17 — do NOT write new tests
    - **EXPECTED OUTCOME**: Both tests PASS — POST /debit decrements balance and inserts 'debit' transaction; POST /refund increments balance and inserts 'refund' transaction

  - [ ] 19.4 Verify preservation tests still pass (Property 2: Preservation)
    - **Property 2: Preservation** - Existing Wallet Routes Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 18 — do NOT write new tests
    - **EXPECTED OUTCOME**: Tests PASS — topup, withdraw, and GET /me behave identically to before

- [ ] 20. Checkpoint Group 5 — run the full wallet balance invariant property-based test: for any sequence of topup, debit (admin), refund, and withdraw operations where no operation causes a negative balance, assert final_balance = (sum of credits + refunds) − (sum of debits + withdrawals)


<!-- ═══════════════════════════════════════════════════════════════════════════
     FINAL CHECKPOINT — All 13 bugs resolved
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 21. Final checkpoint — Ensure all tests pass
  - Run `node db/migrate-all.js` on a fresh test database; assert zero errors and correct schema
  - Run full backend test suite; assert all route tests pass
  - Run all property-based tests (table allowlist, CORS origins, wallet balance invariant, feed ordering)
  - Start both Vite (port 5173) and Next.js (port 3000) dev servers; verify CORS and WebSocket from both origins
  - Perform end-to-end auth flow: unauthenticated → redirect to /login; log in → AppLayout renders; log out → redirect
  - Verify cart re-fetches after auth resolves on hard refresh
  - Confirm `GET /api/reviews` returns 200; `GET /api/posts?feed=true` returns posts in recency order
  - Ask the user if any questions arise before closing the spec

## Notes

- Each group follows the two-phase bugfix workflow: **explore** (write failing tests on unfixed code) → **preserve** (write passing baseline tests) → **implement** → **verify**
- Property-based tests are especially recommended for bug 1.7 (ALLOWED_TABLES, 1000+ random table names), bugs 1.8/1.9 (CORS origin matching), bug 1.4 (null updateRecord path with random non-existent IDs), and bug 1.13 (wallet balance invariant across random operation sequences)
- The `IF NOT EXISTS` guard in the migrate7.js fix is critical for production databases that had `ticker_type` added manually — it makes the migration idempotent
- The feed query rewrite (bug 1.6) uses a CTE to satisfy PostgreSQL's `DISTINCT ON` ordering constraint while keeping the outer `ORDER BY` free to sort by `feed_rank`
- Fixing bug 1.10 requires both provider reordering (providers.tsx) AND the auth-triggered re-fetch (CartContext.tsx) — the first change makes the context available; the second ensures the cart actually reloads after auth resolves
- Bugs 1.11 and 1.12 must both be applied to AppLayout.tsx in the same sub-group (15.3 and 15.4) since 15.4 depends on `authChecked` and `isAuthenticated` destructured in 15.3
