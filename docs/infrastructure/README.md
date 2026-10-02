# Nodbusiness — Infrastructure Documentation

> Everything about how Nodbusiness runs, scales, costs, and stays alive.
> **Last updated:** September 2026
> **Stack:** Render (backend) · Vercel (frontend) · Supabase · Upstash Redis · Cloudflare R2 · Resend

---

## Document Index

| File | Description | Read when |
|---|---|---|
| `CURRENT_STATE.md` | ⭐ What's running right now — tools, costs, env var status | Starting out / auditing |
| `LAUNCH_CHECKLIST.md` | ⭐ Every item to verify before real users | **Read this first** |
| `CLOUD_PROVIDERS.md` | Why Render/Vercel/Supabase — alternatives compared | Choosing providers |
| `CI_CD_PIPELINE.md` | Build → test → migrate → gated Render/Vercel deploys | DevOps setup |
| `COST_BREAKDOWN.md` | Monthly costs at every growth stage ($0 → $40K/month) | Planning budget |
| `SCALING_PLAN.md` | Exactly what to change at each user milestone | Adding capacity |
| `TIMELINE.md` | Month-by-month infrastructure roadmap | Planning ahead |
| `CAPACITY_PLANNING.md` | Exact numbers: req/sec, DB size, storage at each scale | Engineering decisions |
| `DATABASE_STRATEGY.md` | Supabase evolution: single → replicas → sharding | Database planning |
| `CDN_AND_STORAGE.md` | Cloudflare R2 setup, image optimization, video strategy | File storage |
| `NETWORKING.md` | Domains, DNS, SSL, Cloudflare proxy setup | Domain setup |
| `SECURITY_HARDENING.md` | Security at every layer — OWASP, pen testing | Security review |
| `MONITORING_STACK.md` | Sentry, Pino, PostHog, alerts, dashboards | Observability setup |
| `DISASTER_RECOVERY.md` | Backup, failover, RTO/RPO, contingency playbook | Incident response |
| `MIGRATION_GUIDE.md` | Safe database migration procedures | DB schema changes |
| `SCALABILITY_PLAN_GROWTH.md` | Architecture diagrams at each scale | System design |
| `SLO.md` | Service Level Objectives and error budgets | Reliability targets |

---

## Infrastructure Philosophy

1. **Free first, pay when metrics demand it** — The entire stack runs at $0 (except domain ~$1.50/month)
2. **Data is external, compute is disposable** — Supabase, R2, and Upstash are all external; the Render service can be swapped in minutes
3. **Automate everything** — Every deploy is triggered by GitHub Actions; every alert fires to Telegram automatically
4. **Africa-first latency** — Render backend + Cloudflare CDN for static assets
5. **Security by default** — TLS everywhere, parameterized SQL, Helmet.js headers
6. **No vendor lock-in** — All data is external (Supabase, R2, Upstash); migrating compute takes 30 minutes

---

## Quick Reference: What to Do Right Now

### Pre-Launch (This Week) 🔴

```bash
# 1. Activate Cloudflare R2 — files lost on Render redeploy without this!
# Set in Render environment variables:
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=nodbusiness-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# 2. Configure Sentry
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o123.ingest.sentry.io/789  # CF Pages

# 4. Set VAPID keys for push notifications
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@nodbusiness.app

# 5. Set GitHub Secrets
COOLIFY_WEBHOOK_URL=https://your-coolify-instance.com/api/v1/deploy?...
COOLIFY_TOKEN=...
DATABASE_URL=postgresql://...  # Supabase direct connection (port 5432)
BACKEND_URL=https://api.nodbusiness.app
FRONTEND_URL=https://nodbusiness.app

# 6. Register domain + Cloudflare DNS
# 7. Register Stripe live webhook
# 8. Register Chapa live key
# 9. Oracle VM security group: allow 443/80 from Cloudflare IPs only
```

### Monthly (Ongoing) 🟡

```bash
# Security audit
cd backend && npm audit --audit-level=high
cd frontend-next && npm audit --audit-level=high

# Performance check (Supabase Query Performance panel)
-- SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10

# Cost review
# Check: Supabase dashboard (storage/egress), Upstash dashboard (commands), R2 dashboard (storage)

# Database size check
-- SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;

# Verify backups are running
-- SELECT value FROM app_settings WHERE key = 'last_database_backup';
```

---

## Current Infrastructure Stack (September 2026)

```
┌───────────────────────────────────────────────────────────────┐
│                         USERS                                 │
│             Browser / PWA / Android                           │
└─────────────────────┬─────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌───────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE                               │
│   DNS + CDN + DDoS (L3/L4/L7) + SSL — 335+ PoPs globally    │
│   Nearest PoP to Ethiopia: Nairobi, Kenya                     │
└───────────┬───────────────────────────────────────────────────┘
            │
            ├──────────────────────────────┐
            │                              │
            ▼                              ▼
┌───────────────────────┐    ┌─────────────────────────────────┐
│   CLOUDFLARE PAGES    │    │   ORACLE CLOUD JOHANNESBURG      │
│   Next.js 16 (SPA)    │    │   ARM A1 — 2 OCPU / 12 GB RAM   │
│   335+ PoPs globally  │    │   Always Free ($0)               │
│   No commercial       │    │                                  │
│   restriction         │    │   ┌─────────────────────────┐   │
│   Unlimited bandwidth │    │   │     Coolify v4          │   │
│   $0/month            │    │   │  zero-downtime deploys  │   │
└───────────────────────┘    │   │  via HEALTHCHECK        │   │
                             │   └───────────┬─────────────┘   │
                             │               │                  │
                             │   ┌───────────▼─────────────┐   │
                             │   │  Node.js + Express      │   │
                             │   │  Socket.IO · BullMQ     │   │
                             │   │  46 routes · Port 10000 │   │
                             │   └─────────────────────────┘   │
                             │                                  │
                             │   ┌─────────────────────────┐   │
                             │   │     Uptime Kuma          │   │
                             │   │  1-min checks · Telegram │   │
                             │   └─────────────────────────┘   │
                             └─────────────────────────────────┘
                                           │
                         ┌─────────────────┼──────────────────┐
                         ▼                 ▼                  ▼
              ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
              │   SUPABASE    │  │   UPSTASH    │  │ CLOUDFLARE R2    │
              │  PostgreSQL   │  │    Redis     │  │  File Storage    │
              │  Free Tier    │  │  500K/month  │  │  10 GB + free    │
              │  500 MB / 5GB │  │  TLS always  │  │  egress          │
              │  keep-alive ✅ │  │  on (rediss) │  │  $0/month        │
              └───────────────┘  └──────────────┘  └──────────────────┘

Monthly cost: ~$1.50 (domain only)
```

---

## Cost Summary by Stage

| Stage | Users | Monthly cost | Revenue/month | Infra % |
|---|---|---|---|---|
| Pre-launch | 0 | $1.50 | $0 | N/A |
| Soft launch | 1K | $1.50–5 | ETB 15K+ | ~3% |
| Early growth | 10K | $30–70 | ETB 100K+ | ~5% |
| Growth | 50K | $190–215 | ETB 500K+ | ~3% |
| Scale | 200K | $1,040 | ETB 3M+ | ~4% |
| Enterprise | 1M+ | $15K–40K | ETB 15M+ | ~10–15% |

**Previous stack (Railway + Vercel Hobby) cost at Stage 0: $5–6/month with sleep-induced reliability problems and commercial ToS violations. New stack: $1.50/month, no sleep, no restrictions.**
