# Nodbusiness — Deployment Guide

> **Last updated:** September 22, 2026
> **Stack:** Render (backend) + Vercel (frontend) + Supabase + Upstash + Resend

---

## Overview

Every push to `main` triggers the full deploy pipeline automatically:

```
Push to main
    │
    ▼
GitHub Actions: Nodbusiness CI
    ├── Typecheck (tsc --noEmit)
    ├── Tests (308 unit + integration tests)
    ├── Lint (ESLint)
    ├── Build (next build)
    └── Security audit (npm audit --audit-level=high)
    │
    ▼ (only if CI passes)
GitHub Actions: Nodbusiness Deploy
    ├── Run DB migrations → Supabase
    ├── Deploy backend → Render (via deploy hook)
    ├── Deploy frontend → Vercel (only if frontend-next/ changed)
    └── Health check (GET /health + frontend URL)
```

---

## Automatic Deploy (Normal Flow)

**You don't need to do anything.** Just push to `main`:

```bash
git add .
git commit -m "your commit message"
git push origin main
```

Watch progress: `https://github.com/sentflix01/empire-x/actions`

Expected times:
- CI: ~3-4 minutes
- Deploy: ~5-8 minutes (Render Docker build + Vercel build)
- Total push to live: ~8-12 minutes

---

## Manual Deploy — Backend Only

**Via Render dashboard:**
1. Go to https://dashboard.render.com
2. Click `nodbusiness-backend`
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

**Via deploy hook (curl):**
```bash
curl -X POST "https://api.render.com/deploy/srv-daosiimk1f9s738jl2hg?key=YOUR_KEY"
```

---

## Manual Deploy — Frontend Only

```bash
cd frontend-next
vercel --prod --token=$VERCEL_TOKEN
```

Or via Vercel dashboard:
1. Go to https://vercel.com → nodbusiness project
2. Deployments → latest → three-dot menu → **Redeploy**

---

## Run Migrations Manually

**From local machine (requires `backend/.env` with `DATABASE_URL`):**

```bash
cd backend
node db/migrate-all.js
```

**From GitHub Actions (manual trigger):**
1. Go to https://github.com/sentflix01/empire-x/actions
2. Click **"DB migrate → PostgreSQL (manual)"** workflow
3. Click **"Run workflow"** → **Run**

---

## Admin Account Provisioning

Do not run development account scripts against a hosted database. The former
`create-admin.js` workflow that reset fixed passwords has been removed. For a
production deployment, provision or reset an administrator through the hosting
provider's secure access procedure using a unique password stored in a secret
manager. The repository's `create-admin.js` is restricted to fresh local
development databases and refuses to modify existing accounts.

---

## Rollback — Backend

**Option A: Render dashboard (fastest — ~60 seconds)**
1. Render → nodbusiness-backend → **Deploys**
2. Find last known-good deployment
3. Click three-dot menu → **"Redeploy"**

**Option B: Git revert (re-runs full pipeline)**
```bash
git revert HEAD
git push origin main
```

---

## Rollback — Frontend

**Option A: Vercel dashboard (fastest — ~10 seconds)**
1. Vercel → nodbusiness → **Deployments**
2. Find last known-good deployment (green "Ready")
3. Click three-dot menu → **"Promote to Production"**

**Option B: Git revert**
```bash
git revert HEAD
git push origin main
```

---

## First-Time Setup (New Environment)

If you need to set up a completely fresh deployment from scratch:

### Step 1 — Render (Backend)

1. Go to https://dashboard.render.com → New → Web Service
2. Connect GitHub repo `sentflix01/empire-x`
3. Settings:
   - Name: `nodbusiness-backend`
   - Runtime: Docker
   - Dockerfile: `./backend/Dockerfile`
   - Docker context: `./backend`
   - Region: Frankfurt (EU Central)
   - Plan: Free
4. Add all environment variables (see `docs/operations/ENVIRONMENT_VARIABLES.md`)
5. Deploy

### Step 2 — Supabase (Database)

1. Create project at https://supabase.com
2. Note the project URL and service_role key
3. Run migrations: `node db/migrate-all.js`
4. Provision the first administrator through the provider's secure procedure; do not run local development bootstrap scripts against Supabase.

### Step 3 — Upstash (Redis)

1. Create database at https://console.upstash.com
2. Region: eu-central-1 (Frankfurt)
3. Copy `rediss://` URL → add as `REDIS_URL` in Render

### Step 4 — Vercel (Frontend)

1. Go to https://vercel.com → New Project
2. Import `sentflix01/empire-x`, root directory `frontend-next`
3. Add environment variables (see `ENVIRONMENT_VARIABLES.md`)
4. Deploy

### Step 5 — GitHub Secrets

Add to `sentflix01/empire-x` → Settings → Secrets → Actions:
- `DATABASE_URL` — Supabase pooler URL
- `RENDER_DEPLOY_HOOK_URL` — from Render → service → Settings → Deploy Hook
- `VERCEL_TOKEN` — from Vercel → Account Settings → Tokens
- `BACKEND_URL` — your Render service URL
- `FRONTEND_URL` — your Vercel URL

### Step 6 — Google OAuth

In Google Cloud Console → your OAuth 2.0 client:
- Add Render callback URL to **Authorized redirect URIs**
- Add Vercel URL to **Authorized JavaScript origins**

### Step 7 — Keep-alive

- cron-job.org: ping `/health` every 1 minute
- UptimeRobot: monitor `/health` every 5 minutes

---

## Environment Variable Changes

**Backend env var change (Render):**
1. Render → nodbusiness-backend → Environment
2. Edit variable
3. Click **"Save, rebuild, and deploy"** (if variable is baked into the image — most are not)
   OR just **"Save changes"** (Render hot-reloads env vars without rebuild for most cases)

> `NEXT_PUBLIC_*` variables in Vercel require a **frontend redeploy** because they are baked into the JavaScript bundle at build time.

---

## Health Check

After any deploy:

```bash
curl https://nodbusiness-backend-9psf.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-22T...",
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

If `database` is not `connected` — check `DATABASE_URL` in Render env vars.
If `redis` is not `connected` — check `REDIS_URL` (may be Upstash daily quota exceeded).
If `storage` is `local` — Supabase storage vars are missing or wrong.

---

## Deployment Checklist

Before every production deploy to real users:

- [ ] All tests passing (`npx jest --runInBand --forceExit`)
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] No high/critical npm vulnerabilities (`npm audit --audit-level=high`)
- [ ] Health check returns `status: ok` after deploy
- [ ] No errors in Render logs for first 2 minutes after deploy
- [ ] Admin password changed from default
- [ ] Feature flags set correctly (Stripe off until keys added)
- [ ] Google OAuth redirect URIs match the live URLs
