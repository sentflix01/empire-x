# Nodbusiness — Cost Breakdown by Growth Stage

> Realistic monthly infrastructure costs at every milestone.
> All costs in USD. Reference market (ETB) conversion: ~130 ETB/USD (adjust for current rate).
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Upstash Redis · Cloudflare R2 · Resend

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| USD | United States Dollar |
| ETB | Ethiopian Birr — reference market currency |
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
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

## Stage 0: Development / Pre-Launch
**Users:** 0–100 (team + beta testers)
**Monthly cost:** **$0/month**

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Oracle Cloud (backend VM) | Always Free — 2 OCPU / 12 GB ARM | $0 | Johannesburg region |
| Coolify v4 (PaaS manager) | Self-hosted, open source | $0 | Runs on Oracle VM |
| Cloudflare Pages (frontend) | Free — unlimited bandwidth | $0 | Auto-deploys from GitHub |
| Supabase (PostgreSQL) | Free — 500 MB / 5 GB egress | $0 | Keep-alive cron prevents pause |
| Upstash Redis | Free — 500K cmd/month | $0 | Updated March 2026 |
| Cloudflare R2 (storage) | Free — 10 GB / 1M ops | $0 | Must activate before launch |
| Resend (email) | Free — 3K/month / 100/day | $0 | Already configured |
| Uptime Kuma (monitoring) | Self-hosted on Oracle VM | $0 | 1-minute checks, Telegram alerts |
| Cloudflare (DNS/CDN/DDoS) | Free | $0 | Always-on DDoS protection |
| Sentry (error tracking) | Free — 5K errors/month | $0 | |
| Domain (yourdomain.com) | Annual ÷ 12 | ~$1.50 | Cloudflare Registrar ~$12/year |
| **Total** | | **~$1.50/month** | Domain is the only cost |

**ETB equivalent:** ~ETB 195/month

> Previous stack (Railway + Vercel Hobby): $5–6/month. New stack saves $5/month and eliminates the Render sleep problem and Vercel commercial-use ToS violation.

---

## Stage 1: Soft Launch
**Users:** 100–1,000 MAU
**Monthly cost:** ~$0–5/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Oracle Cloud (backend VM) | Always Free | $0 | Same VM — no upgrade needed |
| Coolify v4 | Self-hosted | $0 | |
| Cloudflare Pages | Free | $0 | |
| Supabase PostgreSQL | Free → Pro ($25) | $0 | Upgrade when > 400 MB data |
| Upstash Redis | Free → PAYG | $0 | ~$0.20/100K cmds over 500K |
| Cloudflare R2 | Free | $0 | Well within 10 GB free |
| Resend | Free → $20 | $0 | Upgrade when >100 emails/day |
| Sentry | Free → Team ($26) | $0 | Upgrade at 5K errors/month |
| Stripe | 2.9% + $0.30/txn | Variable | Only on live payments |
| Chapa | 1.5–2%/txn | Variable | Only on live payments |
| **Total fixed** | | **~$0–5/month** | |

**ETB equivalent:** ~ETB 0–650/month

---

## Stage 2: Early Growth
**Users:** 1,000–10,000 MAU
**Monthly cost:** ~$30–80/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Oracle Cloud VM | Always Free | $0 | 2 OCPU / 12 GB still handles load |
| Coolify v4 | Self-hosted | $0 | |
| Cloudflare Pages | Free | $0 | Unlimited bandwidth — no upgrade |
| Supabase PostgreSQL | Pro ($25) | $25 | Upgrade when > 400 MB or 5 GB egress |
| Upstash Redis | Pay-as-you-go | $5–15 | ~$0.20/100K cmds |
| Cloudflare R2 | Pay-as-you-go | $0.50 | ~22 GB × $0.015 |
| Resend | Starter ($20) | $20 | 50K emails/month when volume grows |
| Sentry | Free → Team ($26) | $0–26 | Upgrade at 5K errors/month |
| Domain + SSL | Annual ÷ 12 | $1.50 | |
| **Total** | | **~$30–70/month** | |

**ETB equivalent:** ~ETB 3,900–9,100/month

**Revenue to cover costs (at 3% commission, ETB 500 avg order):**
→ Need ~250 orders/month to cover infra = ~8 orders/day

---

## Stage 3: Growth
**Users:** 10,000–100,000 MAU
**Monthly cost:** ~$150–400/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Oracle Cloud VM | Always Free | $0 | May need Hetzner upgrade at ~50K MAU |
| Coolify v4 | Self-hosted | $0 | |
| Cloudflare Pages | Free | $0 | |
| Supabase PostgreSQL | Pro ($25) → Team ($599) | $25–100 | Scale up compute units |
| Upstash Redis | Pay-as-you-go | $20–60 | Higher command volume |
| Cloudflare R2 | Pay-as-you-go | $2–10 | 100–500 GB storage |
| Cloudflare Pro | Pro ($20) | $20 | WAF + better analytics |
| Resend | Growth ($89) | $89 | 50K emails/month |
| Sentry | Team ($26) | $26 | 50K errors |
| Uptime Kuma | Self-hosted | $0 | |
| **Total** | | **~$160–305/month** | |

**ETB equivalent:** ~ETB 21,000–40,000/month

**Note on Oracle VM at this scale:** The 2 OCPU / 12 GB ARM instance handles ~500–2,000 concurrent users before saturation. At ~50K MAU and heavy real-time usage, consider adding a second Hetzner CAX21 instance (€8/month) behind Cloudflare Load Balancer, with Socket.IO Redis adapter to share WebSocket state.

---

## Stage 4: Scale
**Users:** 100,000–1,000,000 MAU
**Monthly cost:** ~$500–2,000/month

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Hetzner CAX21 × 2 (backend) | 4 vCPU / 8 GB each | $20 | Replace Oracle VM for predictability |
| Coolify v4 | Self-hosted | $0 | |
| Cloudflare Pages | Free | $0 | |
| Supabase Team | $599/month | $599 | Dedicated compute, no pause risk, read replicas |
| Upstash Redis | Fixed plan ($10/month) | $10–50 | Consistent traffic |
| Cloudflare R2 | Pay-as-you-go | $15–50 | 1–3 TB storage |
| Cloudflare Business | Business ($200) | $200 | Advanced WAF, DDoS SLA |
| Resend Business | $249/month | $249 | 200K emails/month |
| Sentry Business | $80/month | $80 | 100K errors |
| Meilisearch Cloud | Start ($30) | $30 | When PostgreSQL search is too slow |
| **Total** | | **~$1,200–1,300/month** | |

**ETB equivalent:** ~ETB 156,000–169,000/month

**Revenue to cover costs (at 3% commission + subscriptions):**
→ At 100K users, revenue should be ETB 1–5M/month
→ Infrastructure is ~5–15% of revenue (healthy ratio)

---

## Stage 5: Enterprise
**Users:** 1,000,000+ MAU
**Monthly cost:** $10,000–50,000+/month

At this scale:
- Move backend to **AWS ECS** (Fargate) or **GCP Cloud Run** with proper auto-scaling
- Move database to **AWS RDS Aurora PostgreSQL** (multi-AZ read replicas)
- Full-time SRE team (10–30 engineers)
- SOC 2 Type II compliance ($30–100K one-time)
- Custom Cloudflare Enterprise contract
- This is not a concern today. Build for this when at 200K+ MAU.

---

## Cost Optimization Rules

### 1. Free tiers available right now (September 2026)

| Service | Free allowance |
|---|---|
| Oracle Cloud (VM) | 2 OCPU / 12 GB RAM / 200 GB storage — always free |
| Coolify v4 | Fully free — no feature paywalls |
| Cloudflare Pages | Unlimited bandwidth, 500 builds/month |
| Supabase | 500 MB DB, 5 GB egress, 50K MAU |
| Upstash Redis | 500K commands/month |
| Cloudflare R2 | 10 GB storage, 1M Class A ops, zero egress |
| Resend | 3K emails/month, 100/day |
| Sentry | 5K errors/month |
| Uptime Kuma | Free, self-hosted |
| Cloudflare DNS/DDoS | Always free |

**Combined value of free tier services: ~$400+/month equivalent**

### 2. Cost-per-user benchmarks

| Stage | Cost/month | Users | Cost per user |
|---|---|---|---|
| Stage 0 | $1.50 | 100 | $0.015 |
| Stage 1 | $5 | 1,000 | $0.005 |
| Stage 2 | $50 | 10,000 | $0.005 |
| Stage 3 | $250 | 100,000 | $0.0025 |
| Stage 4 | $1,300 | 500,000 | $0.0026 |

As users grow, cost-per-user **decreases** — economies of scale.

### 3. The biggest cost risk to watch

| Risk | Prevention |
|---|---|
| Supabase egress overage | Enable Supavisor pooling; add `Cache-Control` headers to read endpoints |
| Upstash command burst | Monitor Upstash dashboard; PAYG is cheap if occasional |
| R2 storage overage | Run `sharp` compression on every upload; limit video uploads |
| Resend daily cap | Rate-limit OTP emails; monitor bounce rates |
| Oracle VM capacity (Oracle cuts again) | Contingency: Hetzner CAX11 at €4.29/month — migrate in 2 hours |

### 4. Cost Monitoring Setup

```bash
# Set billing alerts on each platform:

# Supabase: Project Settings → Billing → Usage Alerts → alert at 80% of plan
# Upstash: Dashboard → Budget Alerts → alert at $5/month
# Cloudflare: Notifications → Billing Alerts → set $1 threshold
# R2: Cloudflare → Notifications → R2 Storage alert at 80% of 10GB
# Resend: Settings → Email volume → daily alert at 80 emails
```

Check costs **weekly** at Stage 0–2, **daily** at Stage 3+.
