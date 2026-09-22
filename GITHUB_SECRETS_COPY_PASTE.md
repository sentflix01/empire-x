# GitHub Secrets — Copy-Paste Values

> Open these in order. For each secret, find the value, copy it, and paste into GitHub.
> **Stack:** Render (backend) · Vercel (frontend) · Supabase
> **Last updated:** September 2026

---

## How to Add Secrets

1. Go to: https://github.com/sentflix01/empire-x/settings/secrets/actions
2. For each secret below: click **"New repository secret"**, enter the Name and Value, click **Save**

---

## Secret #1: `DATABASE_URL`

**What it's for:** Running database migrations in CI/CD. Must be the **direct** Supabase connection (port 5432).

**Where to get it:**
1. Go to https://supabase.com → Your project
2. **Project Settings** → **Database** → **Connection string** tab
3. Make sure **Connection pooling** toggle is **OFF**
4. Copy the URI — ends with `?sslmode=require`

**Format:**
```
postgresql://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require&channel_binding=require
```

---

## Secret #2: `RENDER_DEPLOY_HOOK_URL`

**What it's for:** Triggering an explicit backend deploy from GitHub Actions after migrations pass.

**Where to get it:**
1. Log in to https://dashboard.render.com
2. Click your **nodbusiness-backend** service
3. Click **Settings** tab
4. Scroll to **Deploy Hook** section
5. Copy the URL — looks like:
   ```
   https://api.render.com/deploy/srv-XXXXXXXXXXXX?key=YYYYYYYYYYYY
   ```

---

## Secret #3: `VERCEL_TOKEN`

**What it's for:** Authorising the Vercel CLI to deploy the frontend from GitHub Actions.

**Where to get it:**
1. Go to https://vercel.com → click your profile picture (top right) → **Account Settings**
2. Click **Tokens** in the left sidebar
3. Click **Create** → name: `github-actions` → copy the token

---

## Secret #4: `BACKEND_URL`

**What it's for:** The post-deploy health check pings `BACKEND_URL/health`.

**Where to get it:**
1. Go to https://dashboard.render.com
2. Click your backend service
3. Copy the public URL shown at the top

**Example value:**
```
https://nodbusiness-backend.onrender.com
```

---

## Secret #5: `FRONTEND_URL`

**What it's for:** The post-deploy health check pings the frontend homepage.

**Where to get it:**
1. Go to https://vercel.com → your project
2. Go to **Settings** → **Domains**
3. Copy your primary domain

**Example value:**
```
https://nodbusiness.vercel.app
```

---

## Secret #6 (Optional): `TELEGRAM_BOT_TOKEN`

**What it's for:** Sends a Telegram message if the post-deploy health check fails.

**Where to get it:**
1. Open Telegram → Search **@BotFather**
2. Send `/newbot` → follow the steps
3. Copy the token — format: `123456789:ABCDEFabcdef-xxxxx`

---

## Secret #7 (Optional): `TELEGRAM_CHAT_ID`

**What it's for:** Which Telegram chat to send alerts to.

**Where to get it:**
1. Open Telegram → Search **@userinfobot**
2. Send any message
3. Copy the `id` number from the reply

---

## ✅ Checklist

After adding all secrets:

- [ ] `DATABASE_URL` — Supabase direct URI (port 5432, sslmode=require) ✓
- [ ] `RENDER_DEPLOY_HOOK_URL` — from Render → service → Settings → Deploy Hook ✓
- [ ] `VERCEL_TOKEN` — from Vercel → Account Settings → Tokens ✓
- [ ] `BACKEND_URL` — `https://nodbusiness-backend.onrender.com` ✓
- [ ] `FRONTEND_URL` — `https://nodbusiness.vercel.app` ✓
- [ ] `TELEGRAM_BOT_TOKEN` — optional ✓
- [ ] `TELEGRAM_CHAT_ID` — optional ✓

**Secrets to remove** (old stack — no longer used):
- `COOLIFY_WEBHOOK_URL` → Coolify no longer used
- `COOLIFY_TOKEN` → Coolify no longer used
- `SUPABASE_DATABASE_URL` → replaced by `DATABASE_URL`
- `SOURCE_DATABASE_URL` → no longer referenced

---

## 🚀 Test the Setup

```bash
git commit --allow-empty -m "test: trigger deploy with new secrets"
git push origin main
```

Watch GitHub Actions → Actions tab. Expected flow:
1. **Nodbusiness CI** — lint, typecheck, tests, audit
2. **Nodbusiness Deploy** starts on CI success
3. `migrate` — runs against Supabase (direct URL)
4. `deploy-backend` — fires Render deploy hook
5. `deploy-frontend` — Vercel CLI builds and deploys
6. `healthcheck` — pings `/health` on both services

Verify:
```bash
curl https://nodbusiness-backend.onrender.com/health
# Expected: { "status": "ok", "services": { "database": "connected", ... } }
```
