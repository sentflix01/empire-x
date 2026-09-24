# Nodbusiness — Cost Breakdown

> **Last updated:** September 22, 2026
> **Current monthly cost: $0**

---

## Current Stack — Zero Cost

| Service | Provider | Plan | Monthly Cost | Free Tier Limits |
|---|---|---|---|---|
| Backend hosting | Render | Free | $0 | 750h/mo, 0.1 CPU, 512MB RAM, sleeps after 15 min |
| Frontend hosting | Vercel | Hobby | $0 | 100GB bandwidth, unlimited deploys |
| Database | Supabase | Free | $0 | 500MB DB, 1GB storage, 2 projects |
| Redis | Upstash | Free | $0 | 500K commands/day, 256MB storage |
| Email | Resend | Free | $0 | 3,000 emails/month, 100/day |
| AI | Google Gemini | Free | $0 | Generous free tier (rate limited) |
| Google OAuth | Google Cloud | Free | $0 | Unlimited |
| Error tracking | Sentry | Free | $0 | 5K errors/month |
| CI/CD | GitHub Actions | Free | $0 | Public repository = unlimited |
| Keep-alive | cron-job.org | Free | $0 | Unlimited jobs |
| Uptime monitor | UptimeRobot | Free | $0 | 50 monitors, 5 min interval |
| **TOTAL** | | | **$0/mo** | |

---

## Upgrade Triggers and Costs

When the app grows, these are the first services that will need upgrading:

### Priority 1 — Before real users pay money

| Service | Upgrade reason | Cost |
|---|---|---|
| Vercel → Pro | Hobby ToS prohibits commercial use | $20/mo |
| Render → Starter | Eliminate cold starts, always-on | $7/mo |
| **Subtotal** | | **$27/mo** |

### Priority 2 — When traffic grows

| Service | Upgrade trigger | Cost |
|---|---|---|
| Supabase → Pro | >500MB data or >1GB storage | $25/mo |
| Upstash → Pay-as-you-go | >500K Redis commands/day | $0.20 per 100K commands |
| Resend → Pro | >3K emails/month | $20/mo for 50K emails |
| **Subtotal** | | **~$45/mo** |

### Priority 3 — Scale

| Service | Upgrade trigger | Cost |
|---|---|---|
| Render → Standard | >512MB RAM or need horizontal scaling | $25/mo |
| Sentry → Team | >5K errors/month | $26/mo |
| Cloudflare R2 | Supabase storage too slow/expensive | $0.015/GB storage + $0.36/M reads |
| **Subtotal** | | **~$50/mo** |

---

## Cost Projections

| Phase | Users | Monthly cost | Notes |
|---|---|---|---|
| Development | 0-10 (internal) | **$0** | Current state |
| Beta | 10-100 | **$27** | Upgrade Vercel + Render before launch |
| Early growth | 100-1,000 | **$72** | Add Supabase Pro, Resend Pro |
| Growth | 1,000-10,000 | **~$150** | Scale Redis, Render Standard |
| Scale | 10,000+ | **~$500+** | Depends on usage patterns |

---

## What Each Service Actually Costs at Scale

### Database (Supabase)
- Free: 500MB storage, 2 active projects
- Pro ($25/mo): 8GB storage, unlimited projects, daily backups, point-in-time recovery
- Scale requirement: >500MB data or needing PITR backups

### Redis (Upstash)
- Free: 500K cmd/day
- Pay-as-you-go: $0.20/100K commands — at 5M commands/day = $10/day = $300/mo
- Alternative: Switch to Redis on Render ($10/mo) for predictable cost at high traffic

### Email (Resend)
- Free: 3K emails/month
- Pro ($20/mo): 50K emails/month
- At 10K users receiving weekly digests = ~43K emails/month → Pro plan needed

### File Storage (Supabase Storage)
- Free: 1GB
- Pro ($25/mo): 100GB included
- Overflow: $0.021/GB additional
- R2 alternative (when needed): $0.015/GB storage + $0.36/M requests — cheaper at scale

---

## Cost Optimization Notes

- **Render free tier cold starts** are mitigated by cron-job.org pings (free). The $7/mo Starter upgrade buys always-on — worth it when real users arrive.
- **Upstash 500K/day limit** resets at midnight UTC. If the app hits this limit regularly, consider switching to Redis with a fixed monthly cost instead of pay-as-you-go.
- **Supabase free tier** pauses after 1 week of no DB queries. The `supabase-keepalive.yml` GitHub Actions workflow pings it every 6 hours to prevent this.
- **Vercel Hobby** is permanently free for non-commercial projects. The $20/mo Pro upgrade is only triggered by commercial use (real payments). Beta testing and demos are fine on Hobby.
- **GitHub Actions** is free for public repositories. If the repo is made private, the free tier allows 2,000 minutes/month — the current CI pipeline uses ~6 min/push, giving ~333 free pushes/month.

---

## Comparison: Current Stack vs Previous Plan

| Stack | Monthly cost | Always-on | Notes |
|---|---|---|---|
| **Current (Render+Vercel)** | **$0** | No (free tier) | Zero card required |
| Previous plan (Oracle+Coolify) | $0* | Yes | *Requires $1 card verification (blocked) |
| Koyeb | $0* | Yes | *Requires $29 card hold (blocked) |
| Railway | $0 (30 days) then $5/mo | Yes | Trial only, card eventually required |
| Self-hosted (VPS) | $3-6/mo | Yes | Requires card + server management |

The Render+Vercel stack is the only genuinely zero-cost option that works without a valid card. See ADR-016 for the full decision record.
