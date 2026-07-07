# Empire X — Monitoring & Observability

> You can't improve what you don't measure. Set up monitoring before going to production.

---

## Tools

| Tool | What it monitors | Setup |
|---|---|---|
| **Sentry** | Frontend + backend errors and crashes | Add `SENTRY_DSN` to Railway and Vercel |
| **Pino** | Structured backend logs (JSON) | Already wired — runs automatically |
| **Better Uptime** | Site uptime + alert when down | Free — add `/health` endpoint monitor |
| **Railway Metrics** | CPU, memory, response times | Built into Railway dashboard |
| **Vercel Analytics** | Page views, Web Vitals, Core Web Vitals | One-click enable in Vercel dashboard |
| **Datadog** (Phase 2+) | Full APM, trace every request, DB queries | Add when at 10K+ users |

---

## Sentry Setup

### Backend
```bash
# Already in package.json
# Just set the env var in Railway:
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
```

`backend/lib/sentry.js` is already wired into `index.js` — errors are captured automatically.

### Frontend (Next.js)
```bash
cd frontend-next
npx @sentry/wizard@latest -i nextjs
```

This creates `sentry.client.config.ts`, `sentry.server.config.ts`, and `instrumentation.ts`.

Add to Vercel env vars:
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
SENTRY_ORG=your-org
SENTRY_PROJECT=empire-x-frontend
```

---

## Health Check

The backend exposes a health endpoint that checks every service:

```
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2026-07-04T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected | not configured",
    "ai": "openai | not configured",
    "email": "resend | smtp | console",
    "storage": "r2 | local"
  }
}
```

Set up Better Uptime to hit this URL every 1 minute and alert you (email/SMS/Slack) if it returns anything other than 200.

---

## Key Metrics to Track

### Business Metrics (CEO Dashboard)

Track these weekly. Build an admin page at `/admin` that surfaces them.

| Metric | SQL / Source |
|---|---|
| Daily Active Users | `SELECT COUNT(DISTINCT user_id) FROM user_profiles WHERE updated_at > NOW() - INTERVAL '1 day'` |
| New registrations today | `SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day'` |
| GMV this month | `SELECT SUM(total_price) FROM orders WHERE status IN ('paid','completed') AND created_at > date_trunc('month', NOW())` |
| Orders today | `SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 day'` |
| Payment success rate | Stripe Dashboard → Payments |
| Active showrooms | `SELECT COUNT(*) FROM showrooms WHERE status = 'published'` |
| Products listed | `SELECT COUNT(*) FROM products WHERE status = 'active'` |
| Messages sent today | `SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 day'` |

### Engineering Metrics (DORA Metrics)

| Metric | Target | How to measure |
|---|---|---|
| Deployment frequency | Daily | Count GitHub deployments |
| Lead time for changes | <1 hour (MVP) | PR open → deployed |
| Failed deployment rate | <5% | CI/CD failures |
| Mean time to recovery | <30 min | Incident start → resolved |

### API Performance

Monitor these in Railway Metrics or Datadog:

| Metric | Target |
|---|---|
| Average response time | <200ms |
| p95 response time | <500ms |
| Error rate | <0.1% |
| 5xx rate | <0.01% |

---

## Structured Logging (Pino)

The backend uses Pino for structured JSON logs. Every log entry has:
- `timestamp`
- `level` (info, warn, error, debug)
- `msg` (human-readable message)
- Custom fields (e.g., `userId`, `orderId`, `route`)

**Reading logs in Railway:**
- Railway → Service → Logs
- Filter by level: search `"level":50` for errors (Pino level 50 = error)

**Never log:**
- Passwords or password hashes
- JWT tokens
- Full request bodies on auth endpoints
- Database connection strings

---

## Alerts to Configure

Set these up in Better Uptime or PagerDuty:

| Alert | Trigger | Action |
|---|---|---|
| Backend down | `/health` returns non-200 | Page on-call developer |
| High error rate | Sentry > 100 new errors/hour | Notify Slack |
| Database slow | Query time > 2s in Datadog | Investigate indexes |
| Payment failures | Stripe dashboard alert | Check webhook config |
| Memory spike | Railway CPU/RAM > 90% | Scale up or investigate leak |
| Redis down | `redis` in `/health` shows error | Check Upstash, app works without it (fallback) |
