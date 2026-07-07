# Empire X — Future Features

> Updated: July 2026 — based on full codebase audit.
> ✅ = Built & confirmed in code | ⚠️ = Partially built (DB exists, UI missing) | ❌ = Not yet built

---

## ✅ FULLY BUILT (Confirmed in Codebase)

### Auth & Profiles
- ✅ Email + OTP registration
- ✅ Login (email/password + Google OAuth)
- ✅ Password reset
- ✅ Personal + business profiles
- ✅ Onboarding flow
- ✅ Verified badges (admin-granted)
- ✅ Dark / Light mode (`next-themes`)
- ✅ Amharic + English i18n (`react-i18next`)

### Social Feed
- ✅ Posts (image, text, promo, event, location, poll types)
- ✅ Likes + comments + comment replies
- ✅ Follow / unfollow
- ✅ Hashtags (parse, trending, feed page)
- ✅ Polls (create, vote, live results)
- ✅ Stories (24hr, auto-cleanup)
- ✅ Ticker bar (7 types per profile)
- ✅ Personal / Business feed toggle
- ✅ Feed filters (For You / Trending / Following / Nearby)
- ✅ Explore / Trending page
- ✅ Profile Peek modal (personal + business tabs, full feed)
- ✅ Post card menu (personal/business view switcher)
- ✅ ShareButton on posts

### Nearby Map (Fully Built — Major Feature)
- ✅ Feed Nearby tab with embedded Leaflet map
- ✅ GPS location + Addis Ababa fallback
- ✅ Standalone `/nearby` page (tasks + products map)
- ✅ Radius selector (2 / 5 / 10 / 20 / 50 km)
- ✅ Category filter chips (Nearby tab)
- ✅ Product/shop search within radius
- ✅ 3-step search logic: keyword → find products → find businesses → filter by radius
- ✅ People search (`@name` prefix → user pins)
- ✅ White callout bubble label above each pin (pin colour = type)
- ✅ Hover card on marker (mini feed + avatar + distance preview)
- ✅ Mouse-out → returns to name label
- ✅ Double-click any pin → ProfilePeek modal
- ✅ Gold pin = you (double-click opens your own profile)
- ✅ Red pins = product search results
- ✅ Blue pins = browse businesses
- ✅ Green pins = people search
- ✅ Map auto-flies to first search result
- ✅ ProfilePeek z-index above Leaflet layers
- ✅ ProfilePeek drops from top of viewport (not behind map)

### Marketplace & Commerce
- ✅ Product listings (create, edit, delete)
- ✅ Product detail page
- ✅ Product variants (size, colour — `variants.js` + `migrate5`)
- ✅ Product reviews & ratings
- ✅ Shopping cart
- ✅ Orders (placement + seller management)
- ✅ Stripe payment
- ✅ Discount codes / coupons
- ✅ Wishlists + price alerts
- ✅ Bookmarks / saves
- ✅ Platform commission (auto on order completion)
- ✅ Wallet (balance, topup, withdraw)

### Business & Showrooms
- ✅ Business mini-website builder
- ✅ 27 showroom templates (9 categories)
- ✅ Showroom Studio template gallery
- ✅ Business analytics dashboard
- ✅ QR code (`qrcode.react` installed + wired)
- ✅ Section editor drag-and-drop (`@hello-pangea/dnd`)

### Messaging & Notifications
- ✅ DM / Group / Channel messaging
- ✅ Real-time chat (Socket.io WebSocket — full bi-directional)
- ✅ In-app notifications
- ✅ Push notifications (Web Push + service worker)
- ✅ Telegram bot (order/message notifications)
- ✅ Live notification toast via socket

### Discovery & Search
- ✅ Search across 7 types (users, products, showrooms, tasks, posts, jobs, events)
- ✅ Search filters (sort by distance/price/date, price range, date range)
- ✅ Distance-aware results with km/m badges
- ✅ Hashtag feed page

### Platform
- ✅ Events (create, browse, ticket booking)
- ✅ Job Board (post, browse)
- ✅ Courses / Digital products
- ✅ Task marketplace (post, bid, calendar)
- ✅ Referral / invite system
- ✅ Report / Block users (`moderation.js`)
- ✅ Admin panel (user, order, content management)
- ✅ AI assistant + product description generator (`ai.js`)
- ✅ PWA (installable, service worker, manifest)

---

## ⚠️ PARTIALLY BUILT (DB / Backend done, Frontend missing)

| Feature | What's Done | What's Missing |
|---|---|---|
| Return & Refund | `return_requests` table in migrate5 | Frontend form in Orders page, seller approve/deny |
| Delivery Tracking | `delivery_updates` table in migrate5 | Timeline UI in Orders page |
| Offline Mode | Service worker + PWA installed | No cache strategy, no draft storage |

---

## ❌ NOT YET BUILT

### 🔴 Priority 1 — Build These First

| # | Feature | Why | Effort |
|---|---|---|---|
| 1 | **Chapa Payment** (Telebirr, CBE Birr) | Whole local market can't use Stripe | Medium |
| 2 | **Invoice Generator** | `jspdf` already installed — literally 1 day | Very Low |
| 3 | **Personalized Feed Algorithm** | Ranked feed = 3x retention | Medium |
| 4 | **Promoted Posts / Ads** | First real revenue stream | Medium |
| 5 | **Video Posts** | 3x engagement vs images | Medium |
| 6 | **Two-Factor Auth (2FA)** | Wallet = real money, needs protection | Low |
| 7 | **Business Hours + Appointments** | Salons, clinics, consultants need this | Medium |
| 8 | **Community Groups** | #1 retention feature in social apps | High |
| 9 | **WhatsApp Order Notifications** | Sellers live in WhatsApp | Low |
| 10 | **Inventory Low Stock Alerts** | Prevents missed sales from stockouts | Low |

### 🟡 Priority 2 — Important

| # | Feature | Why | Effort |
|---|---|---|---|
| 11 | Live Streaming | Highest engagement + virtual gift revenue | Very High |
| 12 | Premium Business Subscription | Recurring revenue model | High |
| 13 | Reactions (emoji beyond Like) | Richer expression, engagement data | Low |
| 14 | Bulk / Wholesale Pricing | Opens B2B commerce | Low |
| 15 | Login Activity + Device Management | Security for wallet accounts | Low |
| 16 | User Badges / Achievements | Gamification, retention | Medium |
| 17 | Content Moderation AI | Scale safety with OpenAI Vision | Medium |
| 18 | Seller Revenue Forecasting | Analytics + recharts already installed | Low |
| 19 | Smart Task Matching | Auto-notify best agents | Low |

### 🟢 Priority 3 — Growth & Scale

| # | Feature | Notes |
|---|---|---|
| 20 | Virtual Gifting | Coin economy on posts/live. TikTok-style revenue. |
| 21 | Product Recommendations | Collaborative filtering. "You might like…" |
| 22 | Multi-Currency Display | For diaspora. ETB stored in DB, display converts. |
| 23 | Business Verification (Document Upload) | Admin reviews trade license. Trust. |
| 24 | Oromo & Tigrinya Languages | Add `or.json` + `ti.json` locale files. |
| 25 | Low-Data Mode | Image lazy-load toggle. Critical outside Addis. |
| 26 | Swipe Feed (Reels-style) | CSS scroll-snap + touch. 4x engagement. |
| 27 | In-App Camera | `getUserMedia()`. Instant post = 3x more posts. |
| 28 | Biometric Login (WebAuthn) | Fingerprint/Face ID for mobile. |
| 29 | Fraud Detection | Anomaly rules on orders. Auto-suspend. |
| 30 | End-to-End Encrypted Messages | Web Crypto API. Privacy in DMs. |
| 31 | Zapier / Webhook Integration | "On new order → Google Sheet". Platform play. |
| 32 | A/B Testing Framework | Hash-based user variant assignment. |
| 33 | Restaurant Menu Ordering | Huge local market. `menu_item` order type already exists. |
| 34 | Loyalty / Points System | Points for activity unlock badges + discounts. |
| 35 | Subscription/Membership Plans | Business offers recurring subscriber discounts. |
| 36 | Screen Reader (ARIA) | axe DevTools audit. Required for government contracts. |

---

## 🏗️ Infrastructure (Required Before / During Scale)

| Item | Priority | Notes |
|---|---|---|
| **Cloudflare R2 File Storage** | 🔴 Before production | `@aws-sdk/client-s3` already installed — just change endpoint |
| **HttpOnly Cookie Auth** | 🔴 Before real money | Replace localStorage JWT. Add `/api/auth/refresh`. |
| Redis Caching | 🟡 At 5K+ users | Cache trending + feed. `ioredis`. |
| BullMQ Background Jobs | 🟡 Before heavy traffic | Async email, push, commission |
| CDN (Cloudflare) | 🟡 Before production | Free. 5x faster loads outside Addis. |
| Database Read Replicas | 🟢 At 10K+ concurrent | Separate SELECT load |
| Horizontal Scaling | 🟢 At 50K+ users | Docker + Nginx upstream |

---

## New Recommendations (Not in Previous Roadmap)

These are additions based on what Empire X now has and where the gaps are:

### NR1 — AI-Powered Business Name & Slogan Generator
**What:** When creating a business, AI suggests a name + tagline based on category and description.
**Why:** Many small businesses in Ethiopia don't have formal brand identities. Easy win.
**How:** OpenAI prompt with category context. `ai.js` already exists.
**Effort:** Very Low

### NR2 — Showroom Analytics (Views, Clicks, Conversions)
**What:** Business owners see how many people viewed their showroom, clicked products, and converted.
**Why:** Sellers invest time in showrooms but have no idea if they're working.
**How:** Track `showroom_views` + `product_click` events. Add chart to BusinessAnalytics.
**Effort:** Low

### NR3 — Map Pin Clustering
**What:** When many pins are close together on the map, group them into a single cluster badge (e.g. "8").
**Why:** 50+ pins on a small map is unreadable. Clustering is standard map UX.
**How:** `react-leaflet-cluster` npm package. Drop-in wrapper around `MapContainer`.
**Effort:** Very Low | **Impact:** High (UX on busy maps)

### NR4 — "Open Now" Filter on Nearby Map
**What:** Filter businesses by those currently open, based on their business hours setting.
**Why:** Users want to find a pharmacy or salon that's open right now, not all 50 in the area.
**How:** Compare current time to `business_hours` JSON when Business Hours feature is built.
**Effort:** Low (depends on NR1.7 Business Hours)

### NR5 — Task Auto-Expiry
**What:** Tasks that don't get a bid within X days automatically close.
**Why:** Dead tasks clutter the board and reduce quality signal.
**How:** Cron job (or BullMQ delayed job). Set `status = 'expired'` after configurable days.
**Effort:** Very Low

### NR6 — Showroom "Share Story" (Post Showroom Section to Feed)
**What:** Business owners can share a section of their showroom as a post to the social feed in one click.
**Why:** Drives discovery. Showrooms become social content.
**How:** Pre-fill `CreatePostForm` with showroom section image/text.
**Effort:** Low

### NR7 — Product Bundle Deals
**What:** Sellers create bundles (e.g. "Buy shirt + trousers = 20% off").
**Why:** Increases average order value. Common in fashion + electronics.
**How:** `product_bundles` table. Bundle price + component products. Apply discount in cart.
**Effort:** Medium

### NR8 — Earnings Leaderboard
**What:** Public leaderboard of top-earning sellers, task completers, most active users this month.
**Why:** Competition drives activity. Leaderboards are proven engagement tools in African apps.
**How:** Monthly aggregation job. Leaderboard page. Crown icon for top 3.
**Effort:** Low

### NR9 — Negotiation on Tasks (Counter-Bid)
**What:** Task requester can counter-offer a different price to a bidder. Bidder accepts or declines.
**Why:** Real-world haggling is expected in Ethiopian commerce. Rigid prices reduce task completion.
**How:** Add `counter_offer` field to `task_bids`. Notification flow for counter + accept/decline.
**Effort:** Low | **Impact:** Medium

### NR10 — Collaborative Showrooms (Co-Owner)
**What:** Multiple sellers can contribute products to one showroom (like a marketplace stall).
**Why:** Small vendors who can't afford their own showroom can join a shared one.
**How:** `showroom_collaborators` table. Permissions per collaborator. Revenue split tracking.
**Effort:** Medium | **Impact:** High (for small sellers)

---

## Summary

| Category | Count |
|---|---|
| ✅ Fully built | **62 features** |
| ⚠️ Partially built (DB done, UI missing) | **3 features** |
| ❌ Priority 1 to build | **10 features** |
| ❌ Priority 2 to build | **9 features** |
| ❌ Priority 3 growth features | **17 features** |
| 🆕 New recommendations | **10 features** |
| 🏗️ Infrastructure items | **7 items** |
| **Total feature surface** | **~118 features** |

*Last updated: July 2026*
