# Nodbusiness — Monitoring Stack

> Full observability: metrics, logs, traces, alerts — at every scale.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Uptime Kuma

---

## The Four Pillars of Observability

```
1. METRICS    — Numbers over time (response time, error rate, user count)
2. LOGS       — Events with context (what happened, when, with what data)
3. TRACES     — Request paths (which service, which function, how long each step)
4. ALERTS     — When something goes wrong, tell the right person immediately
```

---

## Current Monitoring Setup

| Pillar | Tool | Status | Coverage |
|---|---|---|---|
| Metrics | Coolify built-in | ✅ Active | CPU, RAM, network — container level |
| Logs | Pino → Coolify log viewer | ✅ Active | All backend events, structured JSON |
| Traces | Sentry (needs DSN) | ❌ Not configured | Nothing yet |
| Uptime / Alerts | Uptime Kuma (self-hosted) | ⚠️ Needs setup | Add monitors after Coolify install |

**Gap:** Sentry DSN not yet set. No alert fires on downtime. Fix both before launch.

---

## Stage 0: Minimum Viable Monitoring (This Week)

### 1. Uptime Kuma — Availability Monitoring (Self-Hosted, Free)

Uptime Kuma runs as a Docker container on the same Oracle VM. Add it as a one-click service in Coolify.

```bash
# In Coolify: New Service → search "Uptime Kuma" → deploy
# Or manually:
docker run -d --name uptime-kuma \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --restart=always \
  louislam/uptime-kuma:1
```

**Monitors to add immediately (1-minute check interval):**

| Monitor | URL | Check type | Expected |
|---|---|---|---|
| Backend health | `https://api.yourdomain.com/health` | HTTP keyword | keyword: `"ok"` |
| Frontend | `https://nodbusiness.app` | HTTP | Status 200 |
| Supabase | `https://status.supabase.com/api/v2/summary.json` | HTTP keyword | keyword: `"operational"` |
| Upstash | `https://status.upstash.com` | HTTP | Status 200 |
| Stripe | `https://status.stripe.com/api/v2/summary.json` | HTTP keyword | keyword: `"operational"` |

**Alert channel: Telegram (already configured via `TELEGRAM_BOT_TOKEN`)**

```
Uptime Kuma → Settings → Notifications → Add Notification
Type: Telegram
Bot Token: <your TELEGRAM_BOT_TOKEN>
Chat ID: <your TELEGRAM_CHAT_ID>
```

> Why Uptime Kuma instead of UptimeRobot: UptimeRobot updated its ToS in December 2024 to prohibit commercial use on the free plan. Nodbusiness is a commercial product. Uptime Kuma is self-hosted, fully free, has 1-minute checks (vs UptimeRobot's 5-minute), and is already on the Oracle VM with no extra cost.

### 2. Sentry — Error Tracking

```bash
# Sign up at sentry.io (free: 5K errors/month)
# Create project: Nodbusiness Backend (Node.js)
# Create project: Nodbusiness Frontend (Next.js)
# Set DSNs:
#   SENTRY_DSN → Coolify env vars
#   NEXT_PUBLIC_SENTRY_DSN → Cloudflare Pages env vars
```

**What Sentry captures automatically (already integrated in `lib/sentry.ts`):**
- Unhandled exceptions
- Unhandled promise rejections
- Express route errors
- Next.js rendering errors
- Slow API responses (performance monitoring)

**Set up Sentry alerts:**
- New error (first time seen): → Telegram/email immediately
- Error rate spike (> 10 errors in 5 minutes): → Immediate alert
- P95 response time > 2000ms: → Warning

### 3. Coolify Built-In Metrics

Coolify provides real-time container metrics at no extra cost:
```
Coolify Dashboard → Application → Metrics
  ├── CPU usage (%)
  ├── Memory usage (MB / GB)
  ├── Network in/out (bytes/sec)
  └── Container restart count
```

Check these **after every deploy** to confirm the new container is healthy.

### 4. Custom Health Dashboard

```javascript
// GET /health already returns comprehensive status:
{
  "status": "ok",
  "timestamp": "2026-09-20T08:00:00Z",
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

---

## Stage 1: Production Monitoring (Month 1–3)

### Structured Logging with Pino (Already Built)

```javascript
// backend/lib/logger.ts — already configured
// Every log has: timestamp, level, service, env, plus context

// Good log examples:
logger.info({ userId: req.user.id, orderId: order.id }, 'Order created');
logger.error({ err: err.message, route: '/api/orders' }, 'Order creation failed');
logger.warn({ userId, attempts }, 'Login attempt limit approaching');
```

**Log levels:**
| Level | When | Example |
|---|---|---|
| `debug` | Dev-only detail | SQL query text |
| `info` | Normal events | Order created, user registered |
| `warn` | Degraded but working | Redis miss, email retry |
| `error` | Something broke | Payment failed, DB error |

**Coolify log retention:** Coolify stores container logs in the VM. For longer retention, configure a log drain to an external service (Logtail, Grafana Loki, or simply R2).

### Key Metrics to Track (Weekly SQL Queries)

```sql
-- 1. Request volume
SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '7 days';

-- 2. Payment success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'paid') AS paid,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'paid') / NULLIF(COUNT(*), 0), 1) AS success_rate
FROM orders WHERE created_at > NOW() - INTERVAL '7 days';

-- 3. New user registrations
SELECT date_trunc('day', created_at) AS day, COUNT(*)
FROM users GROUP BY day ORDER BY day DESC LIMIT 7;

-- 4. Active users (proxy: recent posts or orders)
SELECT COUNT(DISTINCT author_id) FROM posts
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Stage 2: Advanced Observability (Month 3–12)

### Sentry Performance Monitoring

```javascript
// backend/index.ts — Sentry is already initialized
// Add performance monitoring configuration:

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,       // Sample 10% of transactions
  profilesSampleRate: 0.1,     // Profile 10% of sampled transactions
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Postgres({ usePgNative: false }),
  ],
});
```

**Set Sentry alerts:**
- P95 transaction time > 1000ms → Warning
- P95 transaction time > 3000ms → Critical
- Error rate > 1% → Warning
- Error rate > 5% → Critical (page on-call)

### PostHog — Product Analytics (Free self-hosted or 1M events/month free cloud)

```bash
# Option 1: PostHog Cloud (free up to 1M events/month)
# Option 2: Self-host on Oracle VM via Coolify one-click service
```

**Key funnels to set up:**

```
Buyer funnel:
  Landing → Register → Browse Marketplace → Product View → Add to Cart → Checkout → Order Placed

Seller funnel:
  Register → Create Profile → Create Showroom → List Product → First Sale

Engagement funnel:
  Login → Feed → Post → Like/Comment → Return next day (D1 retention)
```

---

## Stage 3: Full Observability Stack (100K+ users)

### Option A: Grafana Cloud (Recommended — free tier available)

```
Grafana Cloud free tier:
├── 10K series of metrics
├── 50GB logs
├── 50GB traces
└── 14-day retention
```

Deploy Grafana Agent on the Oracle VM (or on Hetzner by that point) to ship metrics and logs to Grafana Cloud.

### Option B: Self-hosted on Oracle VM

Install via Coolify one-click services:
- **Prometheus** — metrics scraping
- **Grafana** — dashboards
- **Loki** — log aggregation

Runs free on the same VM until the 12 GB RAM limit is approached.

### Weekly Business Metrics Report (BullMQ cron — already wired in `scripts/showroom-digests.js` pattern)

```javascript
const report = {
  week: `${weekStart} → ${weekEnd}`,
  users: {
    new: await countNew('users', '7 days'),
    active: await countActive('7 days'),
    retained_d7: await calculateD7Retention(),
  },
  commerce: {
    orders: await countNew('orders', '7 days'),
    gmv: await sumGMV('7 days'),
    revenue: await sumRevenue('7 days'),
    paymentSuccessRate: await calculatePaymentSuccessRate('7 days'),
  },
  content: {
    posts: await countNew('posts', '7 days'),
    messages: await countNew('messages', '7 days'),
  },
};
await sendTelegramReport(report);
```

---

## Alert Severity Matrix

| Condition | Severity | Response | Who |
|---|---|---|---|
| API health check fails | P0 | Immediate (Uptime Kuma → Telegram) | On-call |
| Database connection fails | P0 | Immediate | On-call |
| Payment webhook failing | P0 | Immediate | On-call |
| Oracle VM unreachable | P0 | Immediate → provision Hetzner | On-call |
| Error rate > 5% | P1 | Alert within 15 min | On-call |
| P95 response > 3s | P1 | Alert within 15 min | On-call |
| Upstash Redis limit hit (no-op fallback) | P2 | Alert within 1 hour | On-call |
| Push notifications failing | P2 | Alert within 1 hour | On-call |
| Disk/storage > 80% on Oracle VM | P2 | Alert within 4 hours | On-call |
| Supabase approaching 400 MB storage | P3 | Alert same day | Team |
| Resend daily cap approaching (80 emails) | P3 | Alert same day | Team |
| Email delivery rate < 95% | P3 | Alert same day | Team |

---

## On-Call Rotation

### Stage 0–1 (Single person)
- One person monitors everything
- Uptime Kuma → Telegram → phone
- Response time: best effort (personal project stage)

### Stage 2+ (Growing team)
- Weekly rotation
- Escalation: if no response in 15 min → call backup

### Stage 3+ (Full team)
- Follow-the-sun: Ethiopia → Europe → US coverage
- Post-mortem required for every P0 incident

---

## Key Dashboards to Build

### Daily Health Dashboard (check every morning)
```
├── Coolify container: CPU, RAM, restart count
├── Uptime Kuma: all monitors green?
├── Current error rate (last 1 hour) — Sentry
├── P95 API response time (last 1 hour) — Sentry
├── Active users (last 24 hours) — SQL
├── New registrations (last 24 hours) — SQL
├── Orders placed (last 24 hours) — SQL
├── Payment success rate (last 24 hours) — SQL
└── Supabase storage usage (%) — Supabase dashboard
```

### Incident Dashboard (available during incidents)
```
├── Error rate by endpoint (last 30 min) — Sentry
├── Slow query log (last 30 min) — Supabase → Query Performance
├── Coolify container CPU/RAM (real-time)
├── Upstash Redis command count (real-time)
└── Recent Coolify deploys
```
