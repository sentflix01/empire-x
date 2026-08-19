# Nodbusiness — Feature Roadmap

> Last updated: August 9, 2026
> Based on full codebase state after major engineering sprint (July–August 2026).

---

## ✅ COMPLETED (Confirmed in codebase as of August 2026)

### Payment & Commerce — DONE
| Feature | Status |
|---|---|
| Stripe hosted Checkout Session | ✅ Full (single + multi-seller, server-side pricing) |
| Stripe webhook (paid/expired/failed/refunded) | ✅ Idempotent, commission + email + push |
| Stripe `/orders/success` + `/orders/cancel` pages | ✅ New (August 2026) |
| Stock decrement on payment confirmation | ✅ New (August 2026) |
| Chapa ETB payment (TeleBirr/CBE/M-Pesa) | ✅ Full sandbox + production |
| Wallet Stripe + Chapa top-up | ✅ With return param banners |
| Coupon activate/pause toggle | ✅ New (August 2026) |
| Invoice PDF download | ✅ (`jspdf` wired) |

### Messaging — DONE
| Feature | Status |
|---|---|
| Send, edit, delete, reply | ✅ |
| Forward message | ✅ New (August 2026) |
| Unread badge per conversation | ✅ New (August 2026) |
| Messages nav badge (sidebar + mobile) | ✅ New (August 2026) |
| Message notifications (in-app + push) | ✅ New (August 2026) |
| Read receipts (single/double check) | ✅ New (August 2026) |

### Admin — DONE
| Feature | Status |
|---|---|
| Ban/unban users (inline modal, auth enforcement) | ✅ New (August 2026) |
| Revenue dashboard (total, 30-day, paid/pending) | ✅ New (August 2026) |
| Revenue chart API (daily, top sellers, top products) | ✅ New (August 2026) |
| Zero native dialogs (alert/confirm/prompt removed) | ✅ New (August 2026) |

### Comment System — DONE
| Feature | Status |
|---|---|
| Threaded replies (parent_id — migrate27) | ✅ New (August 2026) |
| Reply count display + optimistic update | ✅ New (August 2026) |
| Comment/reply delete with cascade | ✅ New (August 2026) |
| Backend notifies parent comment author on reply | ✅ New (August 2026) |

### UX & Quality — DONE
| Feature | Status |
|---|---|
| Skeleton loading on 6 major pages | ✅ New (August 2026) |
| ErrorBoundary on all 45 views | ✅ |
| TypeScript 0 errors | ✅ |
| Following tab correctly queries follows table | ✅ New (August 2026) |
| Jobs + Events appear in Search "All" tab | ✅ New (August 2026) |
| Showroom cards show real cover images | ✅ New (August 2026) |
| Explore featured showrooms show real images | ✅ New (August 2026) |
| Marketplace infinite scroll | ✅ New (August 2026) |
| Product image in order cards | ✅ New (August 2026) |
| Seller name in orders (not UUID) | ✅ New (August 2026) |

---

## 🔴 NEXT 30 DAYS — Priority 1

These are the highest-impact items to build next, ordered by value:

### 1. Admin Revenue Chart UI (1–2 days)
**Backend already done.** `/api/admin/stats/revenue` returns daily chart, top sellers, top products.
Just needs a recharts `<AreaChart>` component in Admin.tsx overview tab.
**Impact:** Admin can see business health in real-time.

### 2. Personalized Feed Algorithm (3–4 days)
Currently feed is random/chronological. Scoring:
- Recency: `(NOW() - created_at)` inverse weight
- Engagement: `like_count * 0.4 + comment_count * 0.3`
- Social graph: posts from followed users get +0.5 boost
Background job recalculates scores every 5 minutes via BullMQ.
**Impact:** 3x session time (proven by research).

### 3. Video Posts (5–7 days)
Add video upload support to `CreatePostForm`. `<video>` player in PostCard.
Store on Cloudflare R2. Thumbnail generation via ffmpeg (backend).
**Impact:** Highest engagement format. TikTok/Instagram-style content.

### 4. Two-Factor Auth (2–3 days)
TOTP with `otplib`. `totp_secret` in users table. Settings page toggle.
QR code setup flow. Verify on login if enabled.
**Impact:** Real money in wallets needs account protection.

### 5. Smart Task Matching (1 day)
When a task is posted, notify top 5 agents by:
- `task_type` match
- Location proximity (within `task.radius_km`)
- Rating (average from completed tasks)
Fire push + in-app notification to matched agents.
**Impact:** Increases task completion rate, key metric.

---

## 🟡 NEXT 90 DAYS — Priority 2

### 6. Business Hours + Appointment Booking (5–7 days)
`availability_slots` table: `business_id`, `day_of_week`, `open_time`, `close_time`.
`appointments` table: `slot_id`, `user_id`, `status`, `notes`.
Calendar picker in business profile. Seller confirms/cancels.
**Needed by:** Salons, clinics, consultants, tutors.

### 7. Promoted Posts / Ads (5–7 days)
`is_promoted`, `promotion_budget`, `promotion_expires_at` on posts.
Admin campaign panel: approve/set budget.
Feed injection: 1 promoted post per 10 organic.
**Revenue:** First ad revenue stream for the platform.

### 8. Community Groups (2–3 weeks)
`groups` table: `name`, `description`, `cover_image`, `privacy` (public/private).
`group_members`: `group_id`, `user_id`, `role` (admin/member).
Group feed (filtered posts), join/leave, group chat room.
**Impact:** #1 retention feature. Users return daily for their groups.

### 9. Premium Business Subscription (1 week)
`subscription_tier` on businesses: `free` | `pro` | `enterprise`.
Stripe Subscription (recurring billing).
Pro features: unlimited products, custom domain, analytics, verified badge.
**Revenue:** Recurring monthly revenue model.

### 10. WhatsApp Order Notifications (1–2 days)
Twilio WhatsApp Business API.
Fire on: new order, payment confirmed, status update, return request.
Sellers get WhatsApp pings without opening the app.
**Impact:** High — Ethiopian businesses live in WhatsApp.

---

## 🟢 NEXT 6 MONTHS — Priority 3 Growth

| Month | Feature |
|---|---|
| Month 3 | Live Streaming (Agora/LiveKit MVP) |
| Month 3 | Reactions (emoji beyond Like) |
| Month 3 | Seller Revenue Forecasting (linear regression on orders) |
| Month 4 | Oromo & Tigrinya languages |
| Month 4 | Low-Data Mode (image lazy-load toggle) |
| Month 4 | Biometric Login (WebAuthn) |
| Month 5 | Virtual Gifting (coin economy) |
| Month 5 | Product Recommendations ("You might also like") |
| Month 6 | Restaurant Menu Ordering |
| Month 6 | Loyalty / Points System |

---

## 🏗️ Infrastructure — Required Before Production Launch

| Item | Priority | Action |
|---|---|---|
| **Cloudflare R2** | 🔴 | Set R2 env vars. `@aws-sdk/client-s3` already installed. 1 day. |
| **HttpOnly Cookie Auth** | 🔴 | Replace localStorage JWT. Add `/api/auth/refresh`. 2 days. |
| Redis (Upstash free tier) | 🟡 | Set `REDIS_URL`. Feed/trending caching live in 1 hour. |
| Stripe Webhook Secret | 🔴 | Register `/api/orders/webhook` in Stripe Dashboard. |
| Sentry DSN | 🟡 | Set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` for error tracking. |
| VAPID keys for Web Push | 🟡 | Generate + set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. |

---

## Stats (August 2026)

| Metric | Count |
|---|---|
| Confirmed built features | **75+** |
| Backend test suites | 17 |
| Backend tests passing | 252 |
| Frontend tests passing | 68 |
| TypeScript errors | 0 |
| Native dialogs remaining | 0 |
| DB migrations | 28 |
| Views with ErrorBoundary | 45/45 |

*Last updated: August 9, 2026*
