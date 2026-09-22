# Nodbusiness — Current Infrastructure State

> A snapshot of exactly what is running today, what it costs, and how it's configured.
> **Last updated:** September 2026

---

## Live Services

### Backend API — Render (Free Tier)

| Property | Value |
|---|---|
| Provider | Render |
| Plan | Free (development) |
| Region | US-East (Oregon) |
| Runtime | Node.js 20 + Express 4 |
| Build | `npm ci && npm run build` (TypeScript compile) |
| Start | `node dist/index.js` |
| Deploy | Render deploy hook triggered by GitHub Actions after CI passes |
| Health check | `GET /health` → 200 OK |
| Sleep behaviour | ⚠️ Free tier spins down after 15 min inactivity (cold start ~30–60s) |
| Cost | **$0/month** (free tier) |
| URL | `https://nodbusiness-backend.onrender.com` |

### Frontend — Vercel

| Property | Value |
|---|---|
| Provider | Vercel |
| Plan | Hobby (free) |
| Framework | Next.js 16 (App Router, Turbopack) |
| CDN | Vercel Edge Network (global) |
| Build | On every push to `main` via GitHub Actions (`vercel build --prod`) |
| Preview | Auto-deploy on every PR |
| Cost | **$0/month** |
| URL | `https://nodbusiness.vercel.app` |

### Database — Supabase (PostgreSQL 16)

| Property | Value |
|---|---|
| Provider | Supabase |
| Plan | Free tier |
| Database size | 500 MB limit |
| Egress | 5 GB/month |
| MAU | 50,000 limit |
| Version | PostgreSQL 16 |
| Connection pooler | Supavisor (built-in, free) — port 6543 for app, 5432 for migrations |
| Pause risk | Free projects pause after 7 days of zero DB activity |
| Pause mitigation | ✅ `supabase-keepalive.yml` cron every 5 days |
| Backups | `pg_dump` daily via `backend/scripts/backup-database.js` → Cloudflare R2 |
| Cost | **$0/month** |

### Cache / Queues — Upstash Redis

| Property | Value |
|---|---|
| Provider | Upstash (serverless Redis) |
| Plan | Free tier |
| Commands | 500,000 / month |
| Storage | 256 MB |
| TLS | Always-on (`rediss://`) |
| Status | ⚠️ Must activate — set `REDIS_URL` in Render env vars |
| Cost | **$0/month** |

### File Storage — Cloudflare R2

| Property | Value |
|---|---|
| Provider | Cloudflare R2 |
| Plan | Free tier |
| Storage | 10 GB/month |
| Egress | **Free** (zero egress fees) |
| Bucket | `nodbusiness-uploads` |
| Status | ⚠️ Must activate — set all `R2_*` vars in Render before first user |
| Cost | **$0/month** |

### Email — Resend

| Property | Value |
|---|---|
| Provider | Resend |
| Plan | Free tier |
| Limits | 3,000 emails/month · 100 emails/day |
| Used for | OTP codes · order confirmations · password reset |
| Cost | **$0/month** |

---

## Total Monthly Cost

**$0/month** — entire stack runs on free tiers.

---

## Environment Variables Status

| Variable | Status |
|---|---|
| `DATABASE_URL` | ✅ Set in Render + GitHub Secrets |
| `JWT_SECRET` | ✅ Set in Render |
| `FRONTEND_URL` | ✅ Set in Render (`https://nodbusiness.vercel.app`) |
| `RESEND_API_KEY` | ✅ Set |
| `GOOGLE_CLIENT_ID` | ✅ Set |
| `REDIS_URL` | ⚠️ Must activate — set Upstash `rediss://` URL in Render |
| `R2_*` variables | ⚠️ Must activate — set 5 R2 vars in Render before first user |
| `STRIPE_SECRET_KEY` | ⚠️ Test mode only — needs `sk_live_` for production |
| `STRIPE_WEBHOOK_SECRET` | ❌ Not set — register webhook at Stripe dashboard |
| `CHAPA_SECRET_KEY` | ⚠️ Sandbox only |
| `VAPID_*` variables | ❌ Not set — push notifications disabled |
| `SENTRY_DSN` | ❌ Not set — no error tracking |
| `RENDER_DEPLOY_HOOK_URL` | ⚠️ Set in GitHub Secrets after Render service is created |
| `VERCEL_TOKEN` | ⚠️ Set in GitHub Secrets |

---

## Immediate Actions Required Before Public Launch

| Priority | Action | Estimated time |
|---|---|---|
| 🔴 Critical | Activate Cloudflare R2 — user uploads lost without it | 1 hour |
| 🔴 Critical | Register Stripe live keys + webhook endpoint | 1 hour |
| 🔴 Critical | Set `SENTRY_DSN` — no error visibility without it | 30 min |
| 🔴 Critical | Generate + set `VAPID_*` keys — push notifications disabled | 30 min |
| 🟡 High | Set `REDIS_URL` (Upstash) — enables BullMQ, rate limiting, cache | 20 min |
| 🟡 High | Set up Chapa live key | 1–2 hours |
| 🟡 High | Set `RENDER_DEPLOY_HOOK_URL` + `VERCEL_TOKEN` in GitHub Secrets | 15 min |
| 🟢 Medium | Enable Supabase Supavisor pooling (switch app to port 6543 URL) | 15 min |
| 🟢 Medium | Consider upgrading Render to paid plan ($7/mo) to eliminate cold starts | — |

---

## Infrastructure Notes

**Render free tier cold starts:** The free tier spins down after 15 minutes of inactivity. First request after idle takes 30–60 seconds to wake up. This breaks Socket.IO persistent connections for idle users. For development this is acceptable. For production launch, upgrade to Render Starter ($7/month) for always-on service.

**Vercel Hobby ToS:** Vercel Hobby plan is for personal non-commercial use. Nodbusiness has payments and subscriptions — this is technically commercial use. This is acceptable for development/demo phase. Upgrade to Vercel Pro ($20/month) before real users and real payments go live.

**Supabase pause fix:** Two layers of protection — (1) backend `SELECT 1` every 4 minutes while running, (2) `supabase-keepalive.yml` GitHub Actions cron every 5 days.
