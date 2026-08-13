# Implementation Order

> This document tells you exactly what to work on next, in what order, and why.
> Follow this sequence. Skipping versions creates technical debt that multiplies.

---

## The Golden Rule

> **Never add a new feature to a broken foundation.**
> Fix what exists before building what's new.

---

## Phase 1 — Make It Trustworthy (v1.0)

**Why first:** Users judge an app in 3 seconds. Blank screens, crashes, and broken mobile layouts destroy trust before the user even sees your best features.

```
v1.0 Checklist (complete ALL before moving to v1.1):
─────────────────────────────────────────────────────
□ Skeleton loaders on every data-fetching page
□ Empty states on every list/collection page
□ Error states with retry on every API call
□ OfflineBanner component in root layout
□ All form inputs use 16px font (iOS zoom fix)
□ All pages tested at 375px — no horizontal scroll
□ All tap targets ≥ 44×44px
□ No page-level crash without graceful recovery UI
```

**Estimated time:** 4–6 days  
**Who is affected:** Every user, every session

---

## Phase 2 — Make It Sticky (v1.1 + v1.2)

**Why second:** Once the app is trustworthy, new users must convert and return. Onboarding + the social feed are the two highest-retention investments.

```
v1.1 Checklist:
─────────────────────────────────────────────────────
□ OTP input: auto-advance digits, auto-submit on 6th
□ Onboarding wizard: 3 steps (name → interests → account type)
□ Profile setup: avatar upload, headline, location
□ Google OAuth end-to-end tested
□ Session persists across page refresh

v1.2 Checklist:
─────────────────────────────────────────────────────
□ Feed infinite scroll (cursor-based, no duplicates)
□ Like/unlike optimistic update (instant UI, no wait)
□ Post composer: text + image + hashtag support
□ Stories bar + story viewer with progress bar
□ Follow/unfollow optimistic update
□ Real-time comment count via WebSocket
□ Hashtag pages showing all posts for that tag
```

**Estimated time:** 6–8 days  
**Who is affected:** All new users, daily active users

---

## Phase 3 — Make It Valuable (v1.3 → v1.5)

**Why third:** After users are engaged socially, they need the commerce and service layer to create real economic value on the platform.

```
v1.3 Marketplace:
─────────────────────────────────────────────────────
□ Product cards: image, title, price, rating, seller
□ Filters: category, price range, location, condition
□ Product detail: image gallery, variants, reviews
□ Cart: add/remove/quantity, optimistic updates
□ Checkout: Stripe end-to-end tested
□ Order tracking: delivery timeline component
□ Wishlist heart on all product cards

v1.4 Showrooms:
─────────────────────────────────────────────────────
□ Builder live preview (changes visible instantly)
□ All 25+ section types render on mobile
□ Public showroom: SSR, Open Graph meta, share button
□ Showroom analytics: views, top sections

v1.5 Tasks:
─────────────────────────────────────────────────────
□ Task board with filters
□ Task creation 4-step flow with map pin location
□ Bid submission and acceptance flow
□ Task completion + wallet payment release
```

**Estimated time:** 10–14 days  
**Who is affected:** Buyers, sellers, service seekers

---

## Phase 4 — Make It Connected (v1.6 + v1.7)

**Why fourth:** Real-time communication and discovery are the glue that holds the app together. Every feature works better when users can find and talk to each other.

```
v1.6 Messaging:
─────────────────────────────────────────────────────
□ Message delivery < 500ms
□ Read receipts (✓ → ✓✓ → blue ✓✓)
□ Typing indicator < 300ms
□ Presence: online now / last seen
□ Reply-quote, edit, delete messages
□ Image messages inline
□ Group chat with admin controls

v1.7 Discover:
─────────────────────────────────────────────────────
□ Search: instant suggestions while typing (300ms debounce)
□ Search covers all entity types
□ Recent searches saved locally
□ Trending: top hashtags, posts, showrooms (cached 5min)
□ Nearby map: pins + clusters + profile peek
□ People suggestions with dismiss
```

**Estimated time:** 8–10 days  
**Who is affected:** All users daily

---

## Phase 5 — Make It Complete (v1.8 + v1.9)

**Why fifth:** Jobs, events, courses, and wallet complete the superapp value proposition. These sections turn Halehame from "the Ethiopian social app" into "the app you need for your professional and financial life."

```
v1.8 Jobs / Events / Courses:
─────────────────────────────────────────────────────
□ Job board with one-tap apply
□ Application status tracking
□ Event detail with ticket purchase
□ Course detail with lesson player
□ Progress tracking per enrolled course

v1.9 Wallet & Payments:
─────────────────────────────────────────────────────
□ Balance visible in nav at all times
□ Transaction history with filter
□ Top-up via Stripe (tested end-to-end)
□ Top-up via Chapa (Telebirr/CBE)
□ Withdrawal flow with status tracking
□ Referral points redeemable at checkout
□ PDF invoice for every completed order
```

**Estimated time:** 8–10 days  
**Who is affected:** Job seekers, employers, learners, all buyers/sellers

---

## Phase 6 — Make It Fast & Inclusive (v2.0 + v2.1)

**Why sixth:** Performance and accessibility are not optional after launch — but they're most effective when applied to a stable, feature-complete product.

```
v2.0 Performance & PWA:
─────────────────────────────────────────────────────
□ Lighthouse score ≥ 90 on key pages
□ All images: Next.js <Image>, WebP, blur placeholder
□ Heavy libs (Leaflet, Recharts) dynamically imported
□ PWA manifest + splash screen + standalone mode
□ Offline page when no connection

v2.1 Accessibility & i18n:
─────────────────────────────────────────────────────
□ All inputs have labels
□ All images have alt text
□ Keyboard navigation works on all interactive elements
□ Focus management in modals
□ Amharic translation complete and reviewed
□ Language switcher in settings
```

**Estimated time:** 6–8 days  
**Who is affected:** All users (performance = everyone, i18n = Amharic speakers)

---

## Phase 7 — Make It Intelligent (v2.2 + v2.3)

**Why seventh:** Once the product is stable and complete, add intelligence on top of it.

```
v2.2 Admin & Analytics:
─────────────────────────────────────────────────────
□ Admin dashboard with key platform metrics
□ Moderation queue (reported content)
□ Feature flag UI (no redeploy to toggle)
□ Seller analytics: views, revenue, top products

v2.3 AI & Intelligence:
─────────────────────────────────────────────────────
□ AI assistant: session memory, suggested prompts
□ AI product descriptions: < 3s response
□ Feed ranking: personalized (feature-flagged, % rollout)
□ Business AI insights: actionable recommendations
```

**Estimated time:** 6–8 days  
**Who is affected:** Admins, sellers, all users (AI assistant)

---

## Phase 8 — Open the Platform (v2.4)

**Why eighth:** Once the product is proven, open it to the world. This is the
Telegram move — turning Halehame from an app into infrastructure.

```
v2.4 Developer Platform:
─────────────────────────────────────────────────────
□ API key system (any developer can access the API)
□ Webhook system (any system receives Halehame events)
□ OAuth 2.0 ("Login with Halehame" for external sites)
□ Showroom embed widget (one line of code)
□ Developer dashboard (key management, webhook logs)
□ API documentation (OpenAPI spec, interactive playground)
□ Integration marketplace (Zapier, Shopify, WhatsApp, etc.)
□ Revenue sharing program for developers
```

**Estimated time:** 3–4 weeks  
**Who is affected:** Developers worldwide, all businesses on the platform

---

## Phase 9 — Scale & Growth (v3.0)

**Why last:** Scale infrastructure and expand to new markets only after the
product-market fit is proven and the developer platform is live.

```
v3.0 Scale & Growth:
─────────────────────────────────────────────────────
□ React Native mobile app (Expo)
□ Multi-currency wallet (KES, NGN)
□ Promoted posts system
□ Subscription tiers
□ Community groups feature
```

**Estimated time:** 30–60 days  
**Who is affected:** New markets, power users

---

## Progress Tracker

| Version | Status | Started | Completed |
|---------|--------|---------|-----------|
| v1.0 — Foundation | 🔴 Not Started | — | — |
| v1.1 — Onboarding | 🔴 Not Started | — | — |
| v1.2 — Feed & Social | 🔴 Not Started | — | — |
| v1.3 — Marketplace | 🔴 Not Started | — | — |
| v1.4 — Showrooms | 🔴 Not Started | — | — |
| v1.5 — Tasks | 🔴 Not Started | — | — |
| v1.6 — Messaging | 🔴 Not Started | — | — |
| v1.7 — Discover | 🔴 Not Started | — | — |
| v1.8 — Jobs/Events/Courses | 🔴 Not Started | — | — |
| v1.9 — Wallet & Payments | 🔴 Not Started | — | — |
| v2.0 — Performance & PWA | 🔴 Not Started | — | — |
| v2.1 — Accessibility & i18n | 🔴 Not Started | — | — |
| v2.2 — Admin & Analytics | 🔴 Not Started | — | — |
| v2.3 — AI & Intelligence | 🔴 Not Started | — | — |
| v2.4 — Developer Platform | 🔴 Not Started | — | — |
| v3.0 — Scale & Growth | 🔴 Not Started | — | — |

Update this table as you complete each version.
