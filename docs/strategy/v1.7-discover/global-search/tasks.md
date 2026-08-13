# Global Search — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Search Input with Instant Suggestions

- [ ] Create `frontend-next/components/search/SearchBar.tsx`
  - Controlled input with 300ms debounce
  - On type → `GET /api/search?q=xxx&limit=5` for quick suggestions
  - Suggestions dropdown below input:
    - "Recent" section: chips from localStorage (`search_history` key)
    - "Quick results" section: first 3 users + first 3 products matching query
  - Each suggestion: icon + label + type badge
  - Clicking suggestion: fills input + submits search
  - Keyboard: ↑↓ arrow keys navigate suggestions, Enter selects
  - Escape: closes dropdown

---

## Step 2 — Recent Search History

- [ ] On search submit: save query to `localStorage['search_history']` (max 8, dedup)
- [ ] Show recents as dismissible chips: "coffee ×"
- [ ] "Clear all" button at bottom of recent searches
- [ ] Recents shown when search input is focused + empty

---

## Step 3 — Results Page Tabs

- [ ] Tab bar: All / People / Products / Showrooms / Posts / Tasks / Jobs / Events / Hashtags
- [ ] "All" tab: mixed results, 3 per category, "See all [category]" links
- [ ] Each tab: full paginated results for that entity type
- [ ] Tab count badge: "People (12)" — fetched counts from API
- [ ] Backend: add `type` filter param: `GET /api/search?q=xxx&type=users`

---

## Step 4 — Result Cards per Type

- [ ] **People**: avatar + display name + headline + follow button
- [ ] **Products**: thumbnail + title + price + seller name
- [ ] **Showrooms**: logo + name + category + view count
- [ ] **Posts**: author avatar + name + content excerpt + like count
- [ ] **Tasks**: type badge + title + payment + location
- [ ] **Jobs**: title + company + type + salary range
- [ ] **Events**: cover + title + date + ticket price
- [ ] **Hashtags**: `#tag` + post count

---

## Step 5 — Match Highlighting

- [ ] Create `frontend-next/lib/highlightMatch.ts`
  ```ts
  // Wraps query match in <mark> tag
  export function highlightMatch(text: string, query: string): string
  ```
- [ ] Apply to: product titles, showroom names, user names, post excerpts

---

## Step 6 — Backend Improvements

- [ ] Add `type` filter to `GET /api/search` (already returns all — just filter server-side)
- [ ] Add `count_only=true` param for tab counts (lightweight query)
- [ ] Add GIN index on tasks/jobs/events titles if not present:
  ```sql
  CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', title));
  CREATE INDEX idx_jobs_search ON jobs USING gin(to_tsvector('english', title));
  CREATE INDEX idx_events_search ON events USING gin(to_tsvector('english', title));
  ```

---

## Step 7 — Verify

- [ ] Typing "coffee" shows suggestions in < 300ms
- [ ] Full results load in < 800ms
- [ ] All 8 tabs show correct results
- [ ] Recent searches persist across page refresh
- [ ] Clear history removes all recents
- [ ] Empty state shows on zero results
- [ ] Mobile keyboard dismisses after search submit
