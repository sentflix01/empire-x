# Nodbusiness — Cloud Providers

> **Last updated:** September 22, 2026
> **Stack decision:** ADR-016 — Render + Vercel (zero-cost dev stack)
> **Monthly cost:** $0

---

## Active Services

### 1. Render — Backend Hosting

| Field | Value |
|---|---|
| **Website** | https://dashboard.render.com |
| **Account email** | empirexapp@gmail.com |
| **Service name** | `nodbusiness-backend` |
| **Service ID** | `srv-daosiimk1f9s738jl2hg` |
| **Live URL** | https://nodbusiness-backend-9psf.onrender.com |
| **Health check** | https://nodbusiness-backend-9psf.onrender.com/health |
| **Plan** | Free |
| **Region** | Frankfurt (EU Central) |
| **Runtime** | Docker |
| **Dockerfile** | `backend/Dockerfile` |
| **Auto-deploy** | On push to `main` |
| **Deploy hook** | Configured (used by GitHub Actions `RENDER_DEPLOY_HOOK_URL`) |

**Free tier limits:**
- 0.1 CPU, 512MB RAM
- Spins down after 15 min inactivity (mitigated by cron-job.org keep-alive)
- 750 free instance hours/month
- No credit card required

**Upgrade path:** Render Starter ($7/mo) — always-on, no cold starts, SSH access

---

### 2. Vercel — Frontend Hosting

| Field | Value |
|---|---|
| **Website** | https://vercel.com |
| **Account** | sentflix01 (GitHub login) |
| **Project name** | `nodbusiness` |
| **Live URL** | https://nodbusiness.vercel.app |
| **Plan** | Hobby (Free) |
| **Framework** | Next.js 16 (SSR) |
| **Repository** | `sentflix01/empire-x` → root dir `frontend-next/` |
| **Production branch** | `main` |
| **Deploy trigger** | GitHub push + Vercel CLI via GitHub Actions |

**Free tier limits:**
- 100GB bandwidth/month
- Unlimited deployments
- Preview URLs for every PR
- No credit card required

**ToS note:** Hobby plan is for non-commercial use. Upgrade to Pro ($20/mo) before real payments go live.

**Upgrade path:** Vercel Pro ($20/mo) — commercial use allowed, team features, custom domains

---

### 3. Supabase — PostgreSQL Database + File Storage

| Field | Value |
|---|---|
| **Website** | https://supabase.com |
| **Account** | sentflix01 (GitHub login) |
| **Project name** | `empire-x's Project` |
| **Project ref** | `tpgzlokgnjxcerexxoda` |
| **Project URL** | https://tpgzlokgnjxcerexxoda.supabase.co |
| **API URL** | https://tpgzlokgnjxcerexxoda.supabase.co |
| **Region** | AWS eu-west-1 (Ireland) |
| **PostgreSQL version** | 15 |
| **Plan** | Free |
| **Migrations applied** | 38 (migrate.js → migrate38.js) |

**Connection strings:**
| Purpose | URL format | Port |
|---|---|---|
| App (live server) | `postgresql://postgres.tpgzlokgnjxcerexxoda:PASS@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require` | 6543 |
| Migrations (CI) | Same pooler URL (port 6543) | 6543 |
| Backups (`pg_dump`) | `postgresql://postgres:PASS@db.tpgzlokgnjxcerexxoda.supabase.co:5432/postgres?sslmode=require` | 5432 |

**Storage:**
- Bucket name: `uploads`
- Visibility: Public
- Auto-created at startup via `index.ts`

**Free tier limits:**
- 500MB database
- 1GB file storage
- 50MB file uploads
- 2 projects max

**GitHub integration:** Connected (`sentflix01/empire-x`, deploy to production on `main` push)

---

### 4. Upstash — Redis

| Field | Value |
|---|---|
| **Website** | https://console.upstash.com |
| **Account** | Personal (same login) |
| **Database name** | `nodbusiness` |
| **Endpoint** | `stirring-squid-289591.upstash.io` |
| **Port** | 6379 |
| **Region** | AWS eu-central-1 (Frankfurt) |
| **TLS** | Enabled (`rediss://` protocol) |
| **Plan** | Free |

**Used for:**
- JWT token revocation (per-token and per-user)
- User auth cache (60s TTL)
- Rate limiting (Redis-backed in production)
- BullMQ job queues (email, notifications, webhooks, usage recalc)
- Socket.IO Redis adapter (multi-instance pub/sub)
- Feature flag overrides
- Presence/follower cache

**Free tier limits:**
- 500K commands/day (resets midnight UTC)
- 256MB storage
- 10K commands/second

---

### 5. Resend — Transactional Email

| Field | Value |
|---|---|
| **Website** | https://resend.com |
| **Plan** | Free |
| **From address** | `Nodbusiness <onboarding@resend.dev>` |
| **API key** | Configured in Render env vars (`RESEND_API_KEY`) |

**Used for:**
- OTP verification emails (registration + login)
- Password reset emails
- Order confirmation emails
- Weekly showroom digest emails
- Account lockout alert emails

**Free tier limits:**
- 3,000 emails/month
- 100 emails/day
- 1 custom domain (not yet configured)

**Upgrade path:** When sending more than 3K/month — Resend Pro ($20/mo for 50K emails)

---

### 6. Google Cloud — OAuth 2.0

| Field | Value |
|---|---|
| **Console** | https://console.cloud.google.com |
| **Project** | `empirex-502916` |
| **OAuth client name** | `Nodbusiness` |
| **Client ID** | `793690330854-lbngg...apps.googleusercontent.com` |
| **Plan** | Free |

**Authorized JavaScript origins:**
- `http://localhost:3002`
- `https://nodbusiness.vercel.app`

**Authorized redirect URIs:**
- `http://localhost:3002`
- `https://nodbusiness-backend-9psf.onrender.com/api/auth/google/callback`

**Used for:** "Sign in with Google" button on the login/register pages.

---

### 7. Sentry — Error Tracking

| Field | Value |
|---|---|
| **Website** | https://sentry.io |
| **Plan** | Free |
| **Backend DSN** | Configured in Render env vars (`SENTRY_DSN`) |
| **Frontend DSN** | Configured in Vercel env vars (`NEXT_PUBLIC_SENTRY_DSN`) |

**Used for:** Automatic error capture, stack traces, performance monitoring.

---

### 8. Google Gemini — AI

| Field | Value |
|---|---|
| **Console** | https://ai.google.dev |
| **Model** | `gemini-1.5-flash` |
| **API key** | Configured in Render env vars (`GEMINI_API_KEY`) |
| **Plan** | Free tier |

**Used for:** AI product description generator, AI chat assistant.

---

### 9. GitHub Actions — CI/CD

| Field | Value |
|---|---|
| **Repository** | https://github.com/sentflix01/empire-x |
| **CI workflow** | `.github/workflows/ci.yml` |
| **Deploy workflow** | `.github/workflows/deploy.yml` |
| **Plan** | Free (public repo) |

---

### 10. cron-job.org — Keep-Alive Pings

| Field | Value |
|---|---|
| **Website** | https://cron-job.org |
| **Job name** | `Nodbusiness Keep-Alive` |
| **URL** | `https://nodbusiness-backend-9psf.onrender.com/health` |
| **Interval** | Every 1 minute |
| **Plan** | Free |

---

### 11. UptimeRobot — Uptime Monitoring + Alerts

| Field | Value |
|---|---|
| **Website** | https://uptimerobot.com |
| **Monitor name** | `Nodbusiness Backend` |
| **URL** | `https://nodbusiness-backend-9psf.onrender.com/health` |
| **Interval** | Every 5 minutes |
| **Alert** | Email on down/up |
| **Plan** | Free |

---

## Services NOT Yet Configured

| Service | Purpose | When to add |
|---|---|---|
| Stripe | USD payments | Before launch with real users |
| Chapa (live keys) | ETB payments | Before launch in Ethiopia |
| Cloudflare R2 | File storage (alternative to Supabase) | If Supabase storage limits hit |
| Custom domain | `nodbusiness.app` | When purchased |
| VAPID push notifications | Web push | Keys configured, service worker needed |

---

## Cost Summary

| Provider | Current cost | Free limit | Upgrade triggers |
|---|---|---|---|
| Render | $0 | 750h/mo | Cold starts unacceptable → $7/mo |
| Vercel | $0 | 100GB bandwidth | Commercial use → $20/mo |
| Supabase | $0 | 500MB DB, 1GB storage | Data growth → $25/mo |
| Upstash | $0 | 500K cmd/day | High traffic → $0.2/100K |
| Resend | $0 | 3K emails/mo | Volume → $20/mo |
| Google OAuth | $0 | Unlimited | Never |
| Sentry | $0 | 5K errors/mo | Volume → $26/mo |
| Gemini AI | $0 | Generous free tier | Volume → pay-as-you-go |
| GitHub Actions | $0 | Public repo | Private repo → $4/mo |
| cron-job.org | $0 | Unlimited | Never |
| UptimeRobot | $0 | 50 monitors | Never (for this scale) |
| **TOTAL** | **$0/mo** | | |
