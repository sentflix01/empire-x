# feat: bookmarks end-to-end, settings popup, UI fixes

> **Type:** Feature + Bugfix · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## 1. What was this task?

A batch of UI and functional improvements across four areas:

1. **Bookmark system** — end-to-end fix (broken DB constraint, isolated state, enriched API, double-click UX)
2. **Settings popup** — new sidebar footer button consolidating Language, Theme, Demo/Real, Account Settings, Analytics, Admin Panel
3. **Header cleanup** — removed Language, Demo/Real, Theme toggles from header; added Bookmark shortcut
4. **UI layout fixes** — solid modal backgrounds (Settings popup, Mewacho modals), profile toggle overlay, `/api/trending/warm` 500 error, nested `<a>` hydration error in BusinessCard, BusinessProfile sticky navbar z-index overlap

## 2. Why does it exist?

**Bookmarks:** The bookmark button on business showroom cards was sending `target_type: 'business'` which violated the DB `CHECK` constraint (`IN ('post','product','showroom','task')`). The local component used isolated `useState` so saves never appeared on the Bookmarks page. The `GET /api/saves` endpoint returned bare rows with no title or thumbnail — Bookmarks page showed "Untitled" for everything.

**Settings popup:** Language, Theme, and Demo/Real toggles were scattered across the header taking up space. Consolidating them into a Settings popup in the sidebar footer creates a cleaner header and a single place to manage app preferences.

**Header cleanup:** After settings moved to the popup, the header was decluttered. The bookmark header shortcut provides fast access to `/bookmarks` from anywhere.

**Showroom builder section missing:** `save_showroom` was added to `SECTION_TYPES` in `builderSections.ts` but not to the `SECTION_GROUPS` array in `ShowroomCreate.tsx` which drives the builder UI — so it never appeared.

**Double-click bookmark:** Previous single-click behaviour caused accidental saves. Double-click is intentional and gives users clear control.

## 3. What was done?

- **13 files changed**

### Backend

- `backend/routes/saves.ts` — `GET /api/saves` now JOINs to `posts`, `products`, `showrooms`, `tasks` to return `title` and `thumbnail_url`. JSON array parsing extracts the first product image URL. Bookmarks page now shows real titles.
- `backend/routes/trending.ts` — Fixed `SELECT DISTINCT ... ORDER BY created_at` bug: `created_at` was not in the SELECT list, violating PostgreSQL's DISTINCT + ORDER BY rule → `500` on `/api/trending/warm`. Added `created_at` to SELECT in both the warm and main routes.

### Frontend — Bookmark system

- `frontend-next/components/ui/BookmarkButton.tsx` — **Complete rewrite**:
  - Fully independent local state (no global Zustand subscription → no cross-card blinks)
  - Reads initial state from store snapshot on mount; subscribes once for hydration sync
  - **Double-click to toggle**: 350ms detection window. Single click does nothing.
  - Uses **refs** (`savedRef`, `isPendingRef`) to avoid stale closure bugs in `doToggle` — the root cause of the previous "clicks do nothing" bug where `useCallback` dependencies were incorrect
  - Toast confirms save/remove
- `frontend-next/components/feed/BusinessShowroomFeed.tsx` — Removed broken local `BookmarkButton` component (hardcoded `target_type: 'business'` → DB constraint violation). Both usages replaced with `SharedBookmarkButton` using `targetType="showroom"` and business name as title
- `backend/routes/saves.ts` — Enriched API (see above)
- `frontend-next/store/bookmarksSlice.ts` — `hydrate()` now reads `record.title` and `record.thumbnail_url` from enriched API response
- `frontend-next/views/Bookmarks.tsx` — Updated showroom link target
- `frontend-next/components/layout/AppLayout.tsx` — Calls `hydrateBookmarks()` on user mount so bookmark state is pre-loaded

### Frontend — Settings popup

- `frontend-next/components/layout/AppLayout.tsx`:
  - Added `Settings` icon import
  - Added `settingsOpen` state
  - Replaced single Log out footer button with `[ Settings ] [ Log out ]` side-by-side
  - Settings popup panel (renders above footer, `z-50`, solid `hsl(var(--card))` background with `isolation: isolate`): Language toggle (inline), Theme toggle (inline), Demo/Real toggle (inline), Account Settings link, Analytics link, Admin Panel link (admin only)
  - Removed Demo/Real, Dark/Light mode, and Language buttons from the header
  - Replaced Language button in header with Bookmark shortcut (`/bookmarks`)
  - `BookmarkButton` Bookmark shortcut added to header between Notifications and Avatar

### Frontend — Builder section

- `frontend-next/lib/builderSections.ts` — Added `save_showroom` Pro section (key, label, icon, tier, tierLabel, tierFeatures, fields: saveTitle + saveDesc)
- `frontend-next/views/ShowroomCreate.tsx` — Added `save_showroom` to the Footer group's `keys` array; also added `inventory_catalog` and `live_location_tracking` to Body group (both were in `SECTION_TYPES` but missing from `SECTION_GROUPS`)
- `frontend-next/components/showroom/SectionRenderer.tsx` — Added `save_showroom` section renderer: centered bookmark icon, title, description, `BookmarkButton` wired to `profile.id` with `targetType="showroom"`

### Frontend — UI layout fixes

- `frontend-next/components/profile/BusinessProfile.tsx` — Removed `md:sticky top-14 z-30` from mini-website navbar — it was floating on top of contact section content below
- `frontend-next/views/Profile.tsx` — Moved `Personal | Business` toggle out of `absolute top-3 right-3 z-10` inside cover photo; now sits in the flex row between avatar and Edit buttons — no more z-index overflow onto showroom cards below
- `frontend-next/views/Mewacho.tsx` — Create Group and Join Group modal backgrounds changed from `bg-card` (CSS class not rendering solid) to `style={{ backgroundColor: 'hsl(var(--card))', isolation: 'isolate' }}` with `bg-black/60` overlay; prevents page content showing through
- `frontend-next/views/Businesses.tsx` — Fixed `<a>` inside `<a>` hydration error in `BusinessCard`: inner `<Link>` "View Business" replaced with `<span>` (outer card `<Link>` already navigates to the same destination)

## 4. Verification

- TypeScript (frontend): `npx tsc --noEmit --skipLibCheck` → **0 errors**
- TypeScript (backend): `npx tsc --noEmit --skipLibCheck` → **0 errors**
- `/api/trending/warm` → **200 OK** `{ warmed: true }` (was 500)
- `/api/saves` toggle cycle → **200 `{ saved: true }` → 200 `{ saved: false }`** ✓
- `/api/saves` enriched list → returns `title` and `thumbnail_url` columns ✓
- No stale `setActiveView` or cross-bookmark state issues

---

*Log entry authored by Kiro — committed to branch `feat/personal-business-toggle-auth-port-fixes`.*
