# Halehame — Infrastructure Timeline

> Month-by-month infrastructure roadmap aligned with product and user growth.
> **Last updated:** August 2026

---

## Month 0 (Now): Pre-Launch Hardening

**Goal:** Make what's already built production-safe before a single real user pays.

```
Week 1: Storage & Payments
  Day 1–2:  Set up Cloudflare R2 — activate env vars, test upload
  Day 3:    Register Stripe live account + webhook
  Day 4:    Register Chapa business account
  Day 5:    Test end-to-end payment flow (small real transaction)

Week 2: Observability & Notifications
  Day 1:    Configure Sentry (backend + frontend DSNs)
  Day 2:    Generate + set VAPID keys — test push notification
  Day 3:    Enable Redis via Upstash free tier
  Day 4:    Set up UptimeRobot alerts
  Day 5:    Run load test on /api/posts feed (simulated 50 concurrent users)

Week 3: Domain & Security
  Day 1–2:  Register domain + configure Cloudflare DNS
  Day 3:    Configure SSL (Cloudflare handles — verify HTTPS everywhere)
  Day 4:    Enable Neon connection pooling
  Day 5:    Security review: check all admin routes require requireAdmin

Week 4: Beta Testing
  Days 1–5: Internal beta with 10–20 real users
             Monitor: error rates, response times, payment success rate
             Fix: any issues found before public launch
```

**End of Month 0 infrastructure state:**
- ✅ Cloudflare R2 (file storage)
- ✅ Stripe live (card payments)
- ✅ Chapa live (ETB payments)
- ✅ Sentry (error tracking)
- ✅ Push notifications working
- ✅ Redis cache active
- ✅ Custom domain with SSL
- ✅ UptimeRobot alerts

---

## Month 1–3: Soft Launch (0 → 500 users)

**Goal:** First 500 real users. Learn. Fix. Learn more.

```
Month 1: Launch
  - Public registration opens (invite-only or open)
  - Monitor: Daily active users, first orders, error rate
  - Fix: Any issues within 24 hours of discovery
  - Collect: User feedback via in-app button
  - Metric target: 100 users, 10 orders

Month 2: Iterate
  - Fix top 5 user-reported issues
  - Add: Basic analytics (install PostHog — free self-hosted or $0 Vercel)
  - Monitor: Which features users actually use vs. what we built
  - Metric target: 250 users, 30 orders

Month 3: Grow
  - First seller onboarding workshops
  - WhatsApp/Telegram promotion campaigns
  - Metric target: 500 users, 100 orders
  
Infrastructure changes this period:
  - Upgrade Railway if CPU > 60% sustained
  - Upgrade Resend if > 3K emails/month
  - Upgrade Sentry if > 5K errors/month
  - First database optimization pass (add indexes for slow queries)
```

**Cost at end of Month 3:** ~$30–80/month

---

## Month 3–6: Growth Acceleration (500 → 5,000 users)

**Goal:** Reach product-market fit signal (users coming back without prompting).

```
Month 3–4:
  - Launch referral programme activation campaign
  - Add PostHog A/B testing for feed algorithm experiment
  - Infrastructure: BullMQ workers activated (background jobs)
  - Database: First slow-query audit + index additions

Month 4–5:
  - Add Meilisearch if search p95 > 500ms (unlikely at this scale)
  - Upgrade Neon to Launch plan if data > 3GB
  - Add Vercel Analytics — track Core Web Vitals
  - Implement cache headers on product/showroom endpoints

Month 5–6:
  - Metric check: DAU/MAU ratio target > 25%
  - If < 25%: focus on retention features (notifications, stories, chat)
  - If > 25%: focus on acquisition (referral, partnerships)
  - Infrastructure: scale Redis if command count > 8K/day
```

**Cost at end of Month 6:** ~$80–200/month

**Revenue at this point (if growing):** ETB 30,000–100,000/month

---

## Month 6–12: Product-Market Fit (5,000 → 30,000 users)

**Goal:** Consistent week-over-week growth. Revenue covers infrastructure.

```
Month 6–7:
  - Railway: Upgrade to Team plan, consider 2nd instance
  - Neon: Evaluate read replica (if read queries > 70% of DB load)
  - Add: Status page at status.halehame.app
  - Hire: First part-time DevOps/SRE contractor

Month 7–8:
  - Socket.IO Redis adapter (if adding 2nd Railway instance)
  - Deploy BullMQ worker as separate Railway service
  - Add: Cloudflare Pro for WAF + better analytics
  - Security audit #1 (self-audit using OWASP checklist)

Month 9–10:
  - Full observability review: add missing metrics
  - Database performance review with DBA consultant
  - Add: Synthetic monitoring (simulate buyer journey every 5 min)
  - Plan: East Africa expansion infrastructure

Month 11–12:
  - Deploy Railway EU instance for diaspora users
  - Add Neon EU read replica
  - Disaster recovery drill: simulate database failure + restore
  - Year-end review: costs, performance, incidents
```

**Cost at end of Month 12:** ~$300–600/month

**Revenue target at Month 12:** ETB 500,000–1,000,000/month (well above infra costs)

---

## Year 2: Scale (30,000 → 200,000 users)

**Goal:** Build for 10x current scale. Hire infrastructure team.

```
Q1 (Month 13–15):
  - Hire full-time backend engineer + SRE/DevOps engineer
  - Complete Meilisearch integration (replace PostgreSQL ILIKE)
  - Add Neon Scale plan with read replicas
  - Launch mobile app (TWA on Google Play)
  - Add Firebase Cloud Messaging for native push

Q2 (Month 16–18):
  - Multi-region deployment (US + EU + Middle East for diaspora)
  - Database connection pooling review (PgBouncer or Neon Enterprise)
  - Add ClickHouse or BigQuery for analytics (business intelligence)
  - Security audit #2 (external penetration testing)

Q3 (Month 19–21):
  - Evaluate migration from Railway to AWS/GCP for cost savings
  - (Railway is great until ~$1,000/month; AWS cheaper beyond that)
  - Add Kubernetes if deploying to AWS (EKS)
  - Begin SOC 2 Type II compliance process (if enterprise clients needed)

Q4 (Month 22–24):
  - React Native mobile app launch (iOS + Android)
  - APNs integration for iOS push notifications
  - Kenya/Tanzania infrastructure (M-Pesa integration live)
  - Year 2 review + Year 3 infrastructure planning
```

**Cost at end of Year 2:** ~$2,000–8,000/month

---

## Year 3+: Enterprise (200,000 → 1,000,000+ users)

```
Infrastructure team: 5–10 SRE engineers
Tools: AWS/GCP, Kubernetes, Terraform, DataDog
Compliance: SOC 2 Type II, ISO 27001
Cost: $20,000–100,000+/month
Revenue: Covering infra easily at this scale

Key projects:
  - Data platform (Snowflake/BigQuery for BI)
  - ML infrastructure (recommendation engine, personalized feed)
  - Global CDN (Cloudflare Enterprise or AWS CloudFront)
  - Multi-database strategy (PostgreSQL + Redis + Elasticsearch + ClickHouse)
  - Microservices extraction (notification-service, search-service, payment-service)
```

---

## Infrastructure Decision Timeline

| Decision | Trigger | Timeframe |
|---|---|---|
| Activate R2 storage | Before launch | Month 0 |
| Go live with Stripe | Before first user | Month 0 |
| Enable Redis | Before 1,000 users | Month 0–1 |
| BullMQ workers | Before 2,000 users | Month 2–3 |
| Add 2nd Railway instance | CPU > 60% | Month 4–6 |
| Socket.IO Redis adapter | Before 2nd instance | Month 4–6 |
| Neon read replica | DB reads > 70% load | Month 6–9 |
| Meilisearch | Search p95 > 500ms | Month 6–12 |
| External security audit | Before 50K users | Month 8–12 |
| Mobile app (TWA) | Stable web app | Month 9–12 |
| Multi-region deploy | Users in EU/Middle East | Month 12–18 |
| AWS migration | Railway cost > $1,000/mo | Month 18–24 |
| Kubernetes | Microservices needed | Month 24+ |
| SOC 2 Type II | Enterprise clients | Month 24+ |
| React Native app | 50K+ active users | Month 18–24 |
