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
- [ ] Local payment methods beyond Chapa (mobile money, regional gateways)
- [x] Product variants (size, color, stock per variant) — `product_variants`, variant-aware cart
- [x] Return requests + refunds — `returns.ts` (approve/reject; refunds executed by admin via wallet)
- [x] Delivery tracking timeline — `delivery.ts`
- [x] Order confirmation emails — Resend/SMTP on order completion
- [x] Price drop alerts (wishlist) — price_alerts table
- [x] Coupon codes — seller coupon CRUD + checkout redemption
- [ ] Business analytics dashboard (basic version shipped in Admin; seller-facing analytics next)
- [x] Referral program — `referral.ts`
- [x] Events ticketing — events + event_tickets
- [x] Jobs board — jobs + job_applications
- [x] Courses marketplace — courses + lessons + enrollments

> Statuses verified against `backend/routes/` and feature-flag defaults 2026-08-23.
> This file is the **single source of truth for shipped status** — other docs must not mark
> features built/shipped except by reference to this roadmap.

### Engineering
- [ ] Redis + BullMQ fully activated in production paths (`REDIS_URL` configured)
- [x] Performance indexes (`migrate8.js` + migrate11/16/26/32/33 run in production)
- [ ] Uptime monitoring with alerting wired to the severity matrix (`operations/MONITORING.md`)
- [ ] Vercel Analytics enabled

---

## Phase 3 — Scale (2027)
**Goal: 100,000 users, expand to Kenya and Nigeria**

### Product
- [ ] Multi-language (Swahili + French alongside Amharic + English; sequence per `product/LOCALIZATION.md`)
- [ ] Multi-currency display (KES, NGN — ledger stays ETB per `architecture/CURRENCY_AND_COMMISSION.md`)
- [ ] Community groups
- [ ] Live streaming (feature flag: `live_streaming`)
- [ ] Video posts (feature flag: `video_posts`)
- [ ] Personalized feed algorithm (feature flag: `personalized_feed`)
- [ ] 2FA authentication (feature flag: `two_factor_auth`)
- [ ] Virtual gifts
- [ ] Promoted posts / ads system

### Engineering
- [ ] Meilisearch for full-text product/profile search
- [x] TypeScript migration (backend) — complete since August 2026
- [ ] Prisma ORM (evaluate again post-TypeScript; pg + typed helpers currently sufficient)
- [x] HttpOnly cookie refresh tokens (shipped July 2026) + access-token type enforcement (Aug 2026); remaining work: remove localStorage mirror of access token (TD-014)
- [x] JWT revocation via Redis blocklist (`revoked:{jti}` + `revoke_before:{userId}`)
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

Canonical register: **`operations/TECHNICAL_DEBT.md`** — this list mirrors its highlights.

### High Priority
- [x] HttpOnly cookie refresh tokens (replace localStorage JWT) — shipped; residual: remove access-token localStorage mirror (TD-014)
- [x] JWT revocation via Redis blocklist — shipped July 2026
- [ ] End-to-end test suite (Playwright)
- [ ] CI made blocking + deploys gated on CI (TD-019)
- [ ] TLS certificate validation on Neon/Upstash (TD-016)

### Medium Priority
- [x] TypeScript on backend — complete
- [ ] Prisma ORM migration (re-evaluate)
- [ ] Optimize notification polling (replace with socket-only)
- [ ] Image optimization pipeline (Cloudflare Workers)
- [ ] Audit logging for financial/admin actions (TD-012)

### Low Priority
- [x] Refactor `AppLayout.tsx` — no `@ts-nocheck` remains
- [ ] Replace polling interval in entities.ts subscribe()
