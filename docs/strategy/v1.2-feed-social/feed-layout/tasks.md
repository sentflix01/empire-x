# Feed Layout & Performance — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Backend: Cursor-Based Pagination

- [ ] Update `GET /api/posts` to support cursor pagination
  ```
  GET /api/posts?limit=20&cursor=2026-08-01T10:00:00Z
  ```
  - `cursor` = `created_at` of the last post from previous page (ISO string)
  - Query: `WHERE created_at < $cursor ORDER BY created_at DESC LIMIT $limit`
  - Response includes: `posts[]`, `nextCursor` (last post's `created_at` or null if no more)
- [ ] Keep `offset` support for backwards compatibility during transition
- [ ] Add index on `posts(created_at DESC)` if not already present

---

## Step 2 — Frontend: useInfiniteQuery

- [ ] Refactor feed page to use `useInfiniteQuery` instead of `useQuery`
  ```ts
  useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => fetchPosts({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
  ```
- [ ] Flatten pages: `data.pages.flatMap(p => p.posts)`
- [ ] Add `IntersectionObserver` sentinel div at bottom of list
  - When sentinel enters viewport → call `fetchNextPage()`
  - Show `SkeletonPostCard` × 3 while `isFetchingNextPage`
- [ ] Show "You're all caught up!" empty state when `!hasNextPage`

---

## Step 3 — PostCard Component Polish

- [ ] Audit `PostCard.tsx` against the checklist in audit.md
- [ ] Author avatar: 40px circle, links to `/profile/[author_id]`
- [ ] Timestamp: `formatDistanceToNow` from `date-fns` + `title={absoluteDate}`
- [ ] Content: clamp to 4 lines with "See more" button that expands inline
- [ ] Hashtags in content: render as `<Link href="/hashtag/[tag]">` — blue, clickable
- [ ] Like button: optimistic toggle with `useMutation`
  - Immediate UI update, rollback on error
  - Heart fill animation on like (scale 1 → 1.2 → 1, color change)
- [ ] Comment count: clicking opens inline comment section (not a new page)
- [ ] Share button: bottom sheet with: Copy Link, Share on WhatsApp, Share on Telegram
- [ ] Save button: optimistic bookmark toggle
- [ ] 3-dot menu (own post): Edit, Delete with confirm dialog
- [ ] 3-dot menu (other's post): Report with reason selection
- [ ] Wrap entire component in `React.memo`

---

## Step 4 — Feed Page Layout

- [ ] Stories row at top (horizontal scroll, 80px circles)
- [ ] Post composer card below stories ("What's on your mind?")
- [ ] Feed list below composer
- [ ] Sticky "New posts available — tap to refresh" banner when WebSocket pushes new posts
- [ ] Pull-to-refresh on mobile (optional: `react-pull-to-refresh`)

---

## Step 5 — Verify

- [ ] Scroll to bottom → new posts load automatically
- [ ] No duplicate posts while scrolling
- [ ] Like/unlike toggles instantly (no loading wait)
- [ ] Feed loads in < 1s on fast connection (Network tab)
- [ ] Each PostCard renders in < 16ms (no jank, 60fps scroll)
