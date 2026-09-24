# Nodbusiness — Infrastructure Timeline

> Month-by-month infrastructure roadmap aligned with product and user growth.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Upstash Redis · Cloudflare R2

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| CI/CD | Continuous Integration / Continuous Delivery |
| DB | Database |
| R2 | Cloudflare R2 — object storage |
| PWA | Progressive Web App |
| SLA | Service Level Agreement |
| MRR | Monthly Recurring Revenue |
| GMV | Gross Merchandise Value |
| USD | United States Dollar |
| VM | Virtual Machine |

---

## Month 0 (Now): Pre-Launch Hardening

**Goal:** Make what's already built production-safe before a single real user pays.

```
Week 1: Infrastructure Setup
  Day 1:    Provision Oracle Cloud Johannesburg VM (Ampere A1, 2 OCPU, 12 GB)
            Install Coolify v4 (curl -fsSL https://get.coolify.io | bash)
  Day 2:    Deploy backend to Coolify, connect GitHub repo, configure env vars
            Set up Cloudflare Pages for frontend (connect GitHub repo, build settings)
  Day 3:    Configure Cloudflare DNS (A record for API, custom domain for CF Pages)
            Set Oracle VM security group: allow 443/80 from Cloudflare IPs only
  Day 4:    Set GitHub Secrets (COOLIFY_WEBHOOK_URL, COOLIFY_TOKEN, DATABASE_URL, etc.)
            Test full deploy pipeline: push → CI → Coolify webhook → health check
  Day 5:    Configure Cloudflare R2 bucket + set all R2_* env vars in Coolify
            Test: upload a file → verify R2 URL returned (not local disk)

Week 2: Payments, Push, Monitoring
  Day 1:    Register Stripe live account + webhook endpoint
  Day 2:    Register Chapa business account + live key
  Day 3:    Generate + set VAPID keys — test push notification on real device
  Day 4:    Configure Sentry (backend + frontend DSNs) — trigger test error
  Day 5:    Deploy Uptime Kuma on Oracle VM via Coolify — add all 5 monitors
            Test: confirm Telegram alert fires when monitor goes down

Week 3: Redis, Domain, Security
  Day 1:    Create Upstash Redis (free tier) → set REDIS_URL in Coolify
            Verify: curl /health → "redis": "connected"
  Day 2:    Register domain + configure email SPF/DKIM/DMARC via Cloudflare DNS
  Day 3:    Enable Supabase Supavisor pooling (switch app to port 6543 URL)
  Day 4:    Run security review: check admin routes, Cloudflare settings, HSTS
  Day 5:    Test Supabase keep-alive workflow (GitHub Actions → manual run)

Week 4: Beta Testing
  Days 1–5: Internal beta with 10–20 real users
             Monitor: Sentry errors, Coolify container health, payment success rate
             Monitor: Upstash command count, Supabase egress, R2 storage
             Fix: any issues before public launch
```

**End of Month 0 infrastructure state:**
- ✅ Oracle Cloud Johannesburg VM + Coolify v4 running
- ✅ Cloudflare Pages serving frontend globally
- ✅ Cloudflare R2 (file storage — no more local disk loss)
- ✅ Stripe live (card payments)
- ✅ Chapa live (ETB payments)
- ✅ Sentry (error tracking)
- ✅ Push notifications working
- ✅ Upstash Redis active (queues + cache)
- ✅ Custom domain with SSL via Cloudflare
- ✅ Uptime Kuma monitoring with Telegram alerts
- ✅ Supabase keep-alive cron active

**Monthly cost at end of Month 0: ~$1.50 (domain only)**

---

## Month 1–3: Soft Launch (0 → 500 users)

**Goal:** First 500 real users. Learn. Fix. Learn more.

```
Month 1: Launch
  - Public registration opens
  - Monitor: Coolify container CPU/RAM, Supabase storage, Upstash command count
  - Monitor: payment success rate, error rate in Sentry
  - Fix: any critical bugs within 24 hours
  - Metric target: 100 users, 10 orders

Month 2: Iterate
  - Fix top 5 user-reported issues
  - Add PostHog analytics (free: 1M events/month cloud tier)
  - Monitor: Supabase approaching 100 MB → no action yet
  - Metric target: 250 users, 30 orders

Month 3: Grow
  - First seller onboarding workshops
  - WhatsApp/Telegram promotion campaigns
  - Metric target: 500 users, 100 orders

Infrastructure changes this period:
  - If Upstash > 400K cmd/month: switch to PAYG ($0.20/100K)
  - If Resend daily cap hit: monitor closely, upgrade to $20/month if needed
  - If Sentry > 5K errors/month: upgrade to Team ($26/month)
```

**Monthly cost at end of Month 3: ~$1.50–5**

---

## Month 3–6: Growth Acceleration (500 → 5,000 users)

**Goal:** Reach product-market fit signal (users coming back without prompting).

```
Month 3–4:
  - Launch referral programme campaign
  - Add PostHog funnels (buyer journey, seller onboarding)
  - Infrastructure: BullMQ workers confirmed active via Upstash
  - Database: first slow-query audit via Supabase Query Performance panel
  - Monitor: Supabase storage and egress approaching limits

Month 4–5:
  - Upgrade Supabase to Pro ($25/month) when size > 400 MB
  - Add Cloudflare Web Analytics (free, edge-based, no JS performance impact)
  - Implement Cache-Control headers on product/showroom read endpoints

Month 5–6:
  - Metric check: DAU/MAU ratio target > 25%
  - If < 25%: focus on retention features
  - If > 25%: focus on acquisition
  - Monitor: Oracle VM CPU approaching 60% at peak? → plan Hetzner instance
```

**Monthly cost at end of Month 6: ~$30–60**

---

## Month 6–12: Product-Market Fit (5,000 → 30,000 users)

**Goal:** Consistent week-over-week growth. Revenue covers infrastructure.

```
Month 6–7:
  - If Oracle VM CPU > 60% sustained: provision Hetzner CAX21 (€8/month)
  - Add Socket.IO Redis adapter before adding second instance
  - Add Cloudflare Load Balancer ($5/month) for traffic distribution
  - Status page: Uptime Kuma public status page at status.nodbusiness.app

Month 7–8:
  - Upgrade Cloudflare to Pro ($20/month) for WAF + detailed analytics
  - Security audit #1 (self-audit using OWASP ZAP + manual checklist)
  - Supabase read replica evaluation (if read queries > 70% of DB load)

Month 9–10:
  - Full observability review: add missing Sentry performance monitoring
  - Database query optimization with pg_stat_statements analysis
  - Consider Meilisearch on Hetzner VM if search p95 > 500ms

Month 11–12:
  - Disaster recovery drill: simulate Oracle VM failure → Hetzner migration
  - Year-end review: costs, performance, incidents
  - Plan Year 2 infrastructure
```

**Monthly cost at end of Month 12: ~$100–200**

---

## Year 2: Scale (30,000 → 200,000 users)

**Goal:** Build for 10x current scale.

```
Q1 (Month 13–15):
  - Hire full-time backend engineer + part-time DevOps
  - Deploy Meilisearch on Hetzner (replaces PostgreSQL ILIKE at scale)
  - Supabase Scale plan evaluation ($599/month) or self-hosted PostgreSQL
  - TWA (Trusted Web App) on Google Play Store

Q2 (Month 16–18):
  - Multi-region: add Hetzner Helsinki for EU/Middle East diaspora users
  - Cloudflare Geographic Load Balancer (geo-route Africa vs Europe traffic)
  - Security audit #2 (external penetration testing: HackerOne or Cobalt)

Q3 (Month 19–21):
  - Evaluate migration from Coolify/Hetzner to AWS ECS when cost > $1,000/month
  - Add ClickHouse or Grafana Cloud for full observability
  - SOC 2 Type II compliance process (if enterprise clients needed)

Q4 (Month 22–24):
  - React Native mobile app launch (iOS + Android)
  - APNs for iOS push notifications
  - Kenya/Tanzania expansion (M-Pesa integration live)
  - Year 2 review + Year 3 infrastructure planning
```

**Monthly cost at end of Year 2: ~$500–1,500**

---

## Year 3+: Enterprise (200,000 → 1,000,000+ users)

```
Infrastructure team: 5–10 SRE engineers
Tools: AWS/GCP, Kubernetes, Terraform
Compliance: SOC 2 Type II, ISO 27001
Cost: $10,000–40,000/month
Revenue: Well above infrastructure costs at this scale
```

---

## Infrastructure Decision Timeline

| Decision | Trigger | Timeframe |
|---|---|---|
| Oracle VM + Coolify setup | Before development | Month -1 |
| Cloudflare Pages + CF DNS | Before launch | Month 0 |
| Activate R2 storage | Before first user | Month 0 |
| Go live with Stripe + Chapa | Before first user | Month 0 |
| Enable Upstash Redis | Before 500 users | Month 0 |
| Upgrade Supabase to Pro | DB > 400 MB or egress > 4 GB | Month 2–5 |
| Upstash PAYG | Commands > 400K/month | Month 2–4 |
| Add Hetzner + Socket.IO adapter | CPU > 60% sustained | Month 4–8 |
| Meilisearch search | Search p95 > 500ms | Month 6–12 |
| External security audit | Before 50K users | Month 8–12 |
| Multi-region deploy | EU/Middle East complaints | Month 12–18 |
| AWS migration | Coolify/Hetzner cost > $1,000/month | Month 18–24 |
| SOC 2 Type II | Enterprise clients | Month 24+ |
| React Native app | 50K+ active users | Month 18–24 |
