# Nodbusiness — Current Infrastructure State

> A snapshot of exactly what is running today, what it costs, and how it's configured.
> **Last updated:** August 2026

---

## Live Services

### Backend API — Railway
| Property | Value |
|---|---|
| Provider | Railway.app |
| Plan | Hobby ($5/month) → Starter when > 500MB RAM |
| Region | US-West (Dallas) |
| Instances | 1 (single instance) |
| Runtime | Node.js 20 + Express 4 |
| RAM | 512MB |
| CPU | Shared |
| Auto-deploy | Yes — every push to `main` |
| Health check | `GET /health` → 200 OK |
| URL | `https://nodbusiness-backend.railway.app` (example) |

### Frontend — Vercel
| Property | Value |
|---|---|
| Provider | Vercel |
| Plan | Hobby (free) |
| Region | Global Edge (35+ locations) |
| Framework | Next.js 16 (App Router, Turbopack) |
| CDN | Vercel Edge Network (automatic) |
| Build | On every push to `main` |
| Preview | Auto-deploy on every PR |
| URL | `https://nodbusiness.vercel.app` (example) |

### Database — Neon PostgreSQL
| Property | Value |
|---|---|
| Provider | Neon.tech |
| Plan | Free tier (0.5 CU, 3 GB storage) |
| Version | PostgreSQL 16 |
| Region | US-East (closest to Railway US-West) |
| Connection pooling | PgBouncer (built-in, enable in Neon console) |
| Backups | Continuous WAL archiving (Neon manages) |
| Branching | Database branching for staging environments |

### Cache / Queues — Redis
| Property | Value |
|---|---|
| Status | **Not yet activated** |
| Planned provider | Upstash Redis (free tier: 10K commands/day) |
| Current fallback | In-memory no-op stub (safe for dev/low traffic) |

### File Storage
| Property | Value |
|---|---|
| Status | **Local disk** (dev only — lost on redeploy) |
| Planned provider | Cloudflare R2 (free: 10 GB storage, 1M Class A ops/month) |
| Current risk | 🔴 HIGH — user uploads are lost on every Railway deploy |

### Email
| Property | Value |
|---|---|
| Provider | Resend (free: 3,000 emails/month) |
| Fallback | SMTP (Gmail) |
| Used for | OTP codes, order confirmations, password reset |

### Payments
| Property | Value |
|---|---|
| Stripe | Test mode active. Live mode needs `sk_live_` key |
| Chapa | Sandbox mode active (`CHAPA_SECRET_KEY=SANDBOX`). Live needs real key |
| Webhook | Must register `POST /api/orders/webhook` in Stripe Dashboard |

### Monitoring
| Property | Value |
|---|---|
| Error tracking | Sentry (not yet configured — needs `SENTRY_DSN`) |
| Logs | Railway built-in log viewer (30 day retention on paid plans) |
| Uptime | None configured — no alerts on downtime |

---

## Environment Variables Status

| Variable | Status |
|---|---|
| `DATABASE_URL` | ✅ Set |
| `JWT_SECRET` | ✅ Set |
| `FRONTEND_URL` | ✅ Set |
| `RESEND_API_KEY` | ✅ Set |
| `STRIPE_SECRET_KEY` | ⚠️ Test mode only |
| `STRIPE_WEBHOOK_SECRET` | ❌ Not set (webhooks won't verify) |
| `CHAPA_SECRET_KEY` | ⚠️ Sandbox only |
| `REDIS_URL` | ❌ Not set (no caching) |
| `R2_*` variables | ❌ Not set (local disk only) |
| `VAPID_*` variables | ❌ Not set (push notifications disabled) |
| `SENTRY_DSN` | ❌ Not set (no error tracking) |
| `GOOGLE_CLIENT_ID` | ✅ Set |

---

## Immediate Actions Required Before Public Launch

| Priority | Action | Estimated time |
|---|---|---|
| 🔴 Critical | Set up Cloudflare R2 — user uploads lost on deploy | 2 hours |
| 🔴 Critical | Register Stripe live keys + webhook | 1 hour |
| 🔴 Critical | Configure Sentry DSN (error tracking) | 30 min |
| 🔴 Critical | Set up VAPID keys for push notifications | 30 min |
| 🟡 High | Enable Redis (Upstash free tier) | 30 min |
| 🟡 High | Set up Chapa live key | 1 hour |
| 🟡 High | Register a domain (nodbusiness.vercel.app) | 1 hour |
| 🟢 Medium | Set up uptime monitoring (UptimeRobot free) | 30 min |
| 🟢 Medium | Enable Neon connection pooling | 15 min |
