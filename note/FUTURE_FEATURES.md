# Empire X — Future Features

> Updated: August 2026 — reflects full codebase state after major engineering sprint.
> ✅ = Built & confirmed in code | ⚠️ = Partially built | ❌ = Not yet built

---

## ✅ FULLY BUILT (Confirmed in Codebase — August 2026)

### Auth & Profiles
- ✅ Email + OTP registration (`auth.js`)
- ✅ Login (email/password + Google OAuth)
- ✅ Password reset via email
- ✅ Personal + business profiles
- ✅ Onboarding flow with template picker
- ✅ Verified badges (admin-granted, 4 types)
- ✅ Dark / Light mode (`next-themes`)
- ✅ Amharic + English i18n (`react-i18next`)
- ✅ User ban/unban (migrate28, auth middleware enforces)
- ✅ Admin can grant/revoke verification badges

### Social Feed
- ✅ Posts (image, text, promo, event, location, poll types)
- ✅ Likes + comments with threaded replies (migrate27 adds parent_id)
- ✅ Comment delete (cascades to replies)
- ✅ Reply count displayed, updates optimistically
- ✅ Follow / unfollow users
- ✅ Hashtags (parse, trending, feed page)
- ✅ Polls (create, vote, live results)
- ✅ Stories (24hr, auto-cleanup)
- ✅ Ticker bar (7 types per profile)
- ✅ Personal / Business feed toggle
- ✅ Feed filters: For You / Trending / **Following (now correctly filtered)** / Nearby
- ✅ Infinite scroll on feed (IntersectionObserver, dedup, 15 per page)
- ✅ Explore / Trending page (real data from `/api/trending`, skeleton loading)
- ✅ Profile Peek modal
- ✅ Post card with ShareButton

### Nearby Map
- ✅ Feed Nearby tab with embedded Leaflet map
- ✅ GPS location + Addis Ababa fallback
- ✅ Standalone `/nearby` page
- ✅ Radius selector (2 / 5 / 10 / 20 / 50 km)
- ✅ Product/shop search, people search, category filters
- ✅ Labeled pins, hover cards, double-click ProfilePeek

### Marketplace & Commerce
- ✅ Product listings (create, edit, delete)
- ✅ Infinite scroll on marketplace (24 per page, IntersectionObserver)
- ✅ Product detail page (star rating with review count)
- ✅ Product variants (`variants.js`)
- ✅ Product reviews & ratings (full CRUD)
- ✅ Shopping cart with optimistic updates + rollback
- ✅ Orders (placement, management, delivery tracking timeline)
- ✅ Return requests (form, seller approve/deny, wallet refund)
- ✅ Product image shown in order cards
- ✅ **Full Stripe payment integration:**
  - Hosted Checkout Session (single + multi-seller cart)
  - Webhook: idempotent, handles paid/expired/failed/refunded
  - **Stock decremented on Stripe + Chapa payment confirmation**
  - Buyer confirmation email on Stripe webhook
  - `/orders/success` page with real order summary
  - `/orders/cancel` page with Return to Cart
  - `/api/orders/session/:sessionId` endpoint
  - `payment_intent_data.metadata` propagates `wallet_id` for refunds
- ✅ **Chapa payment** (ETB, TeleBirr/CBE Birr/M-Pesa, sandbox mode)
- ✅ Discount codes / coupons (create, activate/pause, validate server-side)
- ✅ Wishlists + price alerts
- ✅ Bookmarks / saves
- ✅ Platform commission (auto on completion)
- ✅ Wallet: balance, Stripe top-up, Chapa top-up, withdraw
- ✅ Wallet return banners (success/cancelled/failed)
- ✅ Invoice download (PDF via jspdf)
- ✅ Seller name resolved in order cards (was showing UUID)

### Business & Showrooms
- ✅ Business mini-website builder (27 templates, 9 categories)
- ✅ Showroom Studio template gallery
- ✅ Business analytics dashboard (recharts)
- ✅ QR code for showrooms
- ✅ Section editor drag-and-drop
- ✅ Showroom cover images displayed on listing page

### Messaging & Notifications
- ✅ DM / Group / Channel messaging
- ✅ Real-time chat (Socket.IO)
- ✅ Send, edit, delete messages (two-tap confirm)
- ✅ Reply with quote block
- ✅ **Forward message** (new modal with conversation picker + search)
- ✅ Read receipts: single `✓` (sending) → double `✓✓` (delivered)
- ✅ Unread badge per conversation in Messages list
- ✅ Messages nav badge (desktop sidebar + mobile bottom bar)
- ✅ Message notifications: recipient gets in-app notification + push on every message
- ✅ Messages tab in mobile bottom nav (replaced Businesses)
- ✅ Group/Channel creation modals (brand colors fixed)
- ✅ In-app notifications + push notifications
- ✅ Telegram bot notifications
- ✅ Socket singleton cleared on logout (prevents stale token)

### Admin Panel
- ✅ Overview: users, posts, products, orders, reports
- ✅ **Revenue dashboard**: total, last-30-day, paid/pending order counts, new users today, banned count
- ✅ **`GET /api/admin/stats/revenue`**: daily chart, top sellers, top products (last 30 days)
- ✅ User management: search, role change, delete
- ✅ **Ban/Unban users** with optional reason (inline modal, no native dialogs)
- ✅ Ban enforced in auth middleware (banned users get 403 immediately)
- ✅ Two-tap confirmation for delete and revoke (no native confirm())
- ✅ Verification management: grant, revoke
- ✅ Flagged content review
- ✅ Order management

### Discovery & Search
- ✅ Search across 7 types (people, products, showrooms, tasks, posts, jobs, events)
- ✅ **Jobs + Events now appear in the "All" tab** (was previously filtered out)
- ✅ Search filters (sort, distance, price, date)
- ✅ Distance badges

### Platform
- ✅ Events, Job Board, Courses, Tasks (all with CRUD)
- ✅ Referral / invite system
- ✅ Report / Block users
- ✅ AI assistant (OpenAI/Gemini/Anthropic switchable)
- ✅ PWA (installable, service worker, manifest)
- ✅ All 45 views wrapped with ErrorBoundary
- ✅ Skeleton loading states on Marketplace, Showrooms, Profile, Explore, Jobs, Events
- ✅ TypeScript 0 errors
- ✅ Rate limiters fully bypassed in dev (`skip: () => isDev`)
- ✅ 16 views use `useAuth()` hook (no duplicate `/api/auth/me` calls)
- ✅ Zero native alert()/confirm()/prompt() calls anywhere

### Backend Quality
- ✅ 28 migrations (including parent_id for comments, is_banned, chat/notification indexes)
- ✅ GIN index on `conversations(participant_ids)` for JSONB containment queries
- ✅ Composite indexes on messages, notifications
- ✅ ALLOWED_TABLES allowlist in crud.js
- ✅ Following filter on posts API (`following=true` queries follows table)
- ✅ Coupon toggle (activate/pause without deleting)
- ✅ 252 backend tests passing (17 suites)

---

## ⚠️ PARTIALLY BUILT

| Feature | Done | Missing |
|---|---|---|
| Offline Mode | Service worker + PWA installed | Cache strategy, IndexedDB draft storage |
| Map clustering | MarkerClusterGroup is stub pass-through | Real `react-leaflet-cluster` implementation |

---

## ❌ NOT YET BUILT

### 🔴 Priority 1

| # | Feature | Notes | Effort |
|---|---|---|---|
| 1 | **Personalized Feed Algorithm** | Score: recency × 0.3 + likes × 0.4 + follows × 0.3 | Medium |
| 2 | **Promoted Posts / Ads System** | `is_promoted`, `promotion_budget` fields + admin campaign panel | Medium |
| 3 | **Video Posts** | Upload in CreatePostForm, HTML5 `<video>` in PostCard, store on R2 | Medium |
| 4 | **Two-Factor Auth (2FA)** | `otplib` TOTP, `totp_secret` in users, Settings toggle | Low |
| 5 | **Business Hours + Appointment Booking** | `availability_slots` + `appointments` tables, calendar UI | Medium |
| 6 | **Community Groups** | `groups` + `group_members`, group feed, admin roles, join/leave | High |
| 7 | **WhatsApp Order Notifications** | Twilio WhatsApp API, fire on order creation | Low |
| 8 | **Inventory Low Stock Alerts** | Already partly done (backend fires on Stripe webhook), UI missing | Low |
| 9 | **Admin Revenue Chart UI** | Backend endpoint exists (`/api/admin/stats/revenue`), recharts ready | Low |
| 10 | **Smart Task Matching** | Auto-notify best agents by type + location proximity | Low |

### 🟡 Priority 2

| # | Feature | Effort |
|---|---|---|
| 11 | Live Streaming (Agora/LiveKit) | Very High |
| 12 | Premium Business Subscription (Stripe) | High |
| 13 | Reactions (emoji beyond Like) | Low |
| 14 | Bulk / Wholesale Pricing | Low |
| 15 | Login Activity + Device Management | Low |
| 16 | User Badges / Achievements | Medium |
| 17 | Content Moderation AI (OpenAI Vision) | Medium |
| 18 | Seller Revenue Forecasting (linear regression) | Low |

### 🟢 Priority 3 — Growth

| # | Feature |
|---|---|
| 19 | Virtual Gifting (coin economy) |
| 20 | Product Recommendations |
| 21 | Multi-Currency Display (ETB/USD/EUR) |
| 22 | Business Verification (document upload) |
| 23 | Oromo & Tigrinya Languages |
| 24 | Low-Data Mode |
| 25 | Swipe Feed (Reels-style) |
| 26 | In-App Camera |
| 27 | Biometric Login (WebAuthn) |
| 28 | Fraud Detection |
| 29 | End-to-End Encrypted Messages |
| 30 | Zapier / Webhook Integration |
| 31 | Restaurant Menu Ordering |
| 32 | Loyalty / Points System |
| 33 | Subscription/Membership Plans |
| 34 | Screen Reader (ARIA) Audit |
| 35 | Showroom Analytics (views, clicks, conversions) |
| 36 | Map Pin Clustering |
| 37 | Task Auto-Expiry |
| 38 | Showroom "Share Story" to Feed |
| 39 | Earnings Leaderboard |
| 40 | Negotiation on Tasks (counter-bid) |

---

## 🏗️ Infrastructure

| Item | Priority | Status |
|---|---|---|
| **Cloudflare R2 File Storage** | 🔴 Before production | `@aws-sdk/client-s3` installed, env vars needed |
| **HttpOnly Cookie Auth** | 🔴 Before real money | Replace localStorage JWT |
| Redis Caching | 🟡 At 5K+ users | `ioredis` installed, Redis URL needed |
| BullMQ Background Jobs | 🟡 Before heavy traffic | `bullmq` installed |
| CDN (Cloudflare) | 🟡 Before production | Free tier |
| Database Read Replicas | 🟢 At 10K+ concurrent | Neon supports this |
| Horizontal Scaling | 🟢 At 50K+ users | Railway auto-scaling |

---

## Summary (August 2026)

| Category | Count |
|---|---|
| ✅ Fully built | **75+ features** |
| ⚠️ Partially built | **2** |
| ❌ Priority 1 to build | **10** |
| ❌ Priority 2 to build | **8** |
| ❌ Priority 3 growth | **22** |
| 🏗️ Infrastructure | **7** |
| **Total feature surface** | **~124+** |

*Last updated: August 9, 2026*
