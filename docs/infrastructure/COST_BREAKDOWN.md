# Nodbusiness — Cost Breakdown by Growth Stage

> Realistic monthly infrastructure costs at every milestone.
> All costs in USD. Reference market (ETB) conversion: ~130 ETB/USD (adjust for current rate).
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| USD | United States Dollar |
| ETB | Ethiopian Birr — reference market currency |
| MAU | Monthly Active Users |
| CDN | Content Delivery Network |
| R2 | Cloudflare R2 — object storage |
| DB | Database |
| API | Application Programming Interface |
| RAM | Random Access Memory |
| CPU | Central Processing Unit |
| MRR | Monthly Recurring Revenue |
| GMV | Gross Merchandise Value |
| COGS | Cost of Goods Sold |

---
---

## Stage 0: Development / Pre-Launch
**Users:** 0–100 (team + beta testers)
**Monthly cost:** ~$5–15/month

| Service | Plan | Cost/month |
|---|---|---|
| Railway (backend) | Hobby | $5 |
| Vercel (frontend) | Hobby (free) | $0 |
| Neon PostgreSQL | Free (0.5 CU, 3GB) | $0 |
| Redis (Upstash) | Free (10K cmds/day) | $0 |
| Cloudflare R2 | Free (10GB, 1M ops) | $0 |
| Resend (email) | Free (3K/month) | $0 |
| Sentry | Free (5K errors/month) | $0 |
| Domain (nodbusiness.vercel.app) | Annual ÷ 12 | ~$1.50 |
| **Total** | | **~$6.50/month** |

**ETB equivalent:** ~ETB 812/month

---

## Stage 1: Soft Launch
**Users:** 100–1,000 MAU
**Monthly cost:** ~$30–60/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Railway (backend) | Starter ($10 credit included) | $10–20 | More RAM as traffic grows |
| Vercel (frontend) | Hobby (free) | $0 | Still within free tier |
| Neon PostgreSQL | Free → Launch ($19) | $0–19 | Upgrade when > 3GB data |
| Redis (Upstash) | Free → Pay-as-you-go | $0–5 | ~$0.2 per 100K commands |
| Cloudflare R2 | Free | $0 | Well within 10GB free |
| Resend (email) | Free → Starter ($20) | $0–20 | Upgrade at ~3K emails/month |
| Sentry | Free → Team ($26) | $0 | Upgrade at 5K errors/month |
| Stripe | 2.9% + $0.30/txn | Variable | Only when processing live payments |
| Chapa | 1.5–2% per txn | Variable | Only on live payments |
| **Total fixed** | | **~$30–65/month** |

**ETB equivalent:** ~ETB 3,750–8,125/month

---

## Stage 2: Early Growth
**Users:** 1,000–10,000 MAU
**Monthly cost:** ~$150–300/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Railway (backend) | Team ($20) + usage | $40–80 | More CPU/RAM |
| Vercel (frontend) | Pro ($20) | $20 | Team features, analytics |
| Neon PostgreSQL | Launch ($19) | $19 | 10GB storage |
| Redis (Upstash) | Pay-as-you-go | $10–30 | ~50M commands/month |
| Cloudflare R2 | Pay-as-you-go | $0–5 | ~20–50 GB storage |
| Resend (email) | Growth ($89) | $89 | 50K emails/month |
| Sentry | Team ($26) | $26 | 50K errors |
| UptimeRobot | Pro ($8) | $8 | Uptime monitoring + alerts |
| Domain + SSL | Annual ÷ 12 | $2 | Cloudflare (free SSL) |
| **Total** | | **~$215–260/month** |

**ETB equivalent:** ~ETB 27,000–33,000/month

**Revenue to cover costs (at 6% commission, ETB 500 avg order):**
→ Need ~900 orders/month to cover infrastructure = ~30 orders/day

---

## Stage 3: Growth
**Users:** 10,000–100,000 MAU
**Monthly cost:** ~$500–1,500/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Railway (backend) | Team + 2 instances | $80–200 | Horizontal scaling starts |
| Vercel (frontend) | Pro | $20 | |
| Neon PostgreSQL | Scale ($69–199) | $69–199 | 50–200GB, connection pooler |
| Redis (Upstash) | Pay-as-you-go | $30–100 | High throughput |
| Cloudflare R2 | Pay-as-you-go | $5–25 | 100–500 GB storage |
| Cloudflare CDN | Free–Pro ($20) | $0–20 | DDoS protection, analytics |
| Resend (email) | Business ($249) | $249 | 200K emails/month |
| Sentry | Business ($80) | $80 | 100K errors |
| PagerDuty (on-call) | Free | $0 | |
| BullMQ (background jobs) | Self-hosted on Railway | $10–20 | Dedicated worker |
| Meilisearch (search) | Cloud Start ($30) | $30 | When PostgreSQL search is too slow |
| **Total** | | **~$575–900/month** |

**ETB equivalent:** ~ETB 72,000–113,000/month

**Revenue to cover costs (at 6% commission, ETB 800 avg order):**
→ Need ~2,400 orders/month = ~80 orders/day (very achievable at 10K+ users)

---

## Stage 4: Scale
**Users:** 100,000–1,000,000 MAU
**Monthly cost:** ~$3,000–10,000/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Railway (backend) | Team + 5 instances | $300–800 | Multiple regions |
| Vercel (frontend) | Enterprise ($500+) | $500 | |
| Neon PostgreSQL | Enterprise | $300–800 | Read replicas, multiple regions |
| Redis (Upstash) | Enterprise | $100–500 | Redis Cluster |
| Cloudflare R2 | Pay-as-you-go | $50–200 | 1–5 TB storage |
| Cloudflare CDN | Business ($200) | $200 | WAF, rate limiting |
| Email | SendGrid Pro / AWS SES | $200–500 | 1M+ emails/month |
| Sentry | Business / Enterprise | $200–500 | |
| Meilisearch | Cloud Scale | $100–300 | |
| PagerDuty | Team ($21/user/mo) | $100–300 | 5–15 on-call engineers |
| DataDog / Grafana Cloud | Professional | $100–500 | Full observability stack |
| Legal / Compliance | Recurring | $200–500 | Data protection, legal reviews |
| **Total** | | **~$2,350–5,100/month** |

**ETB equivalent:** ~ETB 294,000–638,000/month

**Revenue to cover costs (at 6% commission + subscriptions):**
→ At 100K users, revenue should be ETB 1–5M/month
→ Infrastructure is ~10–20% of revenue (healthy ratio)

---

## Stage 5: Enterprise
**Users:** 1,000,000+ MAU
**Monthly cost:** $20,000–100,000+/month

At this scale, most companies move to:
- **AWS, GCP, or Azure** direct (not Railway/Vercel) for better pricing at volume
- **Dedicated database servers** (RDS PostgreSQL or Aurora)
- **Full-time SRE (Site Reliability Engineering) team** of 10–30 engineers
- **Custom CDN configuration** with Cloudflare Enterprise
- **SOC 2 Type II certification** ($30–100K one-time)

This is not a concern today. Build for this scale when you're at 200K+ users.

---

## Cost Optimization Rules

### 1. Start on free tiers
Every service has a generous free tier. Don't pay until you hit the limit.
Railway Hobby ($5) → Starter ($20) → Team ($50) — only upgrade when needed.

### 2. Free tiers available right now
| Service | Free allowance |
|---|---|
| Vercel | Unlimited personal projects |
| Neon | 0.5 CU compute, 3 GB storage |
| Upstash Redis | 10,000 commands/day |
| Cloudflare R2 | 10 GB storage, 1M Class A ops |
| Resend | 3,000 emails/month |
| Sentry | 5,000 errors/month |
| PagerDuty | 1 user free |
| UptimeRobot | 50 monitors, 5-min checks |

**Combined value of free tier services: ~$300/month equivalent**

### 3. Cost-per-user benchmarks
| Stage | Cost/month | Users | Cost per user |
|---|---|---|---|
| Stage 0 | $7 | 100 | $0.07 |
| Stage 1 | $50 | 1,000 | $0.05 |
| Stage 2 | $250 | 10,000 | $0.025 |
| Stage 3 | $750 | 100,000 | $0.0075 |
| Stage 4 | $4,000 | 500,000 | $0.008 |

As users grow, cost-per-user **decreases** — economies of scale.

### 4. The biggest cost killers to watch
| Risk | Prevention |
|---|---|
| Runaway database queries | Connection pooling, query optimization, `EXPLAIN ANALYZE` |
| Unbounded Redis memory | Set `maxmemory` and eviction policy |
| Large image uploads | Compress before storing, limit to 10MB |
| Email spam from bugs | Rate limit OTP emails; monitor bounce rates |
| Unused Railway instances | Auto-sleep on Hobby tier when idle |

---

## Cost Monitoring Setup

```bash
# Set billing alerts on each platform:

# Railway: Settings → Billing → Usage Alerts → Alert at $50, $100, $200
# Vercel: Settings → Billing → Spend Management → Set limit
# Neon: Project Settings → Usage → Set alert at 80% of plan
# Upstash: Budget Alerts → Alert at 80% of daily limit
# Cloudflare: Notifications → Billing alerts
# Resend: Settings → Billing → Usage threshold alerts
```

Check costs **weekly** at Stage 0–2, **daily** at Stage 3+.
