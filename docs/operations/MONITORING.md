# Nodbusiness — Monitoring & Observability

> Everything needed to monitor Nodbusiness in production.
> Full observability reference lives in `docs/infrastructure/MONITORING_STACK.md`.
> This document covers the operational runbook: how to set up, check, and respond to monitoring alerts.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Uptime Kuma

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| P0/P1/P2/P3 | Priority 0/1/2/3 — incident severity |
| RCA | Root Cause Analysis |
| SLA | Service Level Agreement |
| DSN | Data Source Name — Sentry project identifier |
| CPU | Central Processing Unit |
| RAM | Random Access Memory |
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
| GMV | Gross Merchandise Value |
| UTC | Coordinated Universal Time |

---

## Tools In Use

| Tool | What it monitors | Status | Where to check |
|------|-----------------|--------|---------------|
| **Sentry** | Frontend + backend errors and crashes | Needs `SENTRY_DSN` set | sentry.io |
| **Pino** | Structured backend logs (JSON) | ✅ Active automatically | Coolify → Application → Logs |
| **DevOps Live Error Feed** | Real-time errors from all sources | ✅ Active | /devops → Live Errors |
| **Coolify Metrics** | CPU, RAM, network, container health | ✅ Active | Coolify → Application → Metrics |
| **Uptime Kuma** | Site availability, 1-min checks, Telegram alerts | Setup needed (self-hosted on Oracle VM) | Coolify → Uptime Kuma service |
| **Cloudflare Analytics** | Edge traffic, cached vs uncached requests | ✅ Available free | Cloudflare → Analytics |

> **Why Uptime Kuma instead of UptimeRobot:** UptimeRobot updated its Terms of Service in December 2024 to prohibit commercial use on the free plan. Nodbusiness is a commercial product. Uptime Kuma is self-hosted on the same Oracle VM via Coolify, fully free, has 1-minute checks (vs UptimeRobot's 5-minute), and integrates with the Telegram bot already configured.

For the full observability stack (PostHog, Grafana, DataDog), see `docs/infrastructure/MONITORING_STACK.md`.

---

## Minimum Setup (Do Before Launch)

### 1. Set Sentry DSN

```bash
# Sign up at sentry.io — create two projects:
# 1. "nodbusiness-backend" (Node.js)
# 2. "nodbusiness-frontend" (Next.js)

# Add to Coolify env vars:
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456

# Add to Cloudflare Pages env vars:
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o123.ingest.sentry.io/789
```

`backend/lib/sentry.ts` is already wired — just set `SENTRY_DSN`.

### 2. Deploy and Configure Uptime Kuma

```
In Coolify → your Oracle VM server:
1. New Service → search "Uptime Kuma" → Deploy
2. Access at: http://<oracle-vm-ip>:3001 (or set a custom domain like status.nodbusiness.app)
3. Create an admin account

Add these monitors (1-minute interval):
  Monitor 1: GET https://api.nodbusiness.app/health
             Type: HTTP keyword   Keyword: "ok"   → expects "status":"ok" in response
  Monitor 2: GET https://nodbusiness.app
             Type: HTTP           Expected: 200
  Monitor 3: GET https://status.supabase.com
             Type: HTTP           Expected: 200
  Monitor 4: GET https://status.upstash.com
             Type: HTTP           Expected: 200
  Monitor 5: GET https://api.nodbusiness.app/api/products
             Type: HTTP           Expected: 200

Alert contacts:
  Settings → Notifications → Add → Telegram
  Bot Token: <TELEGRAM_BOT_TOKEN>
  Chat ID: <TELEGRAM_CHAT_ID>
```

### 3. Verify DevOps Live Error Feed

Navigate to `/devops` → Live Errors tab. This is your real-time error dashboard — no extra setup needed.

---

## Daily Morning Check (5 minutes)

Run this every morning before starting work:

```
1. Open DevOps → Live Errors
   → Any critical or unresolved errors from overnight?

2. Check /health endpoint
   curl https://api.nodbusiness.app/health
   → All services should show "connected"

3. Check Coolify dashboard
   → Container CPU + RAM within normal range?
   → No failed deployments?

4. Check Sentry (if configured)
   → Any new error types appeared overnight?

5. Check Uptime Kuma
   → All monitors green? Any incidents in the past 24h?

6. Check Supabase storage (weekly)
   SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
   → Under 400 MB? (500 MB free tier limit)
```

---

## Key Metrics (Weekly Review)

Run these queries on the database for weekly review:

```sql
-- New registrations this week
SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*)
FROM users
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY day ORDER BY day;

-- Orders and GMV this week
SELECT
  COUNT(*) AS orders,
  SUM(total) AS gmv,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'paid') / NULLIF(COUNT(*),0), 1) AS payment_success_rate
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- Active users (posted or ordered this week)
SELECT COUNT(DISTINCT author_id) AS active_users
FROM posts
WHERE created_at > NOW() - INTERVAL '7 days';

-- Error counts by level (from DevOps)
SELECT level, COUNT(*), MAX(last_seen_at) AS last_seen
FROM error_events
WHERE resolved = false
GROUP BY level ORDER BY COUNT(*) DESC;
```

---

## Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|---------|--------|
| API error rate | > 1% | > 5% | Check Sentry + Coolify logs |
| P95 response time | > 1s | > 3s | Check slow queries, scale if needed |
| Supabase DB connections | > 15 direct | > 18 | Enable/check Supavisor pooler (port 6543) |
| Oracle VM RAM | > 70% of 12 GB | > 90% | Investigate memory leak; consider Hetzner upgrade |
| Oracle VM CPU | > 60% sustained | > 90% sustained | Add Hetzner instance + CF Load Balancer |
| Upstash commands | > 400K/month | > 480K/month | Upgrade to Upstash PAYG |
| Supabase DB size | > 400 MB | > 480 MB | Plan upgrade to Supabase Pro |
| Payment success rate | < 97% | < 95% | Check Stripe/Chapa status pages |
| Uptime | < 99.9% | < 99% | Investigate immediately via Uptime Kuma |

---

## When Alerts Fire

See `docs/operations/RUNBOOKS.md` for step-by-step response procedures.
See `docs/operations/INCIDENT_RESPONSE.md` for the full incident response playbook.
See `docs/operations/ON_CALL.md` for on-call rotation and escalation.

---

*For the full observability architecture (PostHog analytics, Grafana dashboards, advanced tracing), see `docs/infrastructure/MONITORING_STACK.md`.*
