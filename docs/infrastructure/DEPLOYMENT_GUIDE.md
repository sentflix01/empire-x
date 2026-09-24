# Nodbusiness — Complete Deployment Guide

> Follow this guide from top to bottom. Every step is in order.
> **Stack:** Render (backend) · Vercel (frontend) · Supabase · Upstash Redis · Cloudflare R2
> **Last updated:** September 2026
> **Estimated total time:** 1–2 hours

---

## What you will have at the end

```
Internet
    │
    ├── Vercel (Next.js frontend)
    │   https://nodbusiness.vercel.app
    │
    └── Render (Node.js backend)
        https://nodbusiness-backend-9psf.onrender.com
              │
        ┌─────┼──────────┐
        ▼     ▼          ▼
    Supabase  Upstash  Cloudflare R2
   PostgreSQL  Redis   File storage
```

---

## Pre-flight checklist — have these accounts ready before starting

- [ ] GitHub account (already have — code lives here)
- [ ] Render account — sign up at render.com (free, no card required)
- [ ] Vercel account — sign up at vercel.com (free, no card required)
- [ ] Supabase account — sign up at supabase.com (free)
- [ ] Upstash account — sign up at upstash.com (free, no card)
- [ ] Cloudflare account — sign up at cloudflare.com (free, for R2 storage)
- [ ] Resend account — sign up at resend.com (free)
- [ ] Sentry account — sign up at sentry.io (free)
- [ ] Stripe account — dashboard.stripe.com

---

## Pre-generated secrets

Save these in a password manager **before proceeding**. Use them when adding env vars to Render.

```
JWT_SECRET=ab675f38b720f9280d6f16c3107c845c7c412f0c3ceab25b465370f8ca751ecf788702d596642be9ce36a7710fac0e76ba2633d6eb7651317c29f714bf0975c1

EXTERNAL_API_ENCRYPTION_KEY=2bbd4f62b50487f0ca6b4601e21142ac317ffb661601c9cafacaa32bf1ad5cf4

OTP_SALT=22d2b7e82027da77f6f6cd41d74bbf229b37a9ae2a415666d36c271476c10f59

VAPID_PUBLIC_KEY=BM8ikr0zBzT2pspi3x6VjMq0w10aEyTHCsIf9ruakLWPr8CWp8Gu61iYe5SIOfMctwxEKa3yd8-VKbDhoNoy1SE

VAPID_PRIVATE_KEY=oCgwCPXk6M8ZESO8-kQt-5IWU_NwVbk7MATn0O5X0pA

VAPID_EMAIL=mailto:admin@yourdomain.com
```

⚠️ **Never commit these to Git.**

---

## PART 1 — Supabase Database (20 minutes)

### Step 2.1 — Create your Supabase project

1. Go to https://supabase.com → **New project**
2. Organization: your personal org (or create one)
3. Name: `nodbusiness`
4. Database password: generate a strong password — **save it in your password manager**
5. Region: **East US (North Virginia)** — closest to where most traffic will be processed initially
6. Click **Create new project** — takes about 2 minutes to provision

### Step 2.2 — Get your connection strings

1. Project dashboard → **Project Settings** (gear icon, left sidebar)
2. Click **Database** in the left menu
3. Scroll to **Connection string** section
4. You need **two** URLs:

**URL A — Direct connection (for migrations and pg_dump):**
- Toggle Connection pooling to **OFF**
- Copy the URI — it looks like:
  ```
  postgresql://postgres:[YOUR_PASSWORD]@db.XXXXXXXX.supabase.co:5432/postgres?sslmode=require
  ```
- Add `&channel_binding=require` to the end:
  ```
  postgresql://postgres:[YOUR_PASSWORD]@db.XXXXXXXX.supabase.co:5432/postgres?sslmode=require&channel_binding=require
  ```
- **Label this: `DATABASE_DIRECT_URL`** — save in password manager

**URL B — Pooler connection (for the live app):**
- Toggle Connection pooling to **ON**
- Select **Transaction** mode
- Copy the URI — it looks like:
  ```
  postgresql://postgres.XXXXXXXX:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
  ```
- **Label this: `DATABASE_URL`** — save in password manager

### Step 2.3 — Run database migrations

Open a terminal in the project root:

```bash
cd backend
DATABASE_URL="<paste your DATABASE_DIRECT_URL here>" node db/migrate-all.js
```

You should see each migration print `✅ Migration N complete.` — all 28 migrations.

Verify it worked:
```bash
DATABASE_URL="<paste your DATABASE_DIRECT_URL here>" node -e "
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query('SELECT count(*) FROM information_schema.tables WHERE table_schema=\'public\'')
  .then(r => { console.log('Tables created:', r.rows[0].count); p.end(); });
"
```
Expected output: `Tables created: 50` (or higher)

---

## PART 3 — Upstash Redis (10 minutes)

### Step 3.1 — Create Redis database

1. Go to https://console.upstash.com → **Create Database**
2. Name: `nodbusiness`
3. Type: **Redis**
4. Region: **EU-West-1** (Frankfurt) — good latency from both Africa and Europe
5. TLS: **Enabled** (always on)
6. Click **Create**

### Step 3.2 — Get connection URL

1. Click your new database
2. Click **Connect** tab
3. Under **ioredis** section, copy the connection URL — it starts with `rediss://`
4. It looks like:
   ```
   rediss://default:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX@eu1-XXXXX.upstash.io:6380
   ```
5. **Label this: `REDIS_URL`** — save in password manager

---

## PART 4 — Cloudflare R2 File Storage (15 minutes)

### Step 4.1 — Create R2 bucket

1. Go to https://dash.cloudflare.com → **R2 Object Storage** (left sidebar)
2. Click **Create bucket**
3. Name: `nodbusiness-uploads`
4. Click **Create bucket**

### Step 4.2 — Enable public access

1. Open `nodbusiness-uploads` bucket → **Settings** tab
2. Under **Public access** → click **Allow Access**
3. Copy the **Public bucket URL** → save as `R2_PUBLIC_URL`

### Step 4.3 — Create R2 API token

1. R2 main page → **Manage R2 API Tokens** → **Create API Token**
2. Token name: `nodbusiness-backend`
3. Permissions: **Object Read & Write** on `nodbusiness-uploads`
4. Copy: **Account ID** → `R2_ACCOUNT_ID`, **Access Key ID** → `R2_ACCESS_KEY_ID`, **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

---

## PART 5 — Resend Email (10 minutes)

1. Go to https://resend.com → **Sign up** (free, no card)
2. Dashboard → **API Keys** → **Create API Key** → name: `nodbusiness`
3. Copy the key (starts with `re_`) → save as `RESEND_API_KEY`

---

## PART 6 — Sentry Error Tracking (10 minutes)

1. Go to https://sentry.io → **New Project** → **Node.js** → Name: `nodbusiness-backend`
2. Copy DSN → save as `SENTRY_DSN`
3. Create second project: **Next.js** → Name: `nodbusiness-frontend`
4. Copy DSN → save as `NEXT_PUBLIC_SENTRY_DSN`

---

## PART 7 — Render Backend (15 minutes)

### Step 7.1 — Create Render account

1. Go to https://render.com → **Sign up** (free, no card required)
2. Click **"Sign in with GitHub"** → authorize Render

### Step 7.2 — Create the backend Web Service

1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repo: `sentflix01/empire-x`
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `nodbusiness-backend` |
| **Root directory** | `backend` |
| **Environment** | `Node` |
| **Build command** | `npm ci && npm run build` |
| **Start command** | `node dist/index.js` |
| **Instance type** | Free |

4. Click **Create Web Service**
5. Copy the service URL (e.g. `https://nodbusiness-backend-9psf.onrender.com`) → save as `BACKEND_URL`

### Step 7.3 — Add environment variables

In Render → your service → **Environment** tab, add all variables from `DEPLOYMENT_VARIABLES.md` Section 2.

**Minimum required to start:**
```
NODE_ENV         = production
DATABASE_URL     = <Supabase pooler URL, port 6543>
JWT_SECRET       = ab675f38b720f9280d6f16c3107c845c7c412f0c3ceab25b465370f8ca751ecf788702d596642be9ce36a7710fac0e76ba2633d6eb7651317c29f714bf0975c1
FRONTEND_URL     = https://nodbusiness.vercel.app
OTP_SALT         = 22d2b7e82027da77f6f6cd41d74bbf229b37a9ae2a415666d36c271476c10f59
EXTERNAL_API_ENCRYPTION_KEY = 2bbd4f62b50487f0ca6b4601e21142ac317ffb661601c9cafacaa32bf1ad5cf4
FF_STRIPE_PAYMENTS = true
FF_CHAPA_PAYMENTS  = true
```

### Step 7.4 — Get the Render deploy hook URL

1. Render → your service → **Settings** tab
2. Scroll to **Deploy Hook** → copy the URL
3. Save as `RENDER_DEPLOY_HOOK_URL` → add to GitHub Secrets

---

## PART 8 — Google OAuth (10 minutes)

1. Go to https://console.cloud.google.com → create project `Nodbusiness`
2. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**, Name: `Nodbusiness Dev`
4. **Authorized JavaScript origins:**
   ```
   https://nodbusiness.vercel.app
   http://localhost:3002
   ```
5. **Authorized redirect URIs:**
   ```
   https://nodbusiness.vercel.app/auth/google/callback
   http://localhost:3002/auth/google/callback
   ```
6. Click **Create** → copy the **Client ID** → save as `GOOGLE_CLIENT_ID`
7. Add to Render env vars: `GOOGLE_CLIENT_ID = ...`

---

## PART 9 — Stripe Webhooks (10 minutes)

1. Go to https://dashboard.stripe.com → **Developers** → **Webhooks** → **+ Add endpoint**
2. Endpoint URL: `https://nodbusiness-backend-9psf.onrender.com/api/orders/webhook`
3. Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`
4. Click **Add endpoint** → copy signing secret → add to Render: `STRIPE_WEBHOOK_SECRET = whsec_...`

5. Add a second webhook for Mewacho:
   - URL: `https://nodbusiness-backend-9psf.onrender.com/api/mewacho/webhook`
   - Event: `checkout.session.completed` only
   - Copy signing secret → add to Render: `STRIPE_MEWACHO_WEBHOOK_SECRET = whsec_...`

---

## PART 10 — Vercel Frontend (10 minutes)

### Step 10.1 — Create Vercel account

Go to https://vercel.com → **Sign up** → **Continue with GitHub**

### Step 10.2 — Import project

1. Dashboard → **New Project** → **Import Git Repository** → select `sentflix01/empire-x`
2. Configure:

| Setting | Value |
|---|---|
| **Root directory** | `frontend-next` |
| **Framework preset** | Next.js (auto-detected) |
| **Build command** | `npm run build` (default) |
| **Node.js version** | `20.x` |

### Step 10.3 — Add environment variables

```
NEXT_PUBLIC_API_BASE_URL         = https://nodbusiness-backend-9psf.onrender.com
NEXT_PUBLIC_APP_URL              = https://nodbusiness.vercel.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID     = <same as backend GOOGLE_CLIENT_ID>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_...
NEXT_PUBLIC_VAPID_PUBLIC_KEY     = BM8ikr0zBzT2pspi3x6VjMq0w10aEyTHCsIf9ruakLWPr8CWp8Gu61iYe5SIOfMctwxEKa3yd8-VKbDhoNoy1SE
NEXT_PUBLIC_SENTRY_DSN           = <paste your frontend SENTRY_DSN>
```

4. Click **Deploy** → your app is live at `https://nodbusiness.vercel.app`

### Step 10.4 — Get Vercel token for GitHub Actions

1. Vercel → profile → **Account Settings** → **Tokens** → **Create**
2. Name: `github-actions` → copy the token → save as `VERCEL_TOKEN`

---

## PART 11 — GitHub Actions Secrets (5 minutes)

Go to: **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value |
|---|---|
| `DATABASE_URL` | Supabase direct URI (port 5432) — for migrations |
| `RENDER_DEPLOY_HOOK_URL` | From Part 7.4 |
| `VERCEL_TOKEN` | From Part 10.4 |
| `BACKEND_URL` | `https://nodbusiness-backend-9psf.onrender.com` |
| `FRONTEND_URL` | `https://nodbusiness.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | Optional |
| `TELEGRAM_CHAT_ID` | Optional |

---

## PART 12 — Smoke Test (5 minutes)

```bash
node scripts/smoke-test.js https://nodbusiness-backend-9psf.onrender.com --verbose
```

> **Note on Render free tier:** The first health check may show a slow response (30–60s) if the service is waking from sleep. This is normal on the free tier. Run the test again after the service is fully awake.

---

## PART 13 — End-to-End Verification

Work through this flow to confirm everything works:

1. Open https://nodbusiness.vercel.app
2. Register → OTP code arrives in terminal (if Resend not set) or email
3. Login with Google → should redirect back correctly
4. Create a post → appears in feed
5. Upload a profile photo → URL should be `pub-xxx.r2.dev/...` (not `/uploads/`)
6. Send a chat message → real-time delivery via Socket.IO
7. Place a test order with Stripe card `4242 4242 4242 4242`

---

## Quick Reference — All Your Values

```
RENDER_BACKEND_URL       = https://nodbusiness-backend-9psf.onrender.com
VERCEL_FRONTEND_URL      = https://nodbusiness.vercel.app
DATABASE_DIRECT_URL      = postgresql://postgres:[PASS]@db.XXX.supabase.co:5432/postgres?sslmode=require
DATABASE_URL             = postgresql://postgres.XXX:[PASS]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET               = ab675f38...975c1
EXTERNAL_API_ENCRYPTION_KEY = 2bbd4f62...d5cf4
OTP_SALT                 = 22d2b7e8...0f59
VAPID_PUBLIC_KEY         = BM8ikr0z...1SE
VAPID_PRIVATE_KEY        = oCgwCPXk...0pA
REDIS_URL                = rediss://...
R2_ACCOUNT_ID            =
R2_ACCESS_KEY_ID         =
R2_SECRET_ACCESS_KEY     =
R2_PUBLIC_URL            = https://pub-xxx.r2.dev
RESEND_API_KEY           = re_...
SENTRY_DSN               = https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN   = https://...@sentry.io/...
GOOGLE_CLIENT_ID         = xxx.apps.googleusercontent.com
STRIPE_SECRET_KEY        = sk_test_...
STRIPE_WEBHOOK_SECRET    = whsec_...
RENDER_DEPLOY_HOOK_URL   =
VERCEL_TOKEN             =
```

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Backend wakes slowly (30–60s) | Render free tier sleeps after 15min idle | Expected — upgrade to Render Starter ($7/mo) for always-on |
| `Missing DATABASE_URL` | Not set in Render env vars | Add to Render → service → Environment |
| Uploads fail | R2 vars not set | Add all `R2_*` vars to Render |
| Google login fails | `GOOGLE_CLIENT_ID` missing | Add to both Render AND Vercel env vars |
| CORS error | `FRONTEND_URL` mismatch | Ensure Render `FRONTEND_URL` exactly matches Vercel URL |
| Vercel build fails | Missing `NEXT_PUBLIC_*` var | Add missing var in Vercel → Settings → Environment Variables |
| Supabase pauses | 7 days inactivity | `supabase-keepalive.yml` cron handles this automatically |
   ```
   https://pub-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.r2.dev
   ```
5. **Label this: `R2_PUBLIC_URL`** — save in password manager
