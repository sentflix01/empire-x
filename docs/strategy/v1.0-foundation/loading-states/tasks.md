# Loading States — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Build Shared Skeleton Components

- [ ] Create `frontend-next/components/ui/skeletons/SkeletonCard.tsx`
  - Rectangular block with avatar placeholder + 2 text lines
  - Props: `count?: number` (renders N skeletons in a grid)
- [ ] Create `frontend-next/components/ui/skeletons/SkeletonPostCard.tsx`
  - Avatar circle + name line + content block + action bar
- [ ] Create `frontend-next/components/ui/skeletons/SkeletonListItem.tsx`
  - Small avatar + two text lines (for messages, notifications)
- [ ] Create `frontend-next/components/ui/skeletons/SkeletonProfile.tsx`
  - Cover image block + avatar circle + name + headline + stats row
- [ ] Create `frontend-next/components/ui/skeletons/SkeletonTable.tsx`
  - N rows × M columns of text blocks
- [ ] Create `frontend-next/components/ui/skeletons/SkeletonText.tsx`
  - Variable width text line(s), props: `lines?: number`, `width?: string`
- [ ] Export all from `frontend-next/components/ui/skeletons/index.ts`
- [ ] All skeletons: dark mode compatible, `animate-pulse`, `aria-busy="true"`

---

## Step 2 — Apply to Every Data-Fetching Page

- [ ] `/feed` — show 5× `SkeletonPostCard` while posts load
- [ ] `/marketplace` — show 8× `SkeletonCard` while products load
- [ ] `/tasks` — show 6× `SkeletonCard` while tasks load
- [ ] `/messages` — show 6× `SkeletonListItem` while conversations load
- [ ] `/notifications` — show 5× `SkeletonListItem` while notifications load
- [ ] `/profile/[id]` — show `SkeletonProfile` while profile loads
- [ ] `/showrooms` — show 6× `SkeletonCard` while showrooms load
- [ ] `/search` — show skeletons matching last result type on re-query
- [ ] `/orders` — show 5× `SkeletonListItem` while orders load
- [ ] `/wallet` — show `SkeletonText` for balance + 4× `SkeletonListItem` for transactions
- [ ] `/jobs` — show 6× `SkeletonCard` while jobs load
- [ ] `/events` — show 6× `SkeletonCard` while events load
- [ ] `/courses` — show 6× `SkeletonCard` while courses load
- [ ] `/nearby` — show overlay skeleton while map tiles + pins load
- [ ] `/bookmarks` — show 6× appropriate skeleton while saves load
- [ ] `/friends` — show 6× `SkeletonCard` while friends/suggestions load
- [ ] `/referral` — show `SkeletonText` while referral data loads
- [ ] `/analytics` — show `SkeletonCard` for each chart panel
- [ ] `/showroom/[slug]` (public) — show `SkeletonProfile` + section skeletons

---

## Step 3 — TanStack Query Integration

- [ ] Confirm all pages use `isLoading` from `useQuery` to gate skeleton display
- [ ] Replace any `loading` boolean state managed manually with TanStack `isLoading`
- [ ] Use `isFetching` (not just `isLoading`) to show skeleton on refetch too
- [ ] Verify `staleTime` is set appropriately per query (feed: 30s, profile: 60s, wallet: 10s)

---

## Step 4 — Test & Verify

- [ ] Use Chrome DevTools → Network → Slow 3G to verify skeletons appear on every page
- [ ] Verify no layout shift when skeleton transitions to real content
- [ ] Verify skeletons render correctly in dark mode
- [ ] Verify `aria-busy` attribute is present during loading
