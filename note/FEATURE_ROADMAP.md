# Empire X — Feature Roadmap

> Last updated: July 2026
> Based on actual codebase audit of `/frontend-next/pages`, `/backend/routes`, `package.json`, and `socket.js`.

---

## ✅ EVERYTHING BUILT (Confirmed in Codebase)

### Core Auth & Profiles
| Feature | Evidence |
|---|---|
| User registration (email + OTP) | `backend/routes/auth.js` |
| Login (email/password + Google OAuth) | `backend/routes/auth.js` |
| Password reset via email | `backend/routes/auth.js` |
| User profiles (personal + business) | `backend/routes/profiles.js`, `Profile.tsx` |
| Onboarding flow | `Onboarding.tsx` |
| Verified badges | `VerifiedBadge` component, `admin.js` |
| Dark / Light mode toggle | `next-themes` installed, `AppLayout.tsx` |
| Amharic + English (i18n) | `react-i18next` installed, `locales/` folder |

### Social Feed
| Feature | Evidence |
|---|---|
| Social feed (posts, likes, comments) | `backend/routes/posts.js`, `Home.tsx`, `PostCard.tsx` |
| Comment section with reply + show/hide | `PostCard.tsx` |
| Follow / unfollow users | `profiles.js` |
| Hashtags (parse, trending, feed) | `backend/routes/hashtags.js`, `HashtagFeed.tsx` |
| Polls on posts (create, vote, results) | `backend/routes/polls.js`, `PostCard.tsx` |
| Stories (24hr posts with auto-cleanup) | `backend/routes/stories.js`, `Stories.tsx` |
| Ticker Bar (7 types, per-profile) | `PostCard.tsx`, `TickerBar.tsx` |
| Personal/Business feed toggle | `ProfileToggle.tsx`, `Home.tsx` |
| Feed filter (For You / Trending / Following / Nearby) | `Home.tsx` |
| Trending / Explore page | `Explore.tsx`, `backend/routes/trending.js` |
| Reactions post type variants (promo, event, location, poll, image) | `PostCard.tsx` `detectVariant()` |

### Nearby Map (Major Feature — Fully Built)
| Feature | Evidence |
|---|---|
| GPS location + Addis Ababa fallback | `Home.tsx`, `NearbyMap.tsx` |
| Nearby businesses map (feed Nearby tab) | `Home.tsx` — embedded map in feed |
| Nearby tasks + products map (`/nearby` page) | `NearbyMap.tsx` |
| Radius selector (2/5/10/20/50 km) | `Home.tsx` |
| Product/shop search within radius | `backend/routes/maps.js` `/nearby/product-search` |
| 3-step search: product → business → radius filter | `maps.js` product-search endpoint |
| Category filter chips on Nearby tab | `Home.tsx` |
| People search (@ prefix → user pins on map) | `Home.tsx` |
| Labeled DivIcon pins (name callout bubble above pin) | `Home.tsx`, `NearbyMap.tsx` `makeLabeledIcon()` |
| Hover card on marker (mini feed preview) | `MarkerHoverCard` component |
| Double-click marker → ProfilePeek modal | `Home.tsx`, `NearbyMap.tsx` |
| ProfilePeek modal (personal + business tabs) | `ProfilePeek.tsx` |
| Gold pin = your location (double-click → your profile) | `Home.tsx` |
| Green pins = people search results | `Home.tsx` |
| Red pins = product search results | `Home.tsx` |
| Blue pins = browse mode businesses | `Home.tsx` |

### Marketplace & Commerce
| Feature | Evidence |
|---|---|
| Product listings (create, edit, delete) | `ProductCreate.tsx`, `backend/routes/products.js` |
| Product detail page | `ProductDetail.tsx` |
| Product variants (size, color, etc.) | `backend/routes/variants.js`, `migrate5.js` |
| Product reviews & ratings | `backend/routes/reviews.js`, `ProductDetail.tsx` |
| Shopping cart | `Cart.tsx`, `backend/routes/cart.js` |
| Order placement + management | `Orders.tsx`, `backend/routes/orders.js` |
| Stripe payment | `orders.js`, `@stripe` installed |
| Discount codes / coupons | `CouponsManage.tsx`, `backend/routes/coupons.js` |
| Price alerts / wishlists | `backend/routes/wishlists.js` |
| Bookmarks / saves | `Bookmarks.tsx`, `backend/routes/saves.js` |
| Platform commission (auto on order) | `backend/routes/commission.js` |
| Wallet (balance, topup, withdraw) | `Wallet.tsx`, `backend/routes/wallet.js` |
| Return requests (DB exists) | `migrate5.js` — table exists, UI pending |
| Delivery tracking updates (DB exists) | `migrate5.js` — table exists, UI pending |
| Price alerts (DB exists) | `wishlists.js` — implemented |

### Business & Showrooms
| Feature | Evidence |
|---|---|
| Business profiles with mini-website | `BusinessCreate.tsx`, `BusinessProfile.tsx` |
| Showrooms (custom pages, 27 templates) | `ShowroomCreate.tsx`, `ShowroomView.tsx`, `ShowroomTemplates.tsx` |
| Showroom Studio (template gallery) | `ShowroomTemplates.tsx`, `TemplateCard.tsx` |
| Business analytics dashboard | `BusinessAnalytics.tsx` |
| QR Code for showrooms | `qrcode.react` installed |
| Section editor with drag-and-drop | `@hello-pangea/dnd` installed |

### Messaging & Notifications
| Feature | Evidence |
|---|---|
| DM / Group / Channel messaging | `Messages.tsx`, `ChatRoom.tsx`, `backend/routes/messages.js` |
| Real-time chat (Socket.io WebSocket) | `backend/socket.js`, `socket.io` + `socket.io-client` installed |
| In-app notifications | `Notifications.tsx`, `backend/routes/notifications.js` |
| Push notifications (Web Push / PWA) | `backend/routes/push.js`, `web-push` installed, `public/sw.js` |
| Telegram bot (order/message notifications) | `backend/routes/telegram.js` |

### Discovery & Search
| Feature | Evidence |
|---|---|
| Search (users, products, showrooms, tasks, posts, jobs, events) | `Search.tsx`, `backend/routes/search.js` |
| Search filters (sort, distance, price, date range) | `search.js` full filter support |
| Distance-aware results (GPS km/m badges) | `search.js` Haversine + `distance_km` |
| Hashtag feed | `HashtagFeed.tsx` |

### Platform Features
| Feature | Evidence |
|---|---|
| Events (create, browse, ticket booking) | `Events.tsx`, `EventCreate.tsx`, `backend/routes/events.js` |
| Job Board (post, browse, apply) | `Jobs.tsx`, `JobCreate.tsx`, `backend/routes/jobs.js` |
| Courses / Digital products | `Courses.tsx`, `CourseDetail.tsx`, `backend/routes/courses.js` |
| Tasks marketplace (post, bid, calendar) | `Tasks.tsx`, `TaskCreate.tsx`, `TaskCalendar.tsx`, `backend/routes/tasks.js` |
| Task bidding | `tasks.js` |
| Referral / invite system | `Referral.tsx`, `backend/routes/referral.js` |
| Report / Block users | `backend/routes/moderation.js` |
| Admin panel | `Admin.tsx`, `backend/routes/admin.js` |
| AI assistant / product description | `backend/routes/ai.js`, `AiAssistant.tsx` |
| PWA (installable on phone) | `public/manifest.json`, `public/sw.js` |

---

## 🔴 NOT YET BUILT — Priority 1 (Build Next)

### P1.1 — Chapa / Local Payment Integration
**Status:** ❌ Not built — Stripe only
**Why urgent:** Most Ethiopian users can't use Stripe. Missing the whole local market.
**How:** Chapa REST API (`https://chapa.co`). New `/api/orders/chapa/session`. Button in checkout.
**Effort:** Medium | **Revenue impact:** Very High

---

### P1.2 — Promoted Posts / Ads System
**Status:** ❌ Not built
**Why urgent:** First real revenue stream beyond commission.
**How:** `is_promoted`, `promotion_budget`, `promotion_expires_at` fields on posts/products. Admin campaign panel.
**Effort:** Medium | **Revenue impact:** Very High

---

### P1.3 — Return & Refund UI
**Status:** ⚠️ DB table exists (`return_requests` in migrate5), frontend missing
**Why urgent:** Trust builder. Buyers won't spend real money without a return option.
**How:** Add return request form in `Orders.tsx`. Seller approve/deny flow. Approved → wallet refund.
**Effort:** Low (DB done) | **Impact:** High

---

### P1.4 — Delivery Tracking UI
**Status:** ⚠️ DB table exists (`delivery_updates` in migrate5), frontend missing
**Why urgent:** Reduces "where is my order?" messages to sellers.
**How:** Timeline component in `Orders.tsx`. Seller adds checkpoints. Buyer sees live progress.
**Effort:** Low (DB done) | **Impact:** Medium

---

### P1.5 — Business Hours & Appointment Booking
**Status:** ❌ Not built
**Why urgent:** Salons, clinics, consultants need this. Currently have no way to take bookings.
**How:** `availability_slots` + `appointments` tables. Calendar UI in business profile.
**Effort:** Medium | **Impact:** High

---

### P1.6 — Community Groups
**Status:** ❌ Not built
**Why urgent:** #1 retention driver in social platforms. Users come back daily for group feeds.
**How:** `groups` + `group_members` tables. Group feed, admin roles, join/leave.
**Effort:** High | **Impact:** Very High

---

### P1.7 — Personalized Feed Algorithm
**Status:** ❌ Not built — feed is chronological only
**Why urgent:** Ranked feed keeps users engaged 3x longer.
**How:** Score posts: (recency × 0.3) + (likes × 0.4) + (follows × 0.3). Background recalculation every few minutes.
**Effort:** Medium | **Impact:** Very High

---

### P1.8 — Two-Factor Authentication (2FA)
**Status:** ❌ Not built
**Why urgent:** Wallet balances are real money. Accounts need protection.
**How:** `otplib` for TOTP. `totp_secret` in users table. Settings page toggle.
**Effort:** Low | **Impact:** High (security)

---

### P1.9 — Invoice Generator (PDF)
**Status:** ❌ Not built — `jspdf` IS installed, just not wired up
**Why urgent:** Ethiopian businesses need formal invoices for tax. `jspdf` is already in the project.
**How:** Invoice template using existing `jspdf`. Generate on "Download Invoice" button in Orders.
**Effort:** Very Low (package already installed) | **Impact:** Medium

---

### P1.10 — Video Posts (Short-form)
**Status:** ❌ Not built — only image posts
**Why urgent:** Video has 3x more engagement than image/text. Core differentiator.
**How:** Video upload in `CreatePostForm`. HTML5 `<video>` player in `PostCard`. Store on R2.
**Effort:** Medium | **Impact:** Very High

---

## 🟡 NOT YET BUILT — Priority 2 (Important)

### P2.1 — Live Streaming
**Status:** ❌ Not built
**How:** Agora.io or LiveKit SDK. Stream metadata in DB. Virtual gifts integration.
**Effort:** Very High | **Impact:** Very High

### P2.2 — Premium Business Subscription
**Status:** ❌ Not built
**How:** `subscription_tier` field on businesses. Stripe subscription. Feature gating.
**Effort:** High | **Impact:** Very High (recurring revenue)

### P2.3 — Smart Task Matching (Auto-suggest agents)
**Status:** ❌ Not built
**How:** Match `task_type` + location. Auto-notify top 5 matched agents.
**Effort:** Low | **Impact:** Medium

### P2.4 — WhatsApp Order Notifications
**Status:** ❌ Not built
**How:** Twilio WhatsApp API. Fire on order creation.
**Effort:** Low | **Impact:** High

### P2.5 — Inventory Low Stock Alerts
**Status:** ❌ Not built
**How:** Check stock on every order. Push + in-app notification when below threshold.
**Effort:** Low | **Impact:** Medium

### P2.6 — User Badges / Achievements
**Status:** ❌ Not built
**How:** Threshold checks on events. Award badge, notify. Display on profile.
**Effort:** Medium | **Impact:** Medium

### P2.7 — Reactions (Beyond Just Likes)
**Status:** ❌ Not built — likes only
**How:** Add `reaction_type` to likes table. Emoji picker in PostCard.
**Effort:** Low | **Impact:** Medium

### P2.8 — Bulk/Wholesale Pricing
**Status:** ❌ Not built
**How:** `price_tiers` JSON on products. Apply correct tier in checkout.
**Effort:** Low | **Impact:** Medium

### P2.9 — Login Activity & Device Management
**Status:** ❌ Not built
**How:** `sessions` table. Store device + IP. Security settings page.
**Effort:** Low | **Impact:** Medium (security)

### P2.10 — Content Moderation AI
**Status:** ❌ Not built
**How:** OpenAI Vision API or Google Vision Safe Search on uploads.
**Effort:** Medium | **Impact:** High (safety at scale)

### P2.11 — Seller Revenue Forecasting
**Status:** ❌ Not built — `jspdf` + recharts already installed
**How:** Linear regression on last 30 days order data. Forecast line on analytics chart.
**Effort:** Low | **Impact:** Medium

### P2.12 — Offline Mode
**Status:** ⚠️ PWA installed but no offline caching strategy
**How:** Extend service worker to cache feed. IndexedDB for draft posts.
**Effort:** High | **Impact:** High (intermittent connectivity in Ethiopia)

---

## 🟢 NOT YET BUILT — Priority 3 (Growth)

| # | Feature | Notes |
|---|---|---|
| 3.1 | Virtual Gifting | Flowers/crowns on posts/live. Coin economy. High revenue potential. |
| 3.2 | Product Recommendations ("You Might Like") | Collaborative filtering. Increases purchase rate. |
| 3.3 | Multi-Currency Display (USD/EUR/ETB) | For diaspora. Display only — store ETB in DB. |
| 3.4 | Business Verification (Document Upload) | Admin reviews trade license. Verified Business badge. |
| 3.5 | Zapier / Webhook Integration | Power user automation. Empire X as a platform. |
| 3.6 | Oromo & Tigrinya Language | `locales/or.json`, `locales/ti.json`. Huge reach expansion. |
| 3.7 | Screen Reader (ARIA Accessibility) | Audit with axe DevTools. Add ARIA labels. |
| 3.8 | Low-Data Mode | Lazy-load images toggle. Critical for outside Addis. |
| 3.9 | Swipe Feed (Reels-style) | CSS scroll-snap + touch. 4x engagement. |
| 3.10 | In-App Camera | `getUserMedia()`. Instant post without leaving app. |
| 3.11 | Biometric Login (WebAuthn) | Fingerprint / Face ID. Mobile UX. |
| 3.12 | Fraud Detection | Anomaly rules on orders. Auto-suspend flagged accounts. |
| 3.13 | End-to-End Encrypted Messages | Web Crypto API. Privacy for sensitive DMs. |
| 3.14 | A/B Testing Framework | User variant assignment. Data-driven UI decisions. |
| 3.15 | User Engagement Heatmap (Admin) | Page view + time-on-page tracking in admin. |
| 3.16 | Restaurant Menu Ordering | Food ordering flow. Huge Ethiopian market. |
| 3.17 | Loyalty / Points System | Points for activity. Unlock badges + discounts. |
| 3.18 | Subscription/Membership Plans | Businesses offer monthly subscriber discounts. |

---

## 🏗️ Infrastructure (When Scaling)

| # | Item | Status | Priority |
|---|---|---|---|
| Redis Caching | Cache trending/feed/products | ❌ Not built | When 10K+ users |
| BullMQ Background Jobs | Async email/push/commission | ❌ Not built | Before heavy traffic |
| Cloudflare R2 File Storage | Replace local `/uploads` disk | ❌ Not built | **Before production** |
| CDN (Cloudflare) | Serve static assets from edge | ❌ Not built | Before production |
| HttpOnly Cookie Auth | Replace JWT in localStorage | ❌ Not built | Before real money flows |
| Database Read Replicas | Separate SELECT from INSERT load | ❌ Not built | At 10K+ concurrent |
| Horizontal Scaling / Load Balancer | Docker + Nginx upstream | ❌ Not built | At 50K+ users |

---

## Recommended Build Order (Next 6 Months)

```
Month 1 — Revenue & Trust
  1. Chapa Payment (local market)
  2. Invoice Generator (jspdf already installed — 1 day)
  3. Return & Refund UI (DB already done)
  4. Delivery Tracking UI (DB already done)
  5. Cloudflare R2 (required before production)

Month 2 — Engagement
  6. Video Posts
  7. Personalized Feed Algorithm
  8. Promoted Posts / Ads
  9. Reactions (emoji beyond like)

Month 3 — Security & Growth
  10. 2FA
  11. Business Hours + Appointment Booking
  12. WhatsApp Order Notifications
  13. Community Groups (start design)

Month 4 — Scale
  14. Community Groups (ship)
  15. Live Streaming (MVP)
  16. Premium Business Subscription
  17. Redis Caching + BullMQ

Month 5-6 — Reach
  18. Oromo & Tigrinya languages
  19. Low-Data Mode
  20. Biometric Login
  21. Virtual Gifting
```

---

## Stats

| Category | Count |
|---|---|
| Features confirmed built | **60+** |
| Priority 1 not built | **10** |
| Priority 2 not built | **12** |
| Priority 3 not built | **18** |
| Infrastructure items pending | **7** |
| **Total feature surface** | **107+** |
