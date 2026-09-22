# Nodbusiness — Monitoring

> **Last updated:** September 22, 2026
> **Current monitoring stack:** cron-job.org + UptimeRobot + Sentry + Render Logs

---

## Monitoring Stack Overview

| Tool | Purpose | Where |
|---|---|---|
| **cron-job.org** | Keep-alive ping (prevent Render sleep) | https://cron-job.org |
| **UptimeRobot** | Uptime monitoring + email alerts | https://uptimerobot.com |
| **Sentry** | Error tracking + stack traces | https://sentry.io |
| **Render Logs** | Live server logs, deploys | Render → nodbusiness-backend → Logs |
| **Vercel Logs** | Frontend function logs | Vercel → nodbusiness → Logs |
| **GitHub Actions** | CI/CD pipeline status | https://github.com/sentflix01/empire-x/actions |
| **Backend `/health`** | Self-health endpoint | https://nodbusiness-backend-9psf.onrender.com/health |

---

## 1. cron-job.org — Keep-Alive

**Purpose:** Render free tier spins down after 15 minutes of inactivity. This monitor pings the health endpoint every minute to prevent that.

| Setting | Value |
|---|---|
| URL | `https://nodbusiness-backend-9psf.onrender.com/health` |
| Interval | Every 1 minute |
| Method | GET |
| Expected status | 200 |

**Dashboard:** https://cron-job.org → Jobs

**What to do if job fails:**
- Check Render logs for startup errors
- Verify `DATABASE_URL` is correct in Render environment

---

## 2. UptimeRobot — Uptime Monitoring

**Purpose:** Sends email alerts when the backend goes down or comes back up.

| Setting | Value |
|---|---|
| Monitor name | `Nodbusiness Backend` |
| URL | `https://nodbusiness-backend-9psf.onrender.com/health` |
| Type | HTTP(s) |
| Interval | Every 5 minutes |
| Alert | Email on down + email on recovery |

**Dashboard:** https://uptimerobot.com → Dashboard

**Alert email:** Sent to the account email on down/up events.

**Add more monitors when ready:**
- Frontend: `https://nodbusiness.vercel.app`
- API docs: `https://nodbusiness-backend-9psf.onrender.com/api/docs`

---

## 3. Backend Health Endpoint

**URL:** `https://nodbusiness-backend-9psf.onrender.com/health`

**Response format:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-22T02:19:07.734Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai": "gemini",
    "email": "resend",
    "storage": "supabase"
  }
}
```

**Status values:**

| Field | Possible values | Meaning |
|---|---|---|
| `status` | `ok` / `degraded` | `ok` = DB connected. `degraded` = DB error |
| `database` | `connected` / `error` / `disconnected` | PostgreSQL pool status |
| `redis` | `connected` / `error` / `not configured` | Upstash Redis status |
| `ai` | `gemini` / `openai` / `not configured` | Active AI provider |
| `email` | `resend` / `smtp` / `misconfigured` / `console` | Email delivery method |
| `storage` | `supabase` / `r2` / `local` | File storage provider |

**HTTP status codes:**
- `200` — database connected (even if Redis/AI/email degraded)
- `503` — database error (app cannot serve requests)

---

## 4. Sentry — Error Tracking

**Backend DSN:** Set in Render env var `SENTRY_DSN`
**Frontend DSN:** Set in Vercel env var `NEXT_PUBLIC_SENTRY_DSN`

**Dashboard:** https://sentry.io → your organization

**What Sentry captures:**
- Unhandled exceptions in Express routes
- Unhandled Promise rejections
- TypeScript/JavaScript errors in the Next.js frontend
- Performance traces (API response times)

**Alert configuration:** Set up in Sentry → Alerts → Create Alert Rule
- Recommend: alert on >10 new errors in 1 hour

---

## 5. Render Logs

**Access:** Render → nodbusiness-backend → Logs

**Log format:** JSON (Pino logger)

```json
{
  "level": 30,
  "time": 1790039607058,
  "service": "nodbusiness-backend",
  "env": "production",
  "method": "GET",
  "url": "/health",
  "statusCode": 200,
  "responseTimeMs": 245,
  "requestId": "abc-123",
  "msg": "http"
}
```

**Log levels:**
- `10` = trace
- `20` = debug
- `30` = info
- `40` = warn
- `50` = error
- `60` = fatal

**Key log patterns to watch:**

| Log message | Meaning | Action |
|---|---|---|
| `Redis connected` | Redis working | Good ✅ |
| `Redis quota exceeded` | Upstash 500K/day limit hit | Reset Upstash stats or wait for midnight UTC reset |
| `ioredis unavailable — using no-op stub` | REDIS_URL wrong or Redis down | Check REDIS_URL env var |
| `☁️ Supabase Storage bucket "uploads" ready` | Storage working | Good ✅ |
| `backup: FAILED` | pg_dump failed | Check BACKUP_DATABASE_URL (needs direct connection, not pooler) |
| `Database connected` | DB working | Good ✅ |
| `Startup cache warm complete` | App fully ready | Good ✅ |

**Filter logs by level in Render:**
- Use the search box in Render Logs tab
- Filter: `"level":50` for errors only
- Filter: `"msg":"http"` for HTTP requests only

---

## 6. Vercel Logs

**Access:** Vercel → nodbusiness → Logs

Shows:
- Next.js server-side rendering errors
- API route errors (if any Next.js API routes exist — currently none)
- Build errors

---

## 7. GitHub Actions — CI/CD Status

**Access:** https://github.com/sentflix01/empire-x/actions

**Workflows:**
- `Nodbusiness CI` — runs on every push to `main`
- `Nodbusiness Deploy` — runs after CI passes
- `DB migrate → PostgreSQL (manual)` — manual trigger only
- `Supabase Keep-Alive` — runs every 6 hours to prevent Supabase free tier pausing

**Expected CI duration:** ~3-4 minutes
**Expected Deploy duration:** ~5-8 minutes

**If CI fails:**
1. Click the failed workflow run
2. Expand the failed job
3. Read the error — usually typecheck, test failure, or lint error

---

## 8. Admin DevOps Panel

The app has a built-in admin operations board accessible to `admin` role users.

**Route:** `/admin` (after logging in as admin)

Features:
- Error event tracking (`error_events` table)
- Feature flag management
- System health summary
- Recent deploy history

---

## Metrics Endpoint (Admin Only)

```
GET /metrics
Authorization: Bearer <admin-token>
```

Returns:
```json
{
  "db": {
    "totalCount": 3,
    "idleCount": 2,
    "waitingCount": 0
  }
}
```

---

## Alerting Checklist

Set these up before real users arrive:

- [ ] UptimeRobot email alert configured ✅
- [ ] Sentry alert rule: >10 new errors/hour
- [ ] Telegram bot set up (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) for deploy failure alerts
- [ ] cron-job.org keep-alive job running ✅

---

## Production Readiness Notes

- **No structured log aggregation yet** — logs live in Render's built-in log viewer (7 day retention on free tier). When ready for production, add Render Log Drain → Papertrail or Logtail.
- **No APM yet** — Sentry performance monitoring is configured but not fully instrumented. Add `@sentry/profiling-node` for production APM.
- **Upstash free tier quota** — at 500K commands/day, a busy day can hit the limit. The app degrades gracefully (falls back to in-memory) but Redis features are lost. Monitor the Upstash dashboard and upgrade if needed.
