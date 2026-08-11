# Implementation Plan: bookmark-and-business-separator

## Overview

Implement three coordinated UI/UX enhancements: (1) a `|` pipe separator between business names in `PostCard`, (2) a shared `BookmarkButton` component with amber active state, optimistic updates, and rollback, wired into all four card types, and (3) a global `bookmarksSlice` Zustand store so the Bookmarks page reflects toggle changes in real-time. All changes are TypeScript/React/Zustand inside the `frontend-next` package. The backend requires no changes.

---

## Tasks

- [x] 1. Create `bookmarksSlice` and wire into `store/index.ts`
  - [x] 1.1 Create `store/bookmarksSlice.ts` with `savedIds` map, `isHydrating`, `error`, `isSaved()`, `hydrate()`, and `toggleSave()` with optimistic update + rollback
    - Define `SavedItem` and `BookmarksSlice` interfaces exactly as specified in the design
    - Implement `isSaved` as `(targetId) => !!get().savedIds[targetId]`
    - `hydrate()`: guard against concurrent calls with `isHydrating`; call `GET /api/saves`; populate `savedIds` keyed by `target_id`; on failure set `error` and leave `savedIds` unchanged
    - `toggleSave()`: snapshot current `savedIds`, apply optimistic add/remove, call `POST /api/saves/toggle`; on success reconcile from `{ saved: boolean }` response; on failure revert snapshot, set `error`, call `toast.error()`
    - Follow the `cartSlice` coding conventions (StateCreator import, `client` from `@/api/client`, rollback pattern)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 1.2 Update `store/index.ts` to include `bookmarksSlice`
    - Import `createBookmarksSlice` and `BookmarksSlice`
    - Add `BookmarksSlice` to the `AppStore` type union
    - Spread `...createBookmarksSlice(...a)` in the `create()` call
    - `savedIds` must NOT appear in the `partialize` whitelist (not persisted)
    - _Requirements: 6.1, 6.2_

- [x] 2. Implement `BookmarkButton` component
  - [x] 2.1 Create `components/ui/BookmarkButton.tsx`
    - Accept props: `targetId: string`, `targetType: 'post' | 'product' | 'showroom' | 'task'`, `itemData?: { title?: string; thumbnailUrl?: string }`, `className?: string`
    - Use `useState<boolean>` for local `isPending` to disable the button while the toggle API is in-flight
    - Read `isSaved` and `toggleSave` from `useAppStore`
    - Active state classes: `fill-amber-500 text-amber-500`; inactive: `text-muted-foreground` with no fill
    - Disabled/in-flight: `opacity-50 cursor-not-allowed pointer-events-none`; add `disabled` attribute
    - Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50`
    - `aria-label`: `"Bookmark this {targetType}"` when inactive, `"Remove bookmark"` when active
    - `aria-pressed`: mirrors current saved state (boolean)
    - Wrap icon in a `<button>` element; keyboard activation (Enter/Space) triggers toggle via normal button behavior
    - _Requirements: 2.1–2.6, 3.1–3.5, 4.1–4.5, 5.1–5.4, 8.1–8.6_

  - [x]* 2.2 Write property test for `BookmarkButton` aria attributes (Properties 10 & 11)
    - **Property 10: BookmarkButton aria-pressed mirrors saved state**
    - **Property 11: BookmarkButton aria-label reflects direction of action**
    - File: `test/bookmarks/BookmarkButton.property.test.tsx`
    - Use `fc.record({ targetId: fc.string({ minLength: 1 }), saved: fc.boolean() })` as arbitrary input
    - Render `BookmarkButton` with a store pre-seeded to match `saved`, assert `aria-pressed` and `aria-label` values
    - Tag: `// Feature: bookmark-and-business-separator, Property 10: BookmarkButton aria-pressed mirrors saved state`
    - Tag: `// Feature: bookmark-and-business-separator, Property 11: BookmarkButton aria-label reflects direction of action`
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x]* 2.3 Write property test for `BookmarkButton` optimistic update + rollback (Properties 7 & 8)
    - **Property 7: Optimistic update is immediate**
    - **Property 8: Rollback on API failure**
    - File: `test/bookmarks/BookmarkButton.property.test.tsx` (same file as 2.2)
    - For Property 7: call `toggleSave` without resolving the mock API; assert `isSaved` flipped immediately
    - For Property 8: mock API to reject; assert `savedIds` reverts to pre-call snapshot and `error` is non-null
    - Tag: `// Feature: bookmark-and-business-separator, Property 7: Optimistic update is immediate`
    - Tag: `// Feature: bookmark-and-business-separator, Property 8: Rollback on API failure`
    - **Validates: Requirements 2.2, 2.3, 2.5, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 5.2, 5.3, 6.3, 6.4**

- [x] 3. Add business name pipe separator and wire `BookmarkButton` into `PostCard`
  - [x] 3.1 Add `|` pipe separator in `PostCard` business name row
    - Locate the `authorBusinesses.slice(0, 2).map(...)` loop in `PostCard`
    - Wrap each map entry in `<React.Fragment key={b.id}>` (or `key={b.id}` on the fragment)
    - Insert `<span className="text-muted-foreground text-[10px] select-none" aria-hidden="true">|</span>` before each entry when `idx > 0`
    - Do NOT change the `slice(0, 2)` limit
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Replace any existing bookmark/save inline logic in `PostCard` with `<BookmarkButton>`
    - Import `BookmarkButton` from `components/ui/BookmarkButton`
    - Pass `targetId={post.id}`, `targetType="post"`, and appropriate `itemData` props
    - Remove any local `isSaved`, `handleSave`, or similar inline bookmark state/handlers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]* 3.3 Write property tests for PostCard business separator (Properties 1, 2 & 3)
    - **Property 1: Separator count invariant**
    - **Property 2: Separator styling invariant**
    - **Property 3: Business entry cap invariant**
    - File: `test/feed/PostCardHeader.property.test.tsx`
    - Use `fc.array(fc.record({ id: fc.string({ minLength: 1 }), business_name: fc.string() }), { minLength: 2, maxLength: 10 })` as arbitrary input
    - Assert exactly `min(N, 2) - 1` separator elements with `text-muted-foreground` class; at most 2 business name entries
    - Tag: `// Feature: bookmark-and-business-separator, Property 1: Separator count invariant`
    - Tag: `// Feature: bookmark-and-business-separator, Property 2: Separator styling invariant`
    - Tag: `// Feature: bookmark-and-business-separator, Property 3: Business entry cap invariant`
    - **Validates: Requirements 1.2, 1.3, 1.5**

  - [x]* 3.4 Write unit tests for PostCard business separator edge cases
    - File: `test/feed/PostCardHeader.unit.test.tsx`
    - Test: zero businesses → no business row, no separator
    - Test: exactly one business → one entry, no separator
    - Test: two businesses → one separator between them
    - **Validates: Requirements 1.1, 1.4**

- [x] 4. Wire `BookmarkButton` into `ProductCard`
  - [x] 4.1 Replace existing bookmark/save inline logic in `ProductCard` with `<BookmarkButton>`
    - Import `BookmarkButton` from `components/ui/BookmarkButton`
    - Pass `targetId={product.id}`, `targetType="product"`, and appropriate `itemData` props
    - Remove any local bookmark state/handlers
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Wire `BookmarkButton` into `ShowroomCard`
  - [x] 5.1 Replace existing bookmark/save inline logic in `ShowroomCard` with `<BookmarkButton>`
    - Import `BookmarkButton` from `components/ui/BookmarkButton`
    - Pass `targetId={showroom.id}`, `targetType="showroom"`, and appropriate `itemData` props
    - Remove any local bookmark state/handlers
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Wire `BookmarkButton` into `TaskCard`
  - [x] 6.1 Replace existing bookmark/save inline logic in `TaskCard` with `<BookmarkButton>`
    - Import `BookmarkButton` from `components/ui/BookmarkButton`
    - Pass `targetId={task.id}`, `targetType="task"`, and appropriate `itemData` props
    - Remove any local bookmark state/handlers
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Refactor `views/Bookmarks.tsx` to use `bookmarksSlice`
  - [x] 8.1 Remove local `saves`, `enriched`, and `loading` state from `Bookmarks.tsx`
    - Replace with `const savedIds = useAppStore(s => s.savedIds)` and `const hydrate = useAppStore(s => s.hydrate)`
    - On mount: call `hydrate()` only when `Object.keys(savedIds).length === 0`
    - Remove any `client.get('/api/saves')` call that previously lived in the view
    - Tab filtering: replace API-driven filtering with pure in-memory `Object.values(savedIds).filter(item => tab === 'all' || item.target_type === tab)`
    - Retain the error/empty state UI; wire to `useAppStore(s => s.error)` for hydration failures
    - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x]* 8.2 Write property test for Bookmarks page list filtering (Property 12)
    - **Property 12: Bookmarks page list matches store filtered by tab**
    - File: `test/bookmarks/BookmarksPage.property.test.tsx`
    - Use `fc.record({ savedIds: fc.dictionary(...), tab: fc.constantFrom('all', 'post', 'product', 'showroom', 'task') })` as arbitrary input
    - Render `Bookmarks` page with store pre-seeded; assert exactly the matching items are rendered, no extras
    - Tag: `// Feature: bookmark-and-business-separator, Property 12: Bookmarks page list matches store filtered by tab`
    - **Validates: Requirements 7.1, 7.2, 7.5**

- [x] 9. Write `bookmarksSlice` property and unit tests
  - [x]* 9.1 Write property test for `isSaved` selector (Property 4)
    - **Property 4: isSaved reflects savedIds**
    - File: `test/bookmarks/bookmarksSlice.property.test.ts`
    - Use `fc.dictionary(fc.string({ minLength: 1 }), fc.record({ target_type: fc.constantFrom('post', 'product', 'showroom', 'task') }))` to generate arbitrary `savedIds` maps
    - Assert `isSaved(targetId)` is `true` iff `targetId` is a key in `savedIds`
    - Tag: `// Feature: bookmark-and-business-separator, Property 4: isSaved reflects savedIds`
    - **Validates: Requirements 6.1**

  - [x]* 9.2 Write property test for `hydrate()` populates `savedIds` (Property 5)
    - **Property 5: Hydrate populates savedIds from API response**
    - File: `test/bookmarks/bookmarksSlice.property.test.ts`
    - Use `fc.array(fc.record({ target_id: fc.string({ minLength: 1 }), target_type: fc.constantFrom('post', 'product', 'showroom', 'task') }))` as arbitrary save records
    - Mock `GET /api/saves` to return the generated records; call `hydrate()`; assert `savedIds` has exactly one entry per record and `isSaved` returns `true` for each
    - Tag: `// Feature: bookmark-and-business-separator, Property 5: Hydrate populates savedIds from API response`
    - **Validates: Requirements 6.2**

  - [x]* 9.3 Write property test for toggle round-trip (Property 6)
    - **Property 6: Toggle round-trip restores original state**
    - File: `test/bookmarks/bookmarksSlice.property.test.ts`
    - Use `fc.record({ targetId: fc.string({ minLength: 1 }), targetType: fc.constantFrom('post', 'product', 'showroom', 'task') })` as input; mock API to resolve with correct `saved` value on each call
    - Call `toggleSave` twice; assert `savedIds` equals initial state
    - Tag: `// Feature: bookmark-and-business-separator, Property 6: Toggle round-trip restores original state`
    - **Validates: Requirements 2.2, 2.3, 3.2, 3.3, 4.2, 4.3, 5.2, 6.3**

  - [x]* 9.4 Write property test for rollback on failure (Property 8) — store level
    - **Property 8: Rollback on API failure**
    - File: `test/bookmarks/bookmarksSlice.property.test.ts`
    - Mock API to reject; call `toggleSave`; assert `savedIds` reverts to pre-call snapshot and `error` is non-null
    - Tag: `// Feature: bookmark-and-business-separator, Property 8: Rollback on API failure`
    - **Validates: Requirements 2.5, 3.4, 4.4, 5.3, 6.4**

  - [x]* 9.5 Write property test for hydrate failure preserves `savedIds` (Property 9)
    - **Property 9: Hydrate failure preserves savedIds**
    - File: `test/bookmarks/bookmarksSlice.property.test.ts`
    - Pre-seed store with arbitrary `savedIds`; mock `GET /api/saves` to reject; call `hydrate()`; assert `savedIds` unchanged and `error` is non-null
    - Tag: `// Feature: bookmark-and-business-separator, Property 9: Hydrate failure preserves savedIds`
    - **Validates: Requirements 6.6**

  - [ ]* 9.6 Write unit tests for `bookmarksSlice` edge cases
    - File: `test/bookmarks/bookmarksSlice.property.test.ts`
    - Test: `Bookmarks page mounts with empty store → hydrate() called once` (Requirement 6.5)
    - Test: `Bookmarks page mounts with pre-hydrated store → no additional API call, no spinner` (Requirement 7.4)
    - Test: `in-flight button disabled → no duplicate toggleSave call` (Requirement 2.4)
    - **Validates: Requirements 2.4, 6.5, 7.4**

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Tasks 4 (`ProductCard`), 5 (`ShowroomCard`), and 6 (`TaskCard`) are independent of each other after `BookmarkButton` exists (task 2) and can be executed in parallel
- Tasks 3 (PostCard separator + bookmark wiring) combines two concerns deliberately: the separator is presentational-only and the bookmark wiring is structural — both touch the same file
- `bookmarksSlice` follows the identical `StateCreator` pattern as `cartSlice` — snapshot → optimistic → API → reconcile/rollback
- `savedIds` is intentionally excluded from `partialize` in `store/index.ts` — bookmark state is always freshly loaded per session
- Property-based tests use Vitest + `fast-check` (already in `devDependencies`), with a minimum of 100 runs per property
- All property test files must include the tag comment above each `fc.assert()` call: `// Feature: bookmark-and-business-separator, Property N: Title`
- Test file layout follows the design document: `test/bookmarks/` for store/component tests, `test/feed/` for PostCard tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "9.1", "9.2"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.1", "3.2", "4.1", "5.1", "6.1", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 4, "tasks": ["3.3", "3.4", "8.1"] },
    { "id": 5, "tasks": ["8.2"] }
  ]
}
```
