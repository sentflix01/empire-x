# Complete Deployment Variables Checklist

This document lists **ALL** environment variables and secrets needed for a complete
Render + Vercel + Supabase deployment from scratch.

> **Stack:** Render (backend) · Vercel (frontend) · Supabase · Upstash Redis · Cloudflare R2 · Resend
> **Last updated:** September 2026

---

## 1. GitHub Actions Secrets

Set these in: **GitHub → Settings → Secrets and variables → Actions**

### Critical Secrets (Required)

| Secret Name | Value | Where to Get It |
|---|---|---|
| `DATABASE_URL` | Supabase direct connection URI with `sslmode=require` | Supabase → Project Settings → Database → URI (pooling OFF) |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL for the backend service | Render → your service → Settings → Deploy Hook → Copy URL |
| `VERCEL_TOKEN` | Vercel personal access token | Vercel → Account Settings → Tokens → Create Token |
| `BACKEND_URL` | `https://nodbusiness-backend-9psf.onrender.com` | Render Dashboard → Backend service → Public URL |
| `FRONTEND_URL` | `https://nodbusiness.vercel.app` | Vercel → Project → Settings → Domains |

### Optional Secrets (Recommended for Alerts)

| Secret Name | Value | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather | For deployment failure notifications |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | For deployment failure notifications |

### Secrets to Remove (Old Stack — No Longer Used)

If these exist from a previous setup, delete them:
`COOLIFY_WEBHOOK_URL` · `COOLIFY_TOKEN` · `SUPABASE_DATABASE_URL` · `SOURCE_DATABASE_URL`

---

## 2. Render Backend Environment Variables

Set these in: **Render → your backend service → Environment → Environment Variables**

### Critical Variables (App Won't Boot Without These)

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase pooler URI, port 6543, `?sslmode=require` | Use Supabase Supavisor pooler for live app |
| `JWT_SECRET` | 64+ character random hex string | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `NODE_ENV` | `production` | Enables security headers, prod rate limits |
| `FRONTEND_URL` | `https://nodbusiness.vercel.app` | Must match your Vercel domain for CORS |

> **PORT:** Do not set — Render assigns `PORT=10000` automatically. The backend binds to `process.env.PORT ?? 10000`.

### File Storage (Cloudflare R2 — Required in Production)

| Variable | Value | Where to Get It |
|---|---|---|
| `R2_ACCOUNT_ID` | Your Cloudflare Account ID | Cloudflare Dashboard → R2 → Overview → Account ID |
| `R2_ACCESS_KEY_ID` | R2 API Token (access key) | Cloudflare → R2 → Manage R2 API Tokens → Create Token |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret | Same as above |
| `R2_BUCKET_NAME` | `nodbusiness-uploads` | Or your chosen bucket name |
| `R2_PUBLIC_URL` | `https://pub-[hash].r2.dev` | R2 bucket → Settings → Public URL |

### Email (Resend)

| Variable | Value | Where to Get It |
|---|---|---|
| `RESEND_API_KEY` | API key starting with `re_` | Resend → API Keys → Create Key |
| `EMAIL_FROM` | `Nodbusiness <noreply@yourdomain.com>` | Your verified sender email in Resend |

### Payments (Stripe)

| Variable | Value | Where to Get It |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (dev) or `sk_live_...` (prod) | Stripe → Dashboard → Settings → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe → Developers → Webhooks → Signing secret |
| `STRIPE_MEWACHO_WEBHOOK_SECRET` | `whsec_...` | Separate Stripe webhook endpoint for Mewacho |
| `STRIPE_CURRENCY` | `usd` (default) | Currency for Stripe Checkout |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | `price_...` | Stripe → Products → Premium plan → Price ID |
| `STRIPE_PRICE_PRO_MONTHLY` | `price_...` | Stripe → Products → Pro plan → Price ID |

### Payments (Chapa — Ethiopian Market)

| Variable | Value | Where to Get It |
|---|---|---|
| `CHAPA_SECRET_KEY` | `CHASECK_test_...` (dev) or `CHASECK_live_...` (prod) | Chapa Dashboard → Settings → API Keys |
| `API_URL` | `https://nodbusiness-backend-9psf.onrender.com` | Your backend's public URL — used for Chapa callback |

### Caching (Upstash Redis)

| Variable | Value | Where to Get It |
|---|---|---|
| `REDIS_URL` | `rediss://default:[TOKEN]@[HOST]:[PORT]` | Upstash → Redis database → Connect → ioredis URL |
| `ENABLE_QUEUE_PRODUCERS` | `false` on the demo web service; `true` if the web service should enqueue jobs to a worker | Defaults off; with false, jobs run synchronously and do not enter Redis |
| `ENABLE_QUEUE_WORKERS` | `false` on web service; `true` only on a dedicated worker service | Defaults off; prevents idle BullMQ workers on the demo web service |
| `ENABLE_SOCKET_REDIS_ADAPTER` | `false` for a single backend instance; `true` only for multiple instances | Defaults off; single-instance Socket.IO works without it |
| `ENABLE_STARTUP_CACHE_WARM` | `false` for demo; `true` only when you intentionally want a warm trending cache at each deploy | When enabled, uses 1 `GET` plus 1 `SETEX` on a cache miss per backend restart |

These switches are independent of `NODE_ENV`. For the single-instance demo, leave all four false. To scale later, run a dedicated worker with `ENABLE_QUEUE_WORKERS=true`; set `ENABLE_QUEUE_PRODUCERS=true` on the web service only when that worker is running. Enable the Socket.IO adapter only when requests can reach multiple backend instances. Google sign-in uses Google OAuth plus Postgres and does not require these switches.

Migration 39 adds `users.is_demo` and marks the built-in demo accounts plus existing `is_seed` Faker users. Run the normal backend migrations before deploying this code; do not mark newly registered Google users as demo.

### AI Models (Optional — enables AI features)

| Variable | Value | Notes |
|---|---|---|
| `AI_PROVIDER` | `openai` or `gemini` or `anthropic` | Pick one provider |
| `OPENAI_API_KEY` | `sk-...` | OpenAI → API Keys |
| `GEMINI_API_KEY` | `AIza...` | Google Cloud Console → APIs → Credentials |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic Console → API Keys |

### Error Tracking (Sentry)

| Variable | Value | Where to Get It |
|---|---|---|
| `SENTRY_DSN` | `https://xxx@o123.ingest.sentry.io/456` | Sentry → Projects → Backend project → Client Keys |

### Push Notifications (VAPID)

| Variable | Value | Notes |
|---|---|---|
| `VAPID_PUBLIC_KEY` | `BM8ikr0zBzT2pspi3x6VjMq0w10aEyTHCsIf9ruakLWPr8CWp8Gu61iYe5SIOfMctwxEKa3yd8-VKbDhoNoy1SE` | Pre-generated |
| `VAPID_PRIVATE_KEY` | `oCgwCPXk6M8ZESO8-kQt-5IWU_NwVbk7MATn0O5X0pA` | Pre-generated |
| `VAPID_EMAIL` | `mailto:admin@yourdomain.com` | Your contact email for VAPID |

### Google OAuth

| Variable | Value | Where to Get It |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `...googleusercontent.com` | Google Cloud Console → APIs → Credentials → OAuth 2.0 Client |

### Security

| Variable | Value | Notes |
|---|---|---|
| `EXTERNAL_API_ENCRYPTION_KEY` | `2bbd4f62b50487f0ca6b4601e21142ac317ffb661601c9cafacaa32bf1ad5cf4` | Pre-generated (64 hex chars) |
| `OTP_SALT` | `22d2b7e82027da77f6f6cd41d74bbf229b37a9ae2a415666d36c271476c10f59` | Pre-generated (64 hex chars) |
| `JWT_SECRET` | `ab675f38b720f9280d6f16c3107c845c7c412f0c3ceab25b465370f8ca751ecf788702d596642be9ce36a7710fac0e76ba2633d6eb7651317c29f714bf0975c1` | Pre-generated (128 hex chars) |

### Database Backups

| Variable | Value | Default |
|---|---|---|
| `BACKUP_RETENTION_DAYS` | `14` | Days to keep pg_dump backups in R2 |
| `BACKUP_SCHEDULE_ENABLED` | `true` | Set to `true` in production |

### Telegram Bot (Optional — DevOps Alerts)

| Variable | Value | Where to Get It |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather | For DevOps copilot + deploy alerts |

### Feature Flags (Override Defaults)

| Variable | Value | Notes |
|---|---|---|
| `FF_CHAPA_PAYMENTS` | `true` | Enable Ethiopian payment gateway |
| `FF_STRIPE_PAYMENTS` | `true` | Enable Stripe checkout |

---

## 3. Vercel Frontend Environment Variables

Set these in: **Vercel → Project → Settings → Environment Variables**

Apply to both **Production** and **Preview** environments.

### Critical Variables

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://nodbusiness-backend-9psf.onrender.com` | Must match your Render backend URL exactly |
| `NEXT_PUBLIC_APP_URL` | `https://nodbusiness.vercel.app` | Your Vercel deployment URL |

### Social Auth & Payments

| Variable | Value | Where to Get It |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `...googleusercontent.com` | Same value as backend `GOOGLE_CLIENT_ID` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Stripe → Dashboard → API Keys → Publishable Key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BM8ikr0zBzT2pspi3x6VjMq0w10aEyTHCsIf9ruakLWPr8CWp8Gu61iYe5SIOfMctwxEKa3yd8-VKbDhoNoy1SE` | Pre-generated |
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry frontend DSN | Sentry → Projects → Frontend project → DSN |

### Vercel Project Settings

Set these in the Vercel dashboard when connecting the repository:

| Setting | Value |
|---|---|
| **Framework preset** | Next.js |
| **Root directory** | `frontend-next` |
| **Build command** | `npm run build` (Vercel auto-detects) |
| **Output directory** | `.next` (Vercel manages this automatically) |
| **Node.js version** | `20.x` |

---

## 4. Supabase Configuration

### Connection URL Strategy

Use the correct URL for each context:

| Context | URL to Use | Port | Notes |
|---|---|---|---|
| **Live app** (Render env var) | Pooler URL | 6543 | Transaction mode — efficient |
| **Migrations** (GitHub Actions) | Direct URL | 5432 | DDL requires direct connection |
| **pg_dump backups** | Direct URL | 5432 | Backup tools require direct |

Both URLs: **Supabase → Project Settings → Database → Connection string**

### Keep-Alive

The `supabase-keepalive.yml` workflow runs every 5 days and pings the database to prevent the free-tier 7-day inactivity pause.

---

## Step-by-Step Setup

### Step 1: Connect GitHub to Render

1. Sign up at https://render.com (free, no card required for free tier)
2. **New → Web Service** → **Connect GitHub repo** → select `sentflix01/empire-x`
3. Settings:
   - **Name:** `nodbusiness-backend`
   - **Root directory:** `backend`
   - **Environment:** `Node`
   - **Build command:** `npm ci && npm run build`
   - **Start command:** `node dist/index.js`
   - **Instance type:** Free (spins down after 15 min inactivity — acceptable for development)
4. Add all environment variables from Section 2 above
5. Deploy → copy the **Public URL** (e.g. `https://nodbusiness-backend-9psf.onrender.com`)
6. Go to **Settings → Deploy Hook** → copy the URL → add to GitHub Secrets as `RENDER_DEPLOY_HOOK_URL`

### Step 2: Connect GitHub to Vercel

1. Sign up / log in at https://vercel.com
2. **New Project** → **Import Git Repository** → select `sentflix01/empire-x`
3. Settings:
   - **Root directory:** `frontend-next`
   - **Framework preset:** Next.js (auto-detected)
4. Add environment variables from Section 3 above
5. Deploy → your app is live at `https://nodbusiness.vercel.app`

### Step 3: Set GitHub Secrets

Set all secrets from Section 1 above in:
**GitHub → Settings → Secrets and variables → Actions → Repository secrets**

### Step 4: Run Migrations

```bash
cd backend
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres?sslmode=require&channel_binding=require" \
  node db/migrate-all.js
```

### Step 5: Test Deploy

```bash
git commit --allow-empty -m "test: trigger deploy"
git push origin main
```

Watch: GitHub → Actions → Nodbusiness Deploy pipeline

---

## Verification Checklist

- [ ] GitHub Secrets: `DATABASE_URL`, `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `BACKEND_URL`, `FRONTEND_URL` all set
- [ ] Render: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL` set
- [ ] Render: R2 variables set — uploads go to R2, not local disk
- [ ] Render: `REDIS_URL` set — `/health` shows `"redis": "connected"`
- [ ] Vercel: `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_APP_URL` set
- [ ] Backend `/health` returns `200 OK`
- [ ] Frontend loads at Vercel URL
- [ ] Sign-up → OTP → Feed works end-to-end

---

## Common Issues & Fixes

| Issue | Solution |
|---|---|
| `Missing DATABASE_URL` at startup | Add `DATABASE_URL` to Render env vars; redeploy |
| `Missing JWT_SECRET` at startup | Add pre-generated value to Render env vars |
| Uploads fail: `No cloud storage configured` | Add all `R2_*` vars to Render |
| Redis shows `not configured` on /health | Add `REDIS_URL` (must start with `rediss://`) to Render |
| Render service sleeps (free tier) | Expected on free tier — first request wakes it in 30–60s |
| Vercel build fails | Check `NEXT_PUBLIC_API_BASE_URL` is set in Vercel env vars |
| CORS error from frontend | Ensure `FRONTEND_URL` in Render matches your Vercel domain exactly |
| Google OAuth fails | Add `GOOGLE_CLIENT_ID` to both Render AND Vercel env vars |

---

**Last Updated:** September 2026
**Deploy Stack:** Render (backend) · Vercel (frontend) · Supabase (database) · Upstash Redis · Cloudflare R2 (file storage)
