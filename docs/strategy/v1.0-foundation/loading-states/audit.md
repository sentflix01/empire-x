# Loading States — Audit

## Current State

| Page | Has Skeleton | Has Spinner | Has Nothing | Notes |
|------|-------------|-------------|-------------|-------|
| Feed (`/feed`) | Partial | No | — | Some skeleton but inconsistent |
| Marketplace (`/marketplace`) | Unknown | Unknown | — | Needs review |
| Tasks (`/tasks`) | Unknown | Unknown | — | Needs review |
| Messages (`/messages`) | Unknown | Unknown | — | Chat list likely has none |
| Notifications (`/notifications`) | Unknown | Unknown | — | Likely blank flash |
| Profile (`/profile/[id]`) | Unknown | Unknown | — | Avatar + name likely flash |
| Showrooms (`/showrooms`) | Unknown | Unknown | — | Card grid likely flashes |
| Search (`/search`) | Unknown | Unknown | — | Results flash |
| Orders (`/orders`) | Unknown | Unknown | — | Table flash |
| Wallet (`/wallet`) | Unknown | Unknown | — | Balance flash |
| Jobs (`/jobs`) | Unknown | Unknown | — | List flash |
| Events (`/events`) | Unknown | Unknown | — | Card flash |
| Courses (`/courses`) | Unknown | Unknown | — | Card flash |
| Nearby map (`/nearby`) | Unknown | Unknown | — | Map flash |

## Target State (Global Standard)

Every page that fetches remote data must show a **skeleton loader** — not a spinner, not a blank screen.

### Skeleton Rules
- Match the shape of the real content exactly (card → card skeleton, list → list skeleton)
- Use `animate-pulse` (Tailwind) or Framer Motion fade
- Show the correct number of skeleton items (3–5 for lists, 1 for detail pages)
- Skeleton disappears the moment real data arrives — no flash
- Skeletons must be accessible: `aria-busy="true"` on the container, `aria-label="Loading..."` on the region

### Components Needed
- `SkeletonCard` — for product/showroom/course/event cards
- `SkeletonPostCard` — for feed posts
- `SkeletonListItem` — for messages, notifications, orders
- `SkeletonProfile` — for profile header (avatar + name + stats)
- `SkeletonTable` — for admin/orders table rows
- `SkeletonText` — for paragraph blocks
