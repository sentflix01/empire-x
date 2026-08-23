# Nodbusiness — Monitoring Stack

> Full observability: metrics, logs, traces, alerts — at every scale.
> **Last updated:** August 2026

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
| Metrics | Railway built-in | ✅ Active | CPU, RAM, requests/sec |
| Logs | Pino → Railway logs | ✅ Active | All backend events |
| Traces | Sentry (needs DSN) | ❌ Not configured | Nothing yet |
| Alerts | UptimeRobot | ❌ Not configured | Nothing yet |

**Gap:** Zero visibility into errors or downtime right now. Fix immediately.

---

## Stage 0: Minimum Viable Monitoring (This Week)

### 1. Sentry — Error Tracking

```bash
# Sign up at sentry.io (free: 5K errors/month)
# Create project: Nodbusiness Backend (Node.js)
# Create project: Nodbusiness Frontend (Next.js)
# Copy DSNs to env vars
```

```javascript
// backend/lib/sentry.ts — already built, just needs SENTRY_DSN set
// Frontend: next.config.ts already includes Sentry CSP headers

// What Sentry captures automatically:
// - Unhandled exceptions
// - Unhandled promise rejections
// - Express route errors
// - Next.js rendering errors
// - Slow API responses (performance monitoring)
```

**Set up alerts in Sentry:**
- New error (first time seen): → Telegram/email immediately
- Error rate spike (> 10 errors in 5 minutes): → Immediate alert
- P95 response time > 2000ms: → Warning

### 2. UptimeRobot — Availability Monitoring

```bash
# Sign up at uptimerobot.com (free: 50 monitors, 5-minute checks)
# Add monitor: https://api.nodbusiness.app/health → HTTP(S) → GET → 200 OK
# Add monitor: https://nodbusiness.vercel.app → HTTP(S) → GET → 200 OK
# Set alert: Telegram + email when down
```

**Also monitor these critical endpoints:**
- `POST /api/auth/login` (auth working)
- `GET /api/products` (marketplace working)
- Stripe webhook endpoint accessibility

### 3. Custom Health Dashboard

```javascript
// GET /health already returns comprehensive status:
{
  "status": "ok",
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

// Bad (never do this):
console.log('Error:', err); // No structure, no context
```

**Log levels to use:**
| Level | When | Example |
|---|---|---|
| `debug` | Dev-only detail | SQL query text |
| `info` | Normal events | Order created, user registered |
| `warn` | Degraded but working | Redis miss, email retry |
| `error` | Something broke | Payment failed, DB error |

**Railway log retention:** 30 days on paid plan. Export important logs to R2 for longer retention.

### Key Metrics to Track

```javascript
// Add these to a weekly dashboard review:

// 1. Request volume
SELECT count(*) FROM orders WHERE created_at > NOW() - INTERVAL '7 days';

// 2. Payment success rate  
SELECT 
  COUNT(*) FILTER (WHERE status = 'paid') AS paid,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'paid') / COUNT(*), 1) AS success_rate
FROM orders WHERE created_at > NOW() - INTERVAL '7 days';

// 3. New user registrations
SELECT date_trunc('day', created_at) AS day, COUNT(*) 
FROM users GROUP BY day ORDER BY day DESC LIMIT 7;

// 4. Active users (proxy: recent posts or orders)
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
  tracesSampleRate: 0.1,     // Sample 10% of transactions
  profilesSampleRate: 0.1,   // Profile 10% of sampled transactions
  
  // Define which routes to monitor most closely:
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

### PostHog — Product Analytics (Free self-hosted)

```bash
# Option 1: PostHog Cloud (free up to 1M events/month)
# Option 2: Self-host on Railway (free, full control)

# Add to frontend:
npm install posthog-js

# frontend-next/lib/analytics.ts
import posthog from 'posthog-js';
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
});

// Track key events:
posthog.capture('product_added_to_cart', { product_id, price, category });
posthog.capture('checkout_completed', { amount, provider: 'stripe' });
posthog.capture('seller_onboarding_completed', { category });
```

**Key funnels to set up in PostHog:**

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

```javascript
// Add OpenTelemetry to backend:
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'https://tempo-prod-xxx.grafana.net/tempo',
    headers: {
      Authorization: `Basic ${Buffer.from(`${instanceId}:${apiKey}`).toString('base64')}`,
    },
  }),
  // Auto-instrument: Express, PostgreSQL, Redis, HTTP
});
sdk.start();
```

### Option B: DataDog ($15/host/month)

Better alerting, ML-based anomaly detection.
```
Pros: Industry standard, great dashboards, AI-powered alerts
Cons: $200-500/month at scale
```

### Custom Business Metrics Dashboard

```javascript
// Weekly metrics email/Telegram report (BullMQ weekly cron):
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
| API health check fails | P0 | Immediate page | On-call |
| Database connection fails | P0 | Immediate page | On-call |
| Payment webhook failing | P0 | Immediate page | On-call |
| Error rate > 5% | P1 | Alert within 15 min | On-call |
| P95 response > 3s | P1 | Alert within 15 min | On-call |
| Redis down (fallback working) | P2 | Alert within 1 hour | On-call |
| Push notifications failing | P2 | Alert within 1 hour | On-call |
| Disk/storage > 80% | P2 | Alert within 4 hours | On-call |
| Email delivery rate < 95% | P3 | Alert same day | Team |
| Search latency > 1s | P3 | Alert same day | Team |

---

## On-Call Rotation

### Stage 0–1 (Single person)
- One person monitors everything
- Telegram alerts → phone
- Response time: best effort (personal project stage)

### Stage 2+ (Growing team)
- Weekly rotation: Person A (Mon–Sun) → Person B next week
- PagerDuty free tier: 1 responder
- Escalation: if no response in 15 min → call backup

### Stage 3+ (Full team)
- PagerDuty Team ($21/person/month)
- 24/7 coverage with rotation
- Follow-the-sun: Ethiopia → Europe → US coverage
- Post-mortem required for every P0 incident

---

## Key Dashboards to Build

### Daily Health Dashboard (check every morning)
```
├── Current error rate (last 1 hour)
├── P95 API response time (last 1 hour)
├── Active users (last 24 hours)
├── New registrations (last 24 hours)
├── Orders placed (last 24 hours)
├── Payment success rate (last 24 hours)
└── Database connection pool usage
```

### Weekly Business Dashboard
```
├── MAU / DAU / DAU:MAU ratio trend
├── GMV by day (bar chart)
├── New vs returning users
├── Conversion funnel (registration → first order)
├── Top 10 selling products
├── Top 10 active sellers
└── Infrastructure costs vs revenue
```

### Incident Dashboard (available during incidents)
```
├── Error rate by endpoint (last 30 min)
├── Slow query log (last 30 min)
├── Railway CPU/RAM (real-time)
├── Database active connections
├── Redis memory usage
└── Recent deployments
```
