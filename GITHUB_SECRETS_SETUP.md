# GitHub Repository Secrets Setup

Add these secrets to: **GitHub → Settings → Secrets and variables → Actions → Repository secrets**

> **Stack:** Render (backend) · Vercel (frontend) · Supabase · Upstash Redis · Cloudflare R2 · Resend
> **Last updated:** September 2026

---

## ✅ CRITICAL SECRETS (Must Have)

| # | Secret Name | Value Format | Where to Get It |
|---|---|---|---|
| 1 | `DATABASE_URL` | PostgreSQL direct connection URI with `sslmode=require` | Supabase → Project Settings → Database → URI (pooling OFF) |
| 2 | `RENDER_DEPLOY_HOOK_URL` | Full deploy hook URL from Render | Render → your service → Settings → Deploy Hook → Copy URL |
| 3 | `VERCEL_TOKEN` | Vercel personal access token | Vercel → Account Settings → Tokens → Create Token |
| 4 | `BACKEND_URL` | Public Render backend URL | e.g. `https://nodbusiness-backend-9psf.onrender.com` |
| 5 | `FRONTEND_URL` | Public Vercel frontend URL | e.g. `https://nodbusiness.vercel.app` |

---

## ⭐ OPTIONAL SECRETS (Recommended for Alerts)

| # | Secret Name | Value Format | Where to Get It |
|---|---|---|---|
| 6 | `TELEGRAM_BOT_TOKEN` | Telegram bot token | Telegram → @BotFather → Create bot → Copy token |
| 7 | `TELEGRAM_CHAT_ID` | Your Telegram chat ID | Telegram → Forward any message to @userinfobot → Copy ID |

---

## 🗑️ SECRETS TO REMOVE (Old Stack — No Longer Used)

If you previously had these secrets configured, remove them:

| Old Secret | Was Used For |
|---|---|
| `COOLIFY_WEBHOOK_URL` | Old deploy webhook — project now on Render |
| `COOLIFY_TOKEN` | Old API token — project now on Render |
| `SUPABASE_DATABASE_URL` | Old name — replaced by `DATABASE_URL` |
| `SOURCE_DATABASE_URL` | Old migration script |

---

## 📋 Quick Reference Table for Copy-Paste

```
Slot | Secret Name              | Your Value
-----|--------------------------|---------------------
1    | DATABASE_URL             | [Supabase direct connection URI]
2    | RENDER_DEPLOY_HOOK_URL   | [From Render → service → Settings → Deploy Hook]
3    | VERCEL_TOKEN             | [From Vercel → Account Settings → Tokens]
4    | BACKEND_URL              | [Your Render backend public URL]
5    | FRONTEND_URL             | [Your Vercel deployment URL]
6    | TELEGRAM_BOT_TOKEN       | [Optional - from @BotFather]
7    | TELEGRAM_CHAT_ID         | [Optional - from @userinfobot]
```

---

## 🚀 Step-by-Step: How to Add Each Secret

### Step 1: Go to GitHub Secrets Page
1. Open your GitHub repository
2. Click **Settings** tab
3. Left sidebar → **Secrets and variables** → **Actions**
4. You should see the "Repository secrets" section

---

### Secret #1: DATABASE_URL

**Name:** `DATABASE_URL`

**Value:** Your Supabase **direct** connection URI (not the pooler — migrations require direct connection)

**How to get it:**
1. Go to https://supabase.com → Your project
2. **Project Settings** → **Database** → **Connection string** tab → select **URI**
3. Make sure **Connection pooling** toggle is **OFF**
4. Copy the URI — it ends with `?sslmode=require`

**Format:**
```
postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

---

### Secret #2: RENDER_DEPLOY_HOOK_URL

**Name:** `RENDER_DEPLOY_HOOK_URL`

**Value:** The deploy hook URL from your Render backend service

**How to get it:**
1. Log in to https://dashboard.render.com
2. Click your **nodbusiness-backend** service
3. Go to **Settings** tab
4. Scroll to **Deploy Hook** section
5. Copy the URL — looks like:
   ```
   https://api.render.com/deploy/srv-XXXXXXXXXXXX?key=YYYYYYYYYYYY
   ```

---

### Secret #3: VERCEL_TOKEN

**Name:** `VERCEL_TOKEN`

**Value:** A Vercel personal access token

**How to get it:**
1. Go to https://vercel.com → click your profile (top right) → **Account Settings**
2. Click **Tokens** in the left sidebar
3. Click **Create** → name it `github-actions`
4. Copy the token

---

### Secret #4: BACKEND_URL

**Name:** `BACKEND_URL`

**Value:** Your Render backend public URL

**How to get it:**
1. Go to https://dashboard.render.com
2. Click your backend service
3. Copy the URL shown at the top (e.g. `https://nodbusiness-backend-9psf.onrender.com`)

**Example:**
```
https://nodbusiness-backend-9psf.onrender.com
```

---

### Secret #5: FRONTEND_URL

**Name:** `FRONTEND_URL`

**Value:** Your Vercel frontend URL

**How to get it:**
1. Go to https://vercel.com → your project
2. Click **Settings** → **Domains**
3. Copy your primary deployment URL

**Example:**
```
https://nodbusiness.vercel.app
```

---

### Secret #6 (Optional): TELEGRAM_BOT_TOKEN

**How to get it:**
1. Open Telegram → Search **@BotFather**
2. Send `/newbot` and follow instructions
3. Copy the token — format: `123456789:ABCDEFabcdef-xxxxx`

---

### Secret #7 (Optional): TELEGRAM_CHAT_ID

**How to get it:**
1. Open Telegram → Search **@userinfobot**
2. Send any message
3. Copy the `id` number from the reply

---

## ✅ Verification Checklist

After adding all secrets:

- [ ] `DATABASE_URL` — Supabase direct URI (port 5432, sslmode=require) ✓
- [ ] `RENDER_DEPLOY_HOOK_URL` — from Render → service → Settings → Deploy Hook ✓
- [ ] `VERCEL_TOKEN` — from Vercel → Account Settings → Tokens ✓
- [ ] `BACKEND_URL` — your Render backend URL ✓
- [ ] `FRONTEND_URL` — your Vercel deployment URL ✓
- [ ] `TELEGRAM_BOT_TOKEN` — optional, for deploy failure alerts ✓
- [ ] `TELEGRAM_CHAT_ID` — optional, for deploy failure alerts ✓

---

## 🧪 Test the Setup

```bash
git commit --allow-empty -m "test: trigger deploy with secrets"
git push origin main
```

Watch: **GitHub → Actions** tab

Expected flow:
1. **Nodbusiness CI** runs (lint, typecheck, tests, audit)
2. On CI success → **Nodbusiness Deploy** starts
3. `migrate` job runs migrations against Supabase
4. `deploy-backend` job fires Render deploy hook
5. `deploy-frontend` job deploys to Vercel
6. `healthcheck` job pings `/health`

Verify backend:
```bash
curl https://nodbusiness-backend-9psf.onrender.com/health
# Expected: { "status": "ok", "services": { "database": "connected", ... } }
```

---

## 🆘 Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `DATABASE_URL not set` | Secret missing or wrong name | Check name is exactly `DATABASE_URL` |
| Render deploy hook returns 400/404 | Wrong hook URL | Re-copy URL from Render → service → Settings → Deploy Hook |
| Vercel deploy fails | Missing `VERCEL_TOKEN` or expired | Regenerate token in Vercel → Account Settings → Tokens |
| Backend health check fails | Render service still starting (free tier takes 30–60s) | Wait 60s after deploy, check Render logs |
| Frontend not updating | Vercel not connected to repo | Vercel → Project → Settings → Git → confirm repo connected |
| CORS error | `FRONTEND_URL` in Render mismatch | Ensure `FRONTEND_URL` in Render env vars matches your Vercel URL exactly |

---

**Last Updated:** September 2026
**Deploy Stack:** Render (backend) · Vercel (frontend) · Supabase (database) · Upstash Redis · Cloudflare R2 (storage)
