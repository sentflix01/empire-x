# Mobile Responsiveness — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Audit Every Page at 375px

Go through each page in Chrome DevTools at 375px width and log issues:

- [ ] `/feed` — post cards, composer, story row
- [ ] `/marketplace` — product grid, filters
- [ ] `/tasks` — task cards, map toggle
- [ ] `/messages` — conversation list, chat room, input bar
- [ ] `/notifications` — notification items
- [ ] `/profile/[id]` — cover, avatar, stats, tabs
- [ ] `/showrooms` — showroom cards
- [ ] `/showroom/[slug]` — public showroom sections
- [ ] `/search` — search bar, result tabs, filters
- [ ] `/orders` — order list, order detail
- [ ] `/wallet` — balance card, transaction list
- [ ] `/jobs` — job cards, apply flow
- [ ] `/events` — event cards, event detail
- [ ] `/courses` — course cards, course detail
- [ ] `/nearby` — map, search overlay, pin popups
- [ ] `/cart` — cart items, summary
- [ ] `/bookmarks` — saved items
- [ ] `/friends` — friend cards, suggestions
- [ ] `/referral` — referral card, share buttons
- [ ] `/analytics` — charts, metric cards
- [ ] `/admin` — tables, moderation panels
- [ ] `/settings` — settings list
- [ ] `/account` — account panels

---

## Step 2 — Fix Common Issues

### Navigation
- [ ] Verify bottom nav bar is fixed and visible at all times on mobile
- [ ] Verify sidebar (if any) uses a slide-over sheet on mobile, not a push layout
- [ ] Verify top header doesn't overflow on small screens

### Tables → Cards
- [ ] Any `<table>` that appears on mobile must be converted to card-style list view
- [ ] Orders table → order cards at `< md`
- [ ] Admin tables → stackable rows or horizontal scroll with `overflow-x-auto`

### Tap Targets
- [ ] All buttons ≥ 44×44px (add `min-h-[44px] min-w-[44px]` where needed)
- [ ] All links in lists have padding to hit 44px touch area
- [ ] Bottom sheet close button is large enough

### Typography
- [ ] Minimum body font size: 14px (no `text-xs` for readable content)
- [ ] Inputs: 16px font size minimum (prevents iOS auto-zoom)
  - All `<input>` and `<textarea>` must have `text-base` or `text-[16px]`

### Modals & Sheets
- [ ] All modals on mobile become bottom sheets (slide up from bottom)
- [ ] Bottom sheets max-height: 90vh with scroll inside
- [ ] Drag handle visible on bottom sheets

### Forms
- [ ] All forms single-column on mobile
- [ ] Label above input (not beside) on mobile
- [ ] Sufficient spacing between form fields (min `gap-4`)

---

## Step 3 — Verify

- [ ] Run through all pages again at 375px after fixes
- [ ] Test on a real device (Android + iOS) if available
- [ ] Verify no page causes horizontal scroll
- [ ] Verify all interactive elements are reachable with thumb (bottom-heavy layout)
