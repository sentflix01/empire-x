# Nodbusiness — Current Infrastructure State

> **Last updated:** September 22, 2026
> **Status:** Live in production (development/demo phase)
> **Monthly cost:** $0

---

## Live URLs

| Layer | URL |
|---|---|
| **Frontend** | https://nodbusiness.vercel.app |
| **Backend API** | https://nodbusiness-backend-9psf.onrender.com |
| **Backend Health** | https://nodbusiness-backend-9psf.onrender.com/health |
| **Database** | Supabase — project `tpgzlokgnjxcerexxoda` |

---

## Full Stack Snapshot

| Service | Provider | Plan | Region | Status |
|---|---|---|---|---|
| Frontend | Vercel Hobby | Free | Global CDN | ✅ Live |
| Backend | Render Web Service | Free | Frankfurt EU Central | ✅ Live |
| Database | Supabase PostgreSQL | Free | AWS eu-west-1 | ✅ Connected |
| Redis | Upstash Redis | Free | AWS eu-central-1 (Frankfurt) | ✅ Connected |
| File Storage | Supabase Storage | Free | AWS eu-west-1 | ✅ Ready |
| Email | Resend | Free (3K/mo) | Global | ✅ Configured |
| AI | Google Gemini 1.5 Flash | Free | Global | ✅ Configured |
| Auth (Google) | Google Cloud OAuth 2.0 | Free | Global | ✅ Configured |
| Error Tracking | Sentry | Free | Global | ✅ Configured |
| Keep-alive | cron-job.org | Free | Global | ✅ Pinging every 1 min |
| Uptime Monitor | UptimeRobot | Free | Global | ✅ Monitoring every 5 min |
| CI/CD | GitHub Actions | Free | Global | ✅ Wired |

---

## Backend Service Details

| Field | Value |
|---|---|
| Service name | `nodbusiness-backend` |
| Service ID | `srv-daosiimk1f9s738jl2hg` |
| Runtime | Docker |
| Dockerfile | `backend/Dockerfile` |
| Docker context | `backend/` |
| Region | Frankfurt (EU Central) |
| Instance type | Free (0.1 CPU, 512MB RAM) |
| Auto-deploy | On commit to `main` |
| Deploy hook | Set (used by GitHub Actions) |
| PORT | 10000 (Render-assigned) |
| Node.js version | 20 (Alpine Docker image) |

**What's running:**
- Express HTTP server on port 10000
- Socket.IO WebSocket server (real-time chat, presence, notifications)
- BullMQ background workers (email, notifications, webhooks, usage recalc)
- Scheduled jobs: daily DB backup, weekly showroom digest emails, hourly story cleanup
- Self-ping every 10 minutes (built into `index.ts`)

---

## Frontend Service Details

| Field | Value |
|---|---|
| Project name | `nodbusiness` |
| Platform | Vercel Hobby |
| Framework | Next.js 16 (SSR mode) |
| Repository | `sentflix01/empire-x` → `frontend-next/` |
| Production branch | `main` |
| Production URL | https://nodbusiness.vercel.app |
| Build command | `next build` |
| Node.js version | 20.x |

---

## Database Details

| Field | Value |
|---|---|
| Provider | Supabase |
| Project ref | `tpgzlokgnjxcerexxoda` |
| Project URL | https://tpgzlokgnjxcerexxoda.supabase.co |
| Region | AWS eu-west-1 (Ireland) |
| PostgreSQL version | 15 |
| Migrations applied | 38 (migrate.js through migrate38.js) |
| Storage bucket | `uploads` (public) |
| Connection (app) | Pooler port 6543 (transaction mode) |
| Connection (migrations) | Pooler port 6543 |
| SSL | Required (`sslmode=require`) |
| IPv4 | `BACKUP_FORCE_IPV4=true` + `dns.setDefaultResultOrder('ipv4first')` in pool.ts |

---

## Redis Details

| Field | Value |
|---|---|
| Provider | Upstash |
| Database name | `nodbusiness` |
| Endpoint | `stirring-squid-289591.upstash.io` |
| Port | 6379 |
| Region | AWS eu-central-1 (Frankfurt) |
| TLS | Enabled (`rediss://`) |
| Free tier limit | 500K commands/day |
| Used for | JWT revocation, user cache, rate limiting, BullMQ queues, Socket.IO Redis adapter |

---

## Email Details

| Field | Value |
|---|---|
| Provider | Resend |
| Free tier | 3,000 emails/month |
| From address | `Nodbusiness <onboarding@resend.dev>` |
| Used for | OTP verification, password reset, order confirmations, weekly digests |

---

## AI Details

| Field | Value |
|---|---|
| Provider | Google Gemini |
| Model | `gemini-1.5-flash` |
| Used for | Product description generation, AI chat assistant |

---

## Authentication Details

| Field | Value |
|---|---|
| Google OAuth Client ID | `793690330854-lbngg...apps.googleusercontent.com` |
| Authorized JS origins | `http://localhost:3002`, `https://nodbusiness.vercel.app` |
| Authorized redirect URIs | `http://localhost:3002`, `https://nodbusiness-backend-9psf.onrender.com/api/auth/google/callback` |
| JWT access token TTL | 15 minutes |
| JWT refresh token TTL | 7 days (HttpOnly cookie) |

---

## Admin Account

| Field | Value |
|---|---|
| Email | `admin@nodbusiness.app` |
| Password | `Admin1234!` |
| Role | `admin` |
| Created | September 22, 2026 (via `node db/create-admin.js`) |

> ⚠️ Change this password before real users are added.

**Test account:**
| Email | `test@nodbusiness.app` |
| Password | `Test1234!` |

---

## GitHub Actions Secrets

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | Supabase pooler URL for migrations |
| `RENDER_DEPLOY_HOOK_URL` | Trigger Render deploys from CI |
| `VERCEL_TOKEN` | Deploy frontend via Vercel CLI |
| `BACKEND_URL` | Health check URL |
| `FRONTEND_URL` | Health check URL |

---

## CI/CD Pipeline

Every push to `main`:
1. **Nodbusiness CI** — typecheck + 308 tests + lint + build + security audit (~3-4 min)
2. On CI pass → **Nodbusiness Deploy** fires automatically:
   - Runs DB migrations against Supabase
   - Triggers Render deploy via deploy hook
   - Deploys frontend to Vercel (if `frontend-next/` changed)
   - Runs health check on both URLs

---

## Keep-Alive

| Service | URL monitored | Interval |
|---|---|---|
| cron-job.org | `.../health` | Every 1 minute |
| UptimeRobot | `.../health` | Every 5 minutes (with email alerts) |

Render free tier spins down after 15 min of inactivity. These monitors prevent that.

---

## Subscription Tiers (Business Features)

| Tier | Price | Key Limits |
|---|---|---|
| Freemium | $0 | 1 showroom, 50 products, 5 sections, 5GB storage |
| Premium (Pro) | $12/mo | 3 showrooms, 10K products, 25 sections, 50GB storage |
| Enterprise | $49/mo | Unlimited everything, live GPS, webhooks, API keys |

---

## Feature Flags (Current State)

| Flag | Status | Notes |
|---|---|---|
| `chapa_payments` | ✅ ON | Ethiopian payment gateway |
| `stripe_payments` | ❌ OFF | No Stripe keys configured yet |
| `ai_description_gen` | ✅ ON | Gemini powered |
| `ai_chat` | ✅ ON | Gemini powered |
| `map_clustering` | ✅ ON | |
| `delivery_tracking` | ✅ ON | |
| `return_requests` | ✅ ON | |
| `personalized_feed` | ❌ OFF | Not yet implemented |
| `video_posts` | ❌ OFF | Not yet implemented |
| `live_streaming` | ❌ OFF | Not yet implemented |

---

## Next Steps (When Ready)

1. **Change admin password** — `admin@nodbusiness.app` default password must be changed before real users
2. **Add custom domain** — point `nodbusiness.app` to Vercel when purchased
3. **Upgrade Render** — Render Starter ($7/mo) for zero cold starts before launch
4. **Enable Stripe** — add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + set `FF_STRIPE_PAYMENTS=true`
5. **Add Chapa live keys** — replace test key with production key
6. **Upgrade Vercel** — Vercel Pro ($20/mo) before accepting real commercial payments (Hobby ToS)
