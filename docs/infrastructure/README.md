# Empire X — Infrastructure Documentation

> Everything about how Empire X runs, scales, costs, and stays alive.
> **Last updated:** August 2026

---

## Document Index

| File | Description | Read when |
|---|---|---|
| `CURRENT_STATE.md` | What's running right now — tools, costs, gaps | Starting out / auditing |
| `LAUNCH_CHECKLIST.md` | ⭐ Every item to verify before real users | **Read this first** |
| `COST_BREAKDOWN.md` | Monthly costs at every growth stage (1K → 1M users) | Planning budget |
| `SCALING_PLAN.md` | What infrastructure changes at each user milestone | Adding capacity |
| `TIMELINE.md` | Month-by-month infrastructure roadmap | Planning ahead |
| `CAPACITY_PLANNING.md` | Exact numbers: requests/sec, DB size, storage at each scale | Engineering decisions |
| `CLOUD_PROVIDERS.md` | Why Railway/Vercel/Neon/R2 — alternatives compared | Choosing providers |
| `DATABASE_STRATEGY.md` | PostgreSQL evolution: single → replicas → sharding | Database planning |
| `CDN_AND_STORAGE.md` | Cloudflare R2 setup, image optimization, video strategy | File storage |
| `NETWORKING.md` | Domains, DNS, SSL, Cloudflare, load balancing | Domain setup |
| `SECURITY_HARDENING.md` | Security at every layer — OWASP, hardening, pen testing | Security review |
| `MONITORING_STACK.md` | Sentry, Pino, PostHog, alerts, dashboards | Observability setup |
| `CI_CD_PIPELINE.md` | Build → test → deploy pipeline in detail | DevOps setup |
| `DISASTER_RECOVERY.md` | Backup, failover, RTO/RPO targets, recovery playbooks | Incident response |

---

## Infrastructure Philosophy

1. **Buy before build** — Use managed services until they become a bottleneck
2. **Pay for what you use** — Start on free/cheap tiers; upgrade when metrics demand it
3. **Automate everything** — Every deployment, test, and alert must be automated
4. **No single points of failure** — Database, cache, and API all need fallbacks
5. **Cost-aware engineering** — Every architectural decision includes a cost estimate
6. **Africa-first latency** — Optimize for users in East Africa, not Silicon Valley
7. **Security by default** — Auth checks, parameterized SQL, HTTPS everywhere from day 1

---

## Quick Reference: What to Do Right Now

### Pre-Launch (This Week) 🔴

```bash
# 1. Activate Cloudflare R2 (files lost on Railway deploy without this!)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=empire-x-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# 2. Configure Sentry
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o123.ingest.sentry.io/789

# 3. Set VAPID keys for push notifications
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@empirex.app

# 4. Register domain + Cloudflare DNS
# 5. Register Stripe live webhook
# 6. Register Chapa live key
```

### Monthly (Ongoing) 🟡

```bash
# Security audit
cd backend && npm audit --audit-level=moderate
cd frontend-next && npm audit --audit-level=moderate

# Performance check
railway logs | grep "responseTimeMs" | awk '{print $NF}' | sort -n | tail -20

# Cost review
# Check Railway, Neon, Upstash, R2 dashboards
# Are we still on appropriate plan tiers?

# Database health
psql $DATABASE_URL -c "
  SELECT query, calls, round(mean_exec_time::numeric, 1) AS avg_ms
  FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Cost Summary by Stage

| Stage | Users | Monthly cost | Revenue/month | Infra % |
|---|---|---|---|---|
| Pre-launch | 0 | $7 | $0 | N/A |
| Soft launch | 1K | $30–60 | ETB 15K+ | ~25% |
| Early growth | 10K | $150–250 | ETB 100K+ | ~15% |
| Growth | 50K | $300–500 | ETB 500K+ | ~8% |
| Scale | 200K | $1,500–3,000 | ETB 3M+ | ~6% |
| Enterprise | 1M+ | $20K–50K | ETB 15M+ | ~15% |

---

## Infrastructure Stack Snapshot (August 2026)

```
┌─────────────────────────────────────────────────┐
│                   USERS                          │
│         Browser / PWA / Android                 │
└─────────────┬───────────────────────────────────┘
              │ HTTPS
              ▼
┌─────────────────────────────────────────────────┐
│              CLOUDFLARE                          │
│    DNS + CDN + SSL + DDoS + WAF (free)          │
└─────────────┬──────────┬───────────────────────┘
              │          │
              ▼          ▼
┌──────────────┐  ┌──────────────────────────────┐
│    VERCEL    │  │         RAILWAY              │
│  Next.js 16  │  │   Node.js + Express + WS     │
│  Global Edge │  │   US-West (single instance)  │
└──────────────┘  └──────────────┬───────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
          ┌──────────────┐ ┌─────────┐ ┌──────────┐
          │     NEON     │ │ UPSTASH │ │    R2    │
          │ PostgreSQL   │ │  Redis  │ │  Files   │
          │ (free tier)  │ │ (stub)  │ │ (local!) │
          └──────────────┘ └─────────┘ └──────────┘
                                ⚠️ R2 not activated yet
```

**Current gaps (fix before launch):**
- R2 not activated → uploads lost on redeploy
- Redis stub → no caching
- Sentry not configured → no error visibility
- No domain → using .railway.app URL
