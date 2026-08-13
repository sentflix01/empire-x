# Empty States — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Build the EmptyState Component

- [ ] Create `frontend-next/components/ui/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon: React.ReactNode        // Lucide icon or SVG illustration
  title: string                // Primary message
  description?: string         // Secondary message
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}
```

- [ ] Centered layout: icon (48px) → title (text-lg font-semibold) → description (text-sm text-muted) → CTA button
- [ ] Icon wrapper: subtle background circle (bg-muted rounded-full p-4)
- [ ] CTA uses primary button style
- [ ] Full dark mode support
- [ ] `aria-label` on the container region

---

## Step 2 — Apply to Every Page

- [ ] **Feed** — when `posts.length === 0`
  - Icon: `Newspaper` or `Rss`
  - Title: "Your feed is quiet"
  - Desc: "Follow people and businesses to see their posts here."
  - CTA: "Discover people" → `/explore`

- [ ] **Marketplace** — when `products.length === 0`
  - Icon: `ShoppingBag`
  - Title: "No products yet"
  - Desc: "Be the first seller — list something today."
  - CTA: "List a product" → `/products/new`

- [ ] **Tasks** — when `tasks.length === 0`
  - Icon: `ClipboardList`
  - Title: "No tasks open"
  - Desc: "Post something you need help with and get bids fast."
  - CTA: "Post a task" → `/tasks/new`

- [ ] **Messages** — when `conversations.length === 0`
  - Icon: `MessageCircle`
  - Title: "No messages yet"
  - Desc: "Start a conversation with someone in the community."
  - CTA: "Find people" → `/friends`

- [ ] **Notifications** — when `notifications.length === 0`
  - Icon: `Bell`
  - Title: "All caught up!"
  - Desc: "No new notifications right now."
  - CTA: none

- [ ] **Orders** — when `orders.length === 0`
  - Icon: `Package`
  - Title: "No orders yet"
  - Desc: "Browse the marketplace and place your first order."
  - CTA: "Browse marketplace" → `/marketplace`

- [ ] **Bookmarks** — when `saves.length === 0`
  - Icon: `Bookmark`
  - Title: "Nothing saved yet"
  - Desc: "Bookmark posts and products to find them here later."
  - CTA: "Browse feed" → `/feed`

- [ ] **Search — no results** — when `results.length === 0`
  - Icon: `SearchX`
  - Title: `No results for "${query}"`
  - Desc: "Try different keywords or browse categories."
  - CTA: "Clear search" → clears input

- [ ] **Jobs** — when `jobs.length === 0`
  - Icon: `Briefcase`
  - Title: "No jobs posted yet"
  - Desc: "Post a job and find talented people in Ethiopia."
  - CTA: "Post a job" → `/jobs/new`

- [ ] **Events** — when `events.length === 0`
  - Icon: `Calendar`
  - Title: "No upcoming events"
  - Desc: "Create an event and bring the community together."
  - CTA: "Create event" → `/events/new`

- [ ] **Courses** — when `courses.length === 0`
  - Icon: `GraduationCap`
  - Title: "No courses yet"
  - Desc: "Share your knowledge and earn by teaching others."
  - CTA: "Create a course" → `/courses/new`

- [ ] **Cart** — when `items.length === 0`
  - Icon: `ShoppingCart`
  - Title: "Your cart is empty"
  - Desc: "Browse the marketplace and add items to your cart."
  - CTA: "Shop now" → `/marketplace`

- [ ] **Friends/Suggestions** — when `users.length === 0`
  - Icon: `Users`
  - Title: "No suggestions right now"
  - Desc: "Come back soon — we'll find great people for you to connect with."
  - CTA: none

- [ ] **Wallet transactions** — when `transactions.length === 0`
  - Icon: `Wallet`
  - Title: "No transactions yet"
  - Desc: "Top up your wallet to start buying, selling, and paying."
  - CTA: "Top up wallet" → opens top-up modal

---

## Step 3 — Verify

- [ ] Every empty state renders correctly in light and dark mode
- [ ] CTA links route correctly
- [ ] Empty states do not flash before data loads (skeleton → empty state, not blank → empty state)
- [ ] Text fits correctly at 375px screen width without overflow
