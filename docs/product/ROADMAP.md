# Nodbusiness — Product Roadmap

> Milestones from MVP to global platform. Updated quarterly.
> Last updated: September 2026

---

## Guiding Principle

> Ship fast. Measure. Improve. Scale only what works.

---

## Phase 1 — MVP Launch (2026 Q1–Q2)
**Goal: First 1,000 paying users**

### Shipped ✅
- [x] User registration + OTP verification
- [x] Social feed (posts, images, likes, comments)
- [x] Stories (24hr)
- [x] Marketplace (list, buy, sell products)
- [x] Stripe payments (orders + wallet topup)
- [x] Showroom Studio (27 templates)
- [x] Real-time chat (DM + groups)
- [x] Tasks marketplace (post, bid, complete)
- [x] Nearby map (products, businesses, tasks)
- [x] Push notifications + in-app notifications
- [x] Wallet (balance, topup, withdraw)
- [x] Basic admin panel
- [x] AI product description generator
- [x] Google OAuth
- [x] HttpOnly refresh token cookie (TD-001)
- [x] JWT revocation blocklist via Redis (TD-005)
- [x] Silent token refresh on page load — logout loop fixed (September 2026)
- [x] **Mewacho** — group money collection module (September 2026)
  - Group creation, invite via link + QR code
  - Stripe payment integration with webhook confirmation
  - Chat-style activity feed (contributions + messages)
  - Contribution ledger + progress bar
  - Withdrawal requests with multi-admin approval workflow
  - Push notifications to all group members on contribution
  - PDF export of group summary

### Infrastructure
- [x] Vercel (Next.js) + Render (backend) + Neon (database)
- [x] Cloudflare R2 (file storage)
- [x] Resend (email)
- [x] Sentry + Pino (observability)
- [x] GitHub Actions CI/CD

---

## Phase 2 — Growth (2026 Q3–Q4)
**Goal: 10,000 active users, first significant GMV**

### Product
- [ ] Chapa payments (Ethiopian Birr, Telebirr, CBE Birr)
- [ ] Product variants (size, color, stock per variant) *(migrate5.js done — UI pending)*
- [ ] Return requests + refunds *(backend done — UI pending)*
- [ ] Delivery tracking timeline *(backend done — UI pending)*
- [ ] Order confirmation emails
- [ ] Price drop alerts (wishlist) *(backend done — UI pending)*
- [ ] Coupon codes *(backend done — UI pending)*
- [ ] Business analytics dashboard
- [ ] Referral program *(backend done — UI pending)*
- [ ] Events ticketing *(backend done — UI pending)*
- [ ] Jobs board *(backend done — UI pending)*
- [ ] Courses marketplace *(backend done — UI pending)*
- [ ] Mewacho: Equb-style rotation mode
- [ ] Mewacho: diaspora multi-currency support (USD/EUR → ETB)

### Engineering
- [ ] Redis + BullMQ activated (`REDIS_URL` configured in production)
- [ ] Better Uptime monitoring
- [ ] Vercel Analytics enabled
- [ ] Playwright E2E tests for critical flows (TD-003)

---

## Phase 3 — Scale (2027)
**Goal: 100,000 users, expand to Kenya and Nigeria**

### Product
- [ ] Multi-language (Swahili, Hausa, Yoruba alongside Amharic + English)
- [ ] Multi-currency (KES, NGN alongside ETB)
- [ ] Community groups
- [ ] Live streaming (feature flag: `live_streaming`)
- [ ] Video posts (feature flag: `video_posts`)
- [ ] Personalized feed algorithm (feature flag: `personalized_feed`)
- [ ] 2FA authentication
- [ ] Virtual gifts
- [ ] Promoted posts / ads system
- [ ] Mewacho: recurring contribution reminders
- [ ] Mewacho: social share of group progress

### Engineering
- [ ] TypeScript migration (backend) — TD-004
- [ ] Prisma ORM — TD-008
- [ ] Meilisearch for full-text search
- [ ] Read replicas (Neon Scale plan)
- [ ] Separate BullMQ worker containers

---

## Phase 4 — Platform (2028–2029)
**Goal: 1,000,000 users, public API platform**

- [ ] Public REST API with API keys + developer portal
- [ ] Webhooks (OrderCreated, PaymentCompleted, etc.)
- [ ] Partner integrations (logistics, payments, identity)
- [ ] API versioning (`/api/v2/`)
- [ ] AWS ECS auto-scaling containers

---

## Phase 5 — Global Superapp (2030+)
**Goal: 10,000,000+ users, multi-continent**

- [ ] Android + iOS native apps (React Native)
- [ ] Offline mode (PWA + cached data)
- [ ] Financial services (lending, insurance)
- [ ] Nodbusiness Pay (proprietary payment network)
- [ ] Multi-region deployment

---

## CEO Dashboard Metrics (Track Weekly)

| Metric | Target |
|---|---|
| Daily Active Users (DAU) | +5% week-over-week |
| Monthly Active Users (MAU) | Growing |
| New registrations | Trending up |
| GMV (marketplace volume) | +10% month-over-month |
| Mewacho groups created | Trending up |
| Mewacho total collected (ETB) | Trending up |
| Payment success rate | >95% |
| API uptime | >99.9% |
| Avg API response time | <200ms |
| Error rate (Sentry) | <0.1% of requests |
