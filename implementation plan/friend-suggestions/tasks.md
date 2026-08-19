# Implementation Plan: Friend Suggestions & AI-User Distinction

## Overview

Implement the `is_seed` data-model flag plus the friend suggestion system across the full stack. Tasks proceed in dependency order: database first, backend second, frontend last. Each task wires directly into the existing patterns — no new frameworks are introduced.

## Tasks

- [x] 1. Database migration — `is_seed` column and `dismissed_suggestions` table
  - Create `backend/db/migrate12.js`
  - Add `is_seed BOOLEAN NOT NULL DEFAULT FALSE` to `users` via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
  - Backfill `UPDATE users SET is_seed = TRUE WHERE email LIKE '%@nodbusiness.test'`
  - Create `dismissed_suggestions` table with `(id, requester_id, target_id, created_at)` and `UNIQUE(requester_id, target_id)`
  - Add index `idx_dismissed_suggestions_requester ON dismissed_suggestions(requester_id)`
  - Wrap all three operations in a single `BEGIN … COMMIT` transaction
  - _Requirements: 1.1, 1.3_

- [x] 2. Expose `is_seed` through existing backend endpoints
  - [x] 2.1 Update `GET /api/auth/me` (`routes/auth.js`) to include `is_seed` in the `SELECT` columns
    - Change SELECT to: `id, email, full_name, role, is_verified, is_seed, created_at`
    - _Requirements: 1.4, 1.5_
  - [x] 2.2 Update `POST /api/auth/register` (`routes/auth.js`) to explicitly set `is_seed = FALSE` in the INSERT
    - Add `is_seed` column to the INSERT statement with value `FALSE`
    - _Requirements: 1.4_
  - [x] 2.3 Update `db/seed.js` user INSERT to set `is_seed = TRUE` for the 50 generated `@nodbusiness.test` users
    - Add `is_seed` to the column list and pass `TRUE` for seed users
    - Dev accounts (`admin@nodbusiness.app`, `test@nodbusiness.app`) keep `is_seed = FALSE`
    - _Requirements: 1.2_
  - [x] 2.4 Update profile read routes (`routes/profiles.js`) to JOIN `users` and include `is_seed`
    - `GET /api/profiles/by-user/:userId` — add `JOIN users u ON u.id = up.user_id` and return `u.is_seed`
    - `GET /api/profiles/:id` — same JOIN pattern
    - `GET /api/profiles/` list — same JOIN pattern
    - _Requirements: 2.1_
  - [ ]* 2.5 Write unit tests for `is_seed` round-trip fidelity
    - **Property 7: is_seed flag survives round-trip through the API**
    - **Validates: Requirements 1.5, 2.1, 2.2**
    - Place in `backend/test/suggestions/is-seed.pbt.test.js`
    - Use `fast-check` to generate boolean `is_seed` values, set them in a mock user object, feed through the response shaping logic, assert the value is preserved

- [ ] 3. Implement the pure `computeScore` function
  - Create `backend/lib/suggestionScore.js` exporting `computeScore(candidate, requester)`
  - Implement the formula: `min(mutual_count * 5, 50) + (location match ? 10 : 0) + (active within 30 days ? 5 : 0)`
  - `last_active_at` is the candidate's `users.updated_at` ISO timestamp
  - _Requirements: 5.1_
  - [ ]* 3.1 Write property tests for `computeScore`
    - **Property 5: Score is always non-negative and bounded**
    - **Validates: Requirements 5.1**
    - Place in `backend/test/suggestions/computeScore.pbt.test.js`
    - Use `fast-check` arbitraries for `mutual_count` (integer 0–50), `location` strings, `last_active_at` dates
    - Assert result ∈ [0, 65] for all generated inputs
  - [ ]* 3.2 Write unit tests for `computeScore` edge cases
    - Test: 11 mutual connections → score capped at 50 (not 55)
    - Test: `last_active_at` exactly 30 days ago → still earns +5
    - Test: `last_active_at` 31 days ago → no activity bonus
    - Test: location null on either side → no location bonus
    - Place in `backend/test/suggestions/computeScore.test.js`

- [ ] 4. Implement the suggestion backend route
  - Create `backend/routes/suggestions.js`
  - Implement `GET /api/suggestions/people` (requires auth)
    - Run the scored SQL query (see design.md Data Models section)
    - If result count < 20, supplement with recently-joined `Real_Users` (`is_seed = FALSE`) not already in the result set, ordered by `created_at DESC`, until total = 20 or no more candidates
    - Return the array directly; each item includes: `user_id, display_name, avatar_url, headline, location, follower_count, mutual_count, is_seed`
  - Implement `POST /api/suggestions/dismiss/:targetUserId` (requires auth)
    - Return HTTP 400 if `targetUserId === req.user.id`
    - Check `dismissed_suggestions` for existing row — if found, return HTTP 200 immediately (no DB write)
    - Otherwise `INSERT INTO dismissed_suggestions` and return HTTP 200
  - _Requirements: 4.1–4.7, 5.1–5.3, 6.1–6.4_
  - [ ]* 4.1 Write property tests for the suggestion engine (exclusion invariants)
    - **Property 1: Scored candidates are always excluded from requester and already-followed users**
    - **Property 2: Dismissed users never appear in subsequent suggestions**
    - **Property 3: Suggestion count is bounded by 20**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 7.1**
    - Place in `backend/test/suggestions/suggestions.pbt.test.js`
    - Use an in-memory fake repository (JavaScript objects, no real DB) to simulate the exclusion logic
    - Use `fast-check` to generate requester IDs, follow sets, dismiss sets, and candidate pools
  - [ ]* 4.2 Write property tests for suggestion sort ordering
    - **Property 4: Scoring formula preserves ordering**
    - **Validates: Requirements 4.7, 5.1, 5.2, 5.3**
    - Use `fast-check` to generate candidate lists with random scores, follower_counts, and is_seed flags
    - Assert adjacent pairs satisfy: `score[i] >= score[i+1]`, with tiebreakers applied correctly
    - Place in the same `suggestions.pbt.test.js` file
  - [ ]* 4.3 Write property tests for required fields in suggestion response
    - **Property (from 4.6): every suggestion includes all required fields**
    - **Validates: Requirements 4.6, 2.2**
    - Generate random candidate objects; pass through the response-shaping function; assert all 8 required fields are present
  - [ ]* 4.4 Write unit tests for the dismiss endpoint
    - **Property 6: Idempotent dismiss**
    - **Validates: Requirements 6.1, 6.3, 6.4**
    - Test: dismiss self → HTTP 400
    - Test: dismiss new user → HTTP 200 + row inserted
    - Test: dismiss same user twice → HTTP 200 both times, one row in table
    - Place in `backend/test/suggestions/suggestions.route.test.js` (supertest)

- [x] 5. Register the suggestions route in the Express app
  - Add `app.use('/api/suggestions', require('./routes/suggestions'));` to `backend/index.js`
  - Follow the existing pattern — place after similar social routes (e.g., after `/api/trending`)
  - _Requirements: 4.1, 6.1_

- [~] 6. Checkpoint — run backend tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add `is_seed` to search results (`routes/search.js`)
  - Locate the users/people section of the search route
  - Add `JOIN users u ON u.id = up.user_id` (or equivalent) to include `u.is_seed` in each returned user record
  - _Requirements: 2.3_

- [x] 8. Frontend — typed API module for suggestions
  - Create `frontend-next/api/suggestions.ts`
  - Define the `Suggestion` TypeScript interface: `{ user_id, display_name, avatar_url, headline, location, follower_count, mutual_count, is_seed }`
  - Implement `suggestionsApi.getPeople(): Promise<Suggestion[]>` using the shared `client` from `api/client.ts`
  - Implement `suggestionsApi.dismiss(targetUserId: string): Promise<void>`
  - _Requirements: 4.1, 6.1_

- [ ] 9. Frontend — `DemoBadge` component
  - Create `frontend-next/components/profile/DemoBadge.tsx`
  - Render a small, visually distinct badge with text "Demo"
  - Include `aria-label="AI-generated demo account"` on the badge element
  - Style using TailwindCSS (`bg-yellow-100 text-yellow-800 text-xs font-semibold px-1.5 py-0.5 rounded` or similar)
  - Export as a named component: `export function DemoBadge()`
  - _Requirements: 3.1, 3.2, 3.4_
  - [ ]* 9.1 Write property tests for `DemoBadge`
    - **Property (from 3.1, 3.2, 3.4): badge renders ↔ is_seed value, ARIA label always present**
    - **Validates: Requirements 3.1, 3.2, 3.4**
    - Place in `frontend-next/test/DemoBadge.test.tsx`
    - Use `fast-check` to generate boolean `is_seed` values; render a component that conditionally includes `<DemoBadge />`; assert badge presence matches `is_seed` and ARIA label is correct when badge is present

- [x] 10. Frontend — `SuggestionCard` component
  - Create `frontend-next/components/suggestions/SuggestionCard.tsx`
  - Props: `suggestion: Suggestion`, `onFollow: (userId: string) => void`, `onDismiss: (userId: string) => void`
  - Render avatar (fallback to initials), display name + `DemoBadge` if `is_seed`, headline, location, mutual count
  - "Follow" button: calls `onFollow`, shows "Following" state optimistically
  - Dismiss icon button: calls `onDismiss`; use `X` icon from `lucide-react`
  - _Requirements: 3.1, 3.2, 8.2, 8.3_

- [ ] 11. Frontend — `PeopleYouMayKnow` widget
  - Create `frontend-next/components/suggestions/PeopleYouMayKnow.tsx`
  - Use `useQuery` from `@tanstack/react-query` to call `suggestionsApi.getPeople()`
  - Display first 5 items from the API response
  - On follow: call `POST /api/profiles/follow/:id` (existing endpoint), then remove card from list optimistically
  - On dismiss: call `suggestionsApi.dismiss(userId)`, then remove card from list optimistically
  - Show `"No more suggestions"` when list is empty (Requirement 8.4)
  - Show a non-blocking inline error message (not a full-page error) when the query fails (Requirement 8.5)
  - Show a loading skeleton while fetching
  - _Requirements: 8.1–8.5_
  - [ ]* 11.1 Write unit tests for `PeopleYouMayKnow`
    - Test: renders up to 5 suggestion cards from mock data
    - Test: shows empty state when API returns `[]`
    - Test: shows inline error message when API throws
    - Test: removes card from list after follow click
    - Test: removes card from list after dismiss click
    - Place in `frontend-next/test/suggestions.test.tsx`

- [x] 12. Mount `PeopleYouMayKnow` in the right panel
  - Open `frontend-next/components/layout/AppLayout.tsx`
  - Import `PeopleYouMayKnow` from `@/components/suggestions/PeopleYouMayKnow`
  - Add `<PeopleYouMayKnow />` near the top of the `RightPanel` component's return, above the Quick Links panel
  - Only render when `user` prop is non-null (user is authenticated)
  - _Requirements: 8.1_

- [x] 13. Apply `DemoBadge` to existing user-display surfaces
  - Open `frontend-next/views/Profile.tsx` and add `<DemoBadge />` adjacent to the display name when `profile.is_seed === true`
  - Add the non-dismissible AI-generated notice banner to the profile page when `is_seed === true` (Requirement 3.3)
  - Open `frontend-next/views/Search.tsx` (or equivalent people-listing component) and add `<DemoBadge />` to user result cards when `is_seed === true`
  - _Requirements: 3.1, 3.2, 3.3_

- [~] 14. Checkpoint — run all tests
  - Ensure all tests pass (backend: `npm run test:unit` in `/backend`; frontend: `npm test` in `/frontend-next`), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` (already in devDependencies on both sides)
- All property tests run a minimum of 100 iterations
- Each property test comment references the design property number it validates
- The `computeScore` pure function is kept in `backend/lib/` (not inside the route) so it can be tested without a database
- The `dismissed_suggestions` table uses `ON CONFLICT DO NOTHING` semantics via the idempotent dismiss check in the route handler
- The `is_seed` column defaults to `FALSE` so the migration is additive and safe on a live database

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] },
    { "wave": 5, "tasks": ["5"] },
    { "wave": 6, "tasks": ["6"] },
    { "wave": 7, "tasks": ["7", "8"] },
    { "wave": 8, "tasks": ["9"] },
    { "wave": 9, "tasks": ["10"] },
    { "wave": 10, "tasks": ["11"] },
    { "wave": 11, "tasks": ["12"] },
    { "wave": 12, "tasks": ["13"] },
    { "wave": 13, "tasks": ["14"] }
  ]
}
```
