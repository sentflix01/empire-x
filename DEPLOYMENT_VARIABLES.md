# Complete Deployment Variables Checklist

This document lists **ALL** environment variables and secrets needed for a complete Render + Supabase + Vercel deployment from scratch.

---

## 1. GitHub Actions Secrets

Set these in: **GitHub → Settings → Secrets and variables → Actions**

### Critical Secrets (Required)

| Secret Name | Value | Where to Get It |
|---|---|---|
| `SUPABASE_DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require` | Supabase → Project Settings → Database → Connection string (URI); used by GitHub migration jobs |
| `VERCEL_TOKEN` | Personal access token starting with `vercel_` | Vercel → Settings → Tokens → Create token |
| `RENDER_API_KEY` | API key from Render account | Render → Account Settings → API Keys → Create Key |
| `RENDER_SERVICE_ID` | Service ID from Render dashboard | Render → Backend service → Settings → Service ID |
| `BACKEND_URL` | `https://nodbusiness-backend.onrender.com` | Render → Backend service → URL |
| `FRONTEND_URL` | `https://halehame-eosin.vercel.app` or your Vercel domain | Vercel → Project → Settings → Domains |

### Optional Secrets (Recommended)

| Secret Name | Value | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather | For deployment failure notifications |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | For deployment failure notifications |
| `SOURCE_DATABASE_URL` | Local or staging DB URL | For manual migration scripts |

---

## 2. Render Backend Environment Variables

Set these in: **Render → Backend Service → Environment → Environment Variables**

### Critical Variables (App Won't Boot Without These)

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require` | Supabase connection; use the same database as GitHub's `SUPABASE_DATABASE_URL` |
| `JWT_SECRET` | 64+ character random hex string | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` | Enables security headers, prod rate limits |
| `FRONTEND_URL` | `https://halehame-eosin.vercel.app` | Can be comma-separated for multiple origins |

### File Storage (Uploads)

If using **Cloudflare R2**:

| Variable | Value | Where to Get It |
|---|---|---|
| `R2_ACCOUNT_ID` | Your Cloudflare Account ID | Cloudflare Dashboard → Workers & Pages → R2 → Settings |
| `R2_ACCESS_KEY_ID` | R2 API Token (access key) | Cloudflare Dashboard → R2 → Settings → API Tokens → Create Token |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret | Same as above |
| `R2_BUCKET_NAME` | `nodbusiness-uploads` | Or your bucket name |
| `R2_PUBLIC_URL` | `https://pub-[hash].r2.dev` | R2 bucket → Settings → Domain/URL |

If using **Supabase Storage**:

| Variable | Value | Where to Get It |
|---|---|---|
| `SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` | Supabase → Project Settings → Project URL |
| `SUPABASE_STORAGE_KEY` | Service role key (JWT token starting with `eyJhbGc...`) | Supabase → Project Settings → API → Service role key |
| `SUPABASE_BUCKET` | `uploads` | Or your bucket name |

### Email (Passwords & OTP Delivery)

| Variable | Value | Where to Get It |
|---|---|---|
| `RESEND_API_KEY` | API key starting with `re_` | Resend → API Keys → Create Key |
| `EMAIL_FROM` | `Nodbusiness <noreply@nodbusiness.app>` | Your verified sender email |

### Payments (Stripe)

| Variable | Value | Where to Get It |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (not `sk_test_`) for production | Stripe → Dashboard → Settings → API Keys → Secret Key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe → Developers → Webhooks → Select endpoint → Signing secret |

### Caching & Real-time (Redis - Phase 2)

| Variable | Value | Where to Get It |
|---|---|---|
| `REDIS_URL` | `rediss://default:[PASSWORD]@[HOST]:[PORT]` | Upstash → Redis database → REST API → Connection string (or use `redis://`) |

### AI Models

| Variable | Value | Where to Get It |
|---|---|---|
| `AI_PROVIDER` | `openai` or `gemini` or `anthropic` | Pick one provider |
| `OPENAI_API_KEY` | `sk-...` | OpenAI → API Keys → Create key |
| `GEMINI_API_KEY` | `AIza...` | Google Cloud Console → APIs & Services → Credentials |

### Monitoring & Error Tracking

| Variable | Value | Where to Get It |
|---|---|---|
| `SENTRY_DSN` | URL starting with `https://...@sentry.io/...` | Sentry → Projects → Your project → Settings → Client Keys (DSN) |

### Push Notifications & OAuth

| Variable | Value | Where to Get It |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `...googleusercontent.com` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `VAPID_PUBLIC_KEY` | Base64-encoded VAPID public key | Generate: `npm run generate-vapid` in backend/ |
| `VAPID_PRIVATE_KEY` | Base64-encoded VAPID private key | Same as above |
| `VAPID_EMAIL` | `mailto:admin@nodbusiness.app` | Your email for push notifications |

### Database Backups

| Variable | Value | Default |
|---|---|---|
| `BACKUP_RETENTION_DAYS` | Number of days to keep backups | `14` |
| `BACKUP_SCHEDULE_ENABLED` | `true` or `false` | `false` in non-production |

### Optional: TLS Certificate Handling

| Variable | Value | Default | Notes |
|---|---|---|---|
| `DB_TLS_REJECT_UNAUTHORIZED` | `true` or `false` | `false` | Set to `true` for strict cert verification (requires CA cert) |

---

## 3. Vercel Frontend Environment Variables

Set these in: **Vercel → Project → Settings → Environment Variables**

### Critical Variables (Build Will Fail Without These)

| Variable | Value | Where to Get It |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://nodbusiness-backend.onrender.com` | Render backend URL — must match GitHub secret `BACKEND_URL` |
| `NEXT_PUBLIC_APP_URL` | `https://halehame-eosin.vercel.app` | Your Vercel deployment URL |

### Optional: Social Auth & Payments

| Variable | Value | Where to Get It |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `...googleusercontent.com` | Google Cloud Console → APIs & Services → Credentials |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | Stripe → Dashboard → Settings → API Keys → Publishable Key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as backend `VAPID_PUBLIC_KEY` | From backend setup |
| `NEXT_PUBLIC_SENTRY_DSN` | Same as backend `SENTRY_DSN` (if using Sentry) | Sentry → Projects → Your project → DSN |

---

## Step-by-Step Setup Instructions

### Step 1: Create Supabase Database

1. Go to https://supabase.com → Sign up
2. Create new project
3. Wait for project to initialize
4. Go to **Project Settings → Database → Connection Pooling**
   - Copy the **Connection string (URI)** — this is your `DATABASE_URL`
5. Keep this browser tab open; you'll need it for Step 4

### Step 2: Set GitHub Secrets

1. Go to https://github.com/sentflix01/empire-x → Settings → Secrets and variables → Actions
2. Add each **Critical Secret** from Section 1 above:
   - `SUPABASE_DATABASE_URL` (from Supabase)
   - `VERCEL_TOKEN` (create new Vercel token)
   - `RENDER_API_KEY` (create in Render)
   - `RENDER_SERVICE_ID` (copy from Render backend service)
   - `BACKEND_URL` (will be like `https://[name].onrender.com`)
   - `FRONTEND_URL` (will be your Vercel URL)

### Step 3: Generate JWT_SECRET

In your terminal, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — use this for Render's `JWT_SECRET`.

### Step 4: Configure Render Backend

1. Go to Render dashboard → Backend service
2. Click **Environment** tab
3. Add all variables from **Section 2** above
4. **Critical ones (must have):**
   - `DATABASE_URL` (from Supabase, Step 1)
   - `JWT_SECRET` (from Step 3)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = your Vercel app URL
5. Click **Save** — service will auto-redeploy

### Step 5: Configure Vercel Frontend

1. Go to Vercel → Your project → Settings → Environment Variables
2. Add each variable from **Section 3** above
3. **Critical ones (must have):**
   - `NEXT_PUBLIC_API_BASE_URL` = `https://[render-backend-url]`
   - `NEXT_PUBLIC_APP_URL` = `https://[vercel-url]`
4. Click **Save**

### Step 6: Optional — Add File Storage (Cloudflare R2)

If you want persistent file uploads:

1. Go to Cloudflare → R2 (create bucket if needed)
2. Create R2 API token (not your account API token)
3. Add to Render environment:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`

### Step 7: Optional — Add Email (Resend)

1. Go to https://resend.com → Create account
2. Create API key
3. Add to Render:
   - `RESEND_API_KEY` = your API key
   - `EMAIL_FROM` = your verified sender email

### Step 8: Test Deploy

1. Make a test commit to `main`:
   ```bash
   git commit --allow-empty -m "test: trigger deploy"
   git push origin main
   ```

2. Watch the deploy:
   - GitHub Actions → Deploy workflow
   - Should run: Migrate → Deploy Backend → Deploy Frontend → Health Check

3. Check if backend is healthy:
   ```bash
   curl https://[render-url]/health
   ```

4. Check if frontend loads:
   ```bash
   curl https://[vercel-url]
   ```

---

## Common Issues & Fixes

| Issue | Solution |
|---|---|
| Backend won't start: `Missing DATABASE_URL` | Add `DATABASE_URL` to Render environment |
| Backend won't start: `Missing JWT_SECRET` | Generate new JWT_SECRET, add to Render |
| `pg_dump` fails with `ENOIDENTIFIER` | Make sure using Supabase **direct** connection, not pooler |
| Uploads fail: `No cloud storage configured` | Add R2 or Supabase Storage env vars |
| Vercel build fails: `Cannot find module` | Make sure `NEXT_PUBLIC_*` vars match exactly |
| Health check fails after deploy | Wait 2–3 minutes for service to start, then check backend logs in Render |
| `self-signed certificate in certificate chain` | Already fixed in latest code; ensure `DB_TLS_REJECT_UNAUTHORIZED` is not set to `true` |

---

## Verification Checklist

- [ ] All GitHub Actions secrets are set
- [ ] Render backend has `DATABASE_URL` and `JWT_SECRET`
- [ ] Render backend has `FRONTEND_URL` pointing to Vercel
- [ ] Vercel frontend has `NEXT_PUBLIC_API_BASE_URL` pointing to Render
- [ ] Supabase database connection is working (test: `psql $DATABASE_URL -c "SELECT 1"`)
- [ ] First git push to `main` triggers CI/CD workflow
- [ ] Backend `/health` check returns `200 OK`
- [ ] Frontend homepage loads without errors
- [ ] Sign-up flow works (if email is configured)

---

**Last Updated:** 2026-08-30  
**Deploy Stack:** Render (backend) + Vercel (frontend) + Supabase (database) + R2 (file storage, optional)
