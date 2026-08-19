# Nodbusiness — Product Roadmap

> Milestones from MVP to global platform. Updated quarterly.
> Each phase builds on the previous — we never migrate everything at once.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| MVP | Minimum Viable Product |
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
| GMV | Gross Merchandise Value |
| API | Application Programming Interface |
| PWA | Progressive Web App |
| CI/CD | Continuous Integration / Continuous Delivery |
| ETB | Ethiopian Birr — reference market currency |
| USD | United States Dollar |
| SDK | Software Development Kit |
| CDN | Content Delivery Network |
| SSO | Single Sign-On |
| B2B | Business to Business |

---

## Guiding Principle

> Ship fast. Measure. Improve. Scale only what works.

---

## Phase 1 — MVP Launch (2026 Q1–Q2)
**Goal: First 1,000 paying users**

### Must Ship
- [x] User registration + OTP verification
- [x] Social feed (posts, images, likes, comments)
- [x] Stories (24hr)
- [x] Marketplace (list, buy, sell products)
- [x] Stripe payments
- [x] Showroom Studio (27 templates)
- [x] Real-time chat (DM + groups)
- [x] Tasks marketplace (post, bid, complete)
- [x] Nearby map (products, businesses, tasks)
- [x] Push notifications + in-app notifications
- [x] Wallet (balance, topup, withdraw)
- [x] Basic admin panel
- [x] AI product description generator
- [x] Google OAuth

### Infrastructure
- [x] Vercel (Next.js) + Railway (backend) + Neon (database)
- [x] Cloudflare R2 (file storage)
- [x] Resend (email)
- [x] Sentry + Pino (observability)
- [x] GitHub Actions CI/CD

---

## Phase 2 — Growth (2026 Q3–Q4)
**Goal: 10,000 active users, first significant GMV**

### Product
- [ ] Local payment methods (mobile money, regional gateways)
- [ ] Product variants (size, color, stock per variant)
- [ ] Return requests + refunds
- [ ] Delivery tracking timeline
- [ ] Order confirmation emails
- [ ] Price drop alerts (wishlist)
- [ ] Coupon codes
- [ ] Business analytics dashboard
- [ ] Referral program
- [ ] Events ticketing
- [ ] Jobs board
- [ ] Courses marketplace

### Engineering
- [ ] Redis + BullMQ activated (`REDIS_URL` configured)
- [ ] Performance indexes (`migrate8.js` run on production)
- [ ] Better Uptime monitoring
- [ ] Vercel Analytics enabled

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
- [ ] 2FA authentication (feature flag: `two_factor_auth`)
- [ ] Virtual gifts
- [ ] Promoted posts / ads system

### Engineering
- [ ] Meilisearch for full-text product/profile search
- [ ] TypeScript migration (backend)
- [ ] Prisma ORM
- [ ] HttpOnly cookie refresh tokens
- [ ] Read replicas (Neon Scale plan)
- [ ] Separate BullMQ worker containers

---

## Phase 4 — Platform (2028–2029)
**Goal: 1,000,000 users, public API platform**

### Product
- [ ] Public REST API with API keys
- [ ] Webhooks (OrderCreated, PaymentCompleted, etc.)
- [ ] Developer portal + documentation
- [ ] SDK (JavaScript/TypeScript)
- [ ] Partner integrations (logistics, payments, identity)
- [ ] Business intelligence dashboard for merchants

### Engineering
- [ ] API versioning (`/api/v2/`)
- [ ] AWS ECS auto-scaling containers
- [ ] AWS RDS PostgreSQL with read replicas
- [ ] AWS ElastiCache Redis cluster
- [ ] Cloudflare WAF Pro
- [ ] OpenSearch for advanced search
- [ ] Kafka for high-volume event streaming

---

## Phase 5 — Global Superapp (2030+)
**Goal: 10,000,000+ users, multi-continent**

### Product
- [ ] Android + iOS native apps (React Native)
- [ ] Offline mode (PWA + cached data)
- [ ] Financial services (lending, insurance)
- [ ] Nodbusiness Pay (proprietary payment network)
- [ ] Creator economy (subscriptions, tips, paid content)
- [ ] B2B marketplace
- [ ] Nodbusiness for Teams (business accounts)

### Engineering
- [ ] Multi-region deployment (Africa, Europe, Asia)
- [ ] Edge computing (Cloudflare Workers for compute-at-edge)
- [ ] PostGIS for advanced geospatial queries
- [ ] ML pipeline for recommendations and fraud detection
- [ ] Kubernetes for orchestration

---

## CEO Dashboard Metrics (Track Weekly)

| Metric | Target |
|---|---|
| Daily Active Users (DAU) | +5% week-over-week |
| Monthly Active Users (MAU) | Growing |
| New registrations | Trending up |
| GMV (marketplace volume) | +10% month-over-month |
| Payment success rate | >95% |
| API uptime | >99.9% |
| Avg API response time | <200ms |
| Error rate (Sentry) | <0.1% of requests |
| Support tickets | Trending down relative to users |
| Feature adoption | New features used by >20% in 30 days |

---

## Technical Debt (Living List)

### High Priority
- [ ] HttpOnly cookie refresh tokens (replace localStorage JWT)
- [ ] JWT revocation via Redis blocklist
- [ ] End-to-end test suite (Playwright)

### Medium Priority
- [ ] TypeScript on backend
- [ ] Prisma ORM migration
- [ ] Optimize notification polling (replace with socket-only)
- [ ] Image optimization pipeline (Cloudflare Workers)

### Low Priority
- [ ] Refactor `AppLayout.tsx` — remove `@ts-nocheck`
- [ ] Replace polling interval in entities.ts subscribe()
