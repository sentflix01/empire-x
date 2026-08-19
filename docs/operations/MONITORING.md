# Nodbusiness — Monitoring & Observability

> Everything needed to monitor Nodbusiness in production.
> Full observability reference lives in `docs/infrastructure/MONITORING_STACK.md`.
> This document covers the operational runbook: how to set up, check, and respond to monitoring alerts.
> Last updated: August 2026

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
| FTS | Full-Text Search |
| UTC | Coordinated Universal Time |

---

## Tools In Use

| Tool | What it monitors | Status | Where to check |
|------|-----------------|--------|---------------|
| **Sentry** | Frontend + backend errors and crashes | Needs `SENTRY_DSN` set | sentry.io |
| **Pino** | Structured backend logs (JSON) | ✅ Active automatically | Railway → Logs tab |
| **DevOps Live Error Feed** | Real-time errors from all sources | ✅ Active | /devops → Live Errors |
| **Railway Metrics** | CPU, RAM, response times | ✅ Active | railway.app dashboard |
| **UptimeRobot** | Site availability, uptime alerts | Configure at uptimerobot.com | uptimerobot.com |
| **Vercel Analytics** | Page views, Core Web Vitals | One-click enable | Vercel dashboard |

For the full observability stack (PostHog, Grafana, DataDog), see `docs/infrastructure/MONITORING_STACK.md`.

---

## Minimum Setup (Do Before Launch)

### 1. Set Sentry DSN

```bash
# Sign up at sentry.io — create two projects:
# 1. "nodbusiness-backend" (Node.js)
# 2. "nodbusiness-frontend" (Next.js)

# Add to Railway env vars:
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456

# Add to Vercel env vars:
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o123.ingest.sentry.io/789
```

`backend/lib/sentry.js` is already wired — just set `SENTRY_DSN`.

### 2. Configure UptimeRobot

At uptimerobot.com (free tier: 50 monitors, 5-minute checks):

```
Monitor 1: GET https://api.nodbusiness.app/health → expect 200
Monitor 2: GET https://nodbusiness.vercel.app → expect 200
Monitor 3: GET https://api.nodbusiness.app/api/products → expect 200

Alert contacts: Telegram channel + email
```

### 3. Verify DevOps Live Error Feed

Navigate to `/devops` → Live Errors tab. This is your real-time error dashboard — no extra setup needed.

---

## Daily Morning Check (5 minutes)

Run this every morning before starting work:

```
1. Open DevOps → Live Errors
   → Are there any critical or unresolved errors from overnight?

2. Check /health endpoint
   curl https://api.nodbusiness.app/health
   → All services should show "connected"

3. Check Railway dashboard
   → CPU + RAM within normal range?
   → No failed deployments?

4. Check Sentry (if configured)
   → Any new error types appeared overnight?

5. Check UptimeRobot
   → 100% uptime? Any incidents?
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
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'paid') / COUNT(*), 1) AS payment_success_rate
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
| API error rate | > 1% | > 5% | Check Sentry + Railway logs |
| P95 response time | > 1s | > 3s | Check slow queries, scale if needed |
| Database connections | > 80% of pool | > 95% | Increase pool or scale DB tier |
| RAM usage | > 70% | > 90% | Scale Railway instance |
| CPU usage | > 60% sustained | > 90% sustained | Scale Railway instance |
| Payment success rate | < 97% | < 95% | Check Stripe/Chapa status pages |
| Uptime | < 99.9% | < 99% | Investigate immediately |

---

## When Alerts Fire

See `docs/operations/RUNBOOKS.md` for step-by-step response procedures.
See `docs/operations/INCIDENT_RESPONSE.md` for the full incident response playbook.
See `docs/operations/ON_CALL.md` for on-call rotation and escalation.

---

*For the full observability architecture (PostHog analytics, Grafana dashboards, advanced tracing), see `docs/infrastructure/MONITORING_STACK.md`.*
