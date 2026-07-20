# Implementation Plan: Friends Tab

## Overview

Implements the Friends Tab feature: a new `/friends` page with three sections (My Friends, Friend Suggestions, Mutual Friends), a new `GET /api/friends/mutual` backend endpoint, a reusable `UserCard` component, a `useCollapse` hook, collapsible Search sections, and the Friends sidebar nav entry.

## Tasks

- [ ] 1. Backend — `GET /api/friends/mutual` endpoint
  - [ ] 1.1 Create `backend/routes/friends.js` with the `GET /api/friends/mutual` route
    - Implement the mutual friends SQL query (follow-back UNION shared-connection) from the design Data Models section
    - Apply `requireAuth` middleware; return HTTP 401 if unauthenticated
    - Exclude the authenticated user from results (`WHERE u.id <> $1`)
    - Return fields: `user_id`, `display_name`, `avatar_url`, `headline`, `is_following`, `mutual_count`
    - Order by `mutual_count DESC`, then `display_name ASC`; apply `LIMIT 50`
    - **Files**: `backend/routes/friends.js`

  - [ ] 1.2 Register the new friends router in `backend/index.js`
    - Add `app.use('/api/friends', require('./routes/friends'));` after the suggestions route line
    - **Files**: `backend/index.js`

- [ ] 2. Frontend API module
  - [ ] 2.1 Create `frontend-next/api/friends.ts`
    - Export `MutualFriend` TypeScript interface matching the backend response shape
    - Export `friendsApi.getMutual()` that calls `GET /api/friends/mutual`
    - **Files**: `frontend-next/api/friends.ts`

- [ ] 3. `useCollapse` custom hook
  - [ ] 3.1 Create `frontend-next/hooks/useCollapse.ts`
    - Accept `total: number` and optional `threshold: number` (default 5)
    - Return `{ visibleCount, isExpanded, expand, collapse, reset }`
    - `reset()` sets state back to collapsed (used by Search on query/tab change)
    - **Files**: `frontend-next/hooks/useCollapse.ts`

- [ ] 4. `UserCard` component
  - [ ] 4.1 Create `frontend-next/components/friends/UserCard.tsx`
    - Accept props: `userId`, `displayName`, `avatarUrl`, `headline`, `mutualCount?`, `isFollowing`, `onToggleFollow`
    - Mirror the visual layout of `SuggestionCard` (avatar/initials, name, headline, mutual count)
    - No dismiss button
    - Button label: "Unfollow" when `isFollowing=true`, "Follow" when `isFollowing=false`
    - Implement optimistic UI: flip local `following` state immediately on click before API resolves
    - On API failure, revert local state and call `toast.error('Failed to update follow status')`
    - **Files**: `frontend-next/components/friends/UserCard.tsx`

- [ ] 5. Friends page
  - [ ] 5.1 Create `frontend-next/views/Friends.tsx`
    - On mount, fire three parallel requests: `GET /api/profiles/me/follows`, `GET /api/suggestions/people`, `GET /api/friends/mutual`
    - Build `followsSet: Set<string>` from the follows response; derive `isFollowing` for all `UserCard` instances
    - Shared `toggleFollow(userId, currentlyFollowing)` handler calls `POST /api/profiles/follow/:userId`, updates `followsSet`, removes followed users from suggestions list
    - Render three sections (local `FriendsSection` sub-component using `useCollapse`):
      - "My Friends" — Unfollow cards; empty state "You are not following anyone yet."
      - "Friend Suggestions" — Follow cards; inline error on API failure; empty state "No new suggestions right now."
      - "Mutual Friends" — `isFollowing` from `followsSet`; empty state "No mutual friends yet."
    - Each section shows skeleton placeholder cards while loading
    - **Files**: `frontend-next/views/Friends.tsx`

  - [ ] 5.2 Create `frontend-next/app/(app)/friends/page.tsx`
    - Thin route file: `'use client'; export { default } from '@/views/Friends';`
    - **Files**: `frontend-next/app/(app)/friends/page.tsx`

- [ ] 6. Sidebar nav entry
  - [ ] 6.1 Update `frontend-next/components/layout/AppLayout.tsx`
    - Insert `{ path: "/friends", icon: Users, label: "Friends" }` into `mainNavItems` immediately after the Explore entry
    - `Users` icon is already imported; `NavLink` component handles active state, icon-only collapsed mode, and tooltip automatically
    - The mobile drawer already iterates `mainNavItems` so no separate drawer change is needed
    - **Files**: `frontend-next/components/layout/AppLayout.tsx`

- [ ] 7. Collapsible Search sections
  - [ ] 7.1 Update `frontend-next/views/Search.tsx`
    - Add `expandedSections: Record<string, boolean>` state initialized to `{}`
    - Add `useEffect` on `debouncedQuery` that resets `expandedSections` to `{}`
    - Add `useEffect` on `tab` that resets `expandedSections` to `{}`
    - Replace existing `Section` component with `CollapsibleSection` that:
      - Accepts `sectionKey: string` and `items: T[]`
      - Slices to 5 when collapsed; shows "Show {extra} more" button when extra > 0
      - Shows all items + "Show less" button when expanded
      - Updates `expandedSections` on button click
    - Apply `CollapsibleSection` to all 7 result sections (users, products, showrooms, tasks, posts, jobs, events)
    - **Files**: `frontend-next/views/Search.tsx`

- [ ] 8. Property-based tests
  - [ ] 8.1 Write property tests for `useCollapse` hook (Properties 1, 2, 13)
    - Use **fast-check** (`fc`)
    - P1: `fc.integer({ min: 0, max: 100 })` → assert `visibleCount === Math.min(N, 5)` and `showMore === N > 5`
    - P2: For any N > 5, expand → all visible + "Show less" present; collapse → back to 5
    - P13: For any expanded state, calling `reset()` → `isExpanded === false`
    - Tag: `// Feature: friends-tab, Property 1: Collapse threshold invariant`
    - **Files**: `frontend-next/__tests__/useCollapse.test.ts`

  - [ ] 8.2 Write property tests for `UserCard` component (Properties 4, 5)
    - P4: Generate arbitrary `UserCardProps` with `fc.record`; assert rendered output contains all required elements
    - P5: `fc.boolean()` for API success/fail; verify optimistic state flip and conditional revert
    - Tag: `// Feature: friends-tab, Property 4: UserCard contains all required fields`
    - **Files**: `frontend-next/__tests__/UserCard.test.tsx`

  - [ ] 8.3 Write property tests for mutual friends SQL logic (Properties 6, 7, 8, 9, 10)
    - P6: Generate `fc.array(fc.tuple(fc.uuid(), fc.uuid()))` for follows edges; verify result matches union of follow-back + shared-connection conditions
    - P7: Assert own user ID never appears in result
    - P8: Assert all six fields present on every record
    - P9: Assert `mutual_count DESC, display_name ASC` ordering
    - P10: Assert `result.length <= 50` for any follows graph
    - Tag: `// Feature: friends-tab, Property 6: Mutual friends SQL correctness`
    - **Files**: `backend/__tests__/friends.mutual.test.js`

  - [ ] 8.4 Write property tests for Search collapse and nav (Properties 3, 11, 12, 14, 15)
    - P11: `fc.integer({ min: 6, max: 20 })` → "More" label equals `"Show ${N-5} more"`
    - P12: Toggle one section; assert other sections' state unchanged
    - P3: Generate any pathname; assert Friends nav active state equals `pathname === "/friends"`
    - P14: Generate followed IDs set + user list; assert initial button state matches set membership
    - P15: Error response → error UI shown, empty-state hidden; empty-array response → only empty-state shown
    - Tag: `// Feature: friends-tab, Property 11: Show more button label accuracy`
    - **Files**: `frontend-next/__tests__/search.collapse.test.tsx`, `frontend-next/__tests__/nav.active.test.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 3, 4, 6] },
    { "wave": 2, "tasks": [5, 7] },
    { "wave": 3, "tasks": [8] }
  ]
}
```

Wave 1 tasks are fully independent and can run in parallel: backend endpoint (1), API module (2), `useCollapse` hook (3), `UserCard` component (4), and sidebar nav entry (6). Wave 2 tasks depend on Wave 1: the Friends page view (5) depends on tasks 2, 3, and 4; the Search collapsible sections (7) depends on task 3. Wave 3 (tests, task 8) depends on all prior implementation tasks.

## Notes

- **No DB migration required**: the feature reads from the existing `follows` and `user_profiles` tables only.
- **fast-check** must be added as a dev dependency if not already present: `npm install -D fast-check` in `frontend-next/` and `backend/`.
- The `UserCard` component intentionally does not reuse `SuggestionCard` directly to avoid coupling the friends page to the suggestions-dismissal API, but the visual design mirrors it exactly.
- The mobile drawer in `AppLayout.tsx` already iterates `mainNavItems` for its link list, so adding the Friends entry to `mainNavItems` is sufficient for both desktop and mobile coverage.
