# Product Listing Page — Tasks

## Status: 🔴 Not Started

---

## Step 1 — ProductCard Component

- [ ] Audit existing product card component
- [ ] Image: `<Image>` component, aspect-ratio 4:3 or 1:1, `object-cover`
- [ ] Wishlist heart: top-right corner, `absolute`, optimistic toggle
  - Filled heart (red) = wishlisted, outline = not wishlisted
  - `useMutation` with optimistic update + rollback
- [ ] Sold out overlay: semi-transparent dark overlay + "Sold Out" text when stock = 0
- [ ] Price: `toLocaleString('am-ET')` formatted + "ETB"
- [ ] Rating: `<StarRating rating={4.2} count={24} />` component
- [ ] Seller name: small, muted, links to `/profile/[seller_id]`
- [ ] Wrap in `React.memo`

---

## Step 2 — Filter System

- [ ] Create `frontend-next/components/marketplace/ProductFilters.tsx`
  - Category chips (scrollable horizontal on mobile, grid on desktop)
  - Price range: two inputs (min ETB / max ETB)
  - Rating filter: radio buttons (Any / 3★+ / 4★+)
  - Condition: checkbox (New / Used)
  - In stock only: toggle switch
  - "Apply Filters" button + "Clear All" link
- [ ] On desktop: render as sticky left sidebar
- [ ] On mobile: trigger from "Filter" button → opens bottom sheet
- [ ] Active filter count badge on "Filter" button when filters applied

---

## Step 3 — Sort Dropdown

- [ ] Sort select/dropdown component above the grid
- [ ] Options: Newest, Price ↑, Price ↓, Most Popular, Highest Rated
- [ ] Sort param sent to `GET /api/products?sort=price_asc`
- [ ] Backend must support these sort params (audit and add if missing)

---

## Step 4 — Infinite Scroll

- [ ] Refactor to `useInfiniteQuery` (same cursor pattern as feed)
- [ ] Sentinel div at bottom triggers `fetchNextPage`
- [ ] Show 8× `SkeletonCard` on initial load
- [ ] Show 4× `SkeletonCard` while fetching next page
- [ ] "No more products" text when `!hasNextPage`

---

## Step 5 — Active Filter Display

- [ ] Show active filters as dismissible chips above the grid
- [ ] Each chip: "Category: Shop × " — clicking × removes that filter
- [ ] "Clear all filters" link when any filter is active

---

## Step 6 — Result Count

- [ ] Show "Showing 24 products" above grid
- [ ] Updates when filters change

---

## Step 7 — Verify

- [ ] Grid renders 2 columns at 375px, 3 at 768px, 4 at 1280px
- [ ] Filters work correctly and update grid
- [ ] Wishlist toggle persists across page refresh
- [ ] Sold out products show overlay
- [ ] Sort changes order correctly
