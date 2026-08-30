# GitHub Repository Secrets Setup

Add these secrets to: **GitHub → Settings → Secrets and variables → Actions → Repository secrets**

---

## ✅ CRITICAL SECRETS (Must Have)

| # | Secret Name | Value Format | Example | Where to Get It |
|---|---|---|---|---|
| 1 | `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres?sslmode=require` | Supabase → Project Settings → Database → Connection string (URI) |
| 2 | `RENDER_API_KEY` | API key from Render | `rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Render → Account Settings → API Keys → Create Key |
| 3 | `RENDER_SERVICE_ID` | Service ID from Render backend | `srv_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Render Dashboard → Backend service → Settings → Service ID |
| 4 | `VERCEL_TOKEN` | Personal access token | `vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Vercel → Settings → Tokens → Create token |
| 5 | `BACKEND_URL` | Public backend URL | `https://nodbusiness-backend.onrender.com` | Render Dashboard → Backend service → Public URL |
| 6 | `FRONTEND_URL` | Public frontend URL | `https://halehame-eosin.vercel.app` | Vercel → Project → Settings → Domains → Primary domain |

---

## ⭐ OPTIONAL SECRETS (Recommended for Alerts)

| # | Secret Name | Value Format | Where to Get It |
|---|---|---|---|
| 7 | `TELEGRAM_BOT_TOKEN` | Telegram bot token | Telegram → @BotFather → Create bot → Copy token |
| 8 | `TELEGRAM_CHAT_ID` | Your Telegram chat ID | Telegram → Forward any message to @userinfobot → Copy chat ID |

---

## 📋 Quick Reference Table for Copy-Paste

Copy this table and fill in your values:

```
Slot | Secret Name           | Your Value
-----|----------------------|---------------------
1    | DATABASE_URL         | [Supabase connection string]
2    | RENDER_API_KEY       | [From Render account]
3    | RENDER_SERVICE_ID    | [From Render backend service]
4    | VERCEL_TOKEN         | [From Vercel account]
5    | BACKEND_URL          | [Render backend public URL]
6    | FRONTEND_URL         | [Vercel domain]
7    | TELEGRAM_BOT_TOKEN   | [Optional - from @BotFather]
8    | TELEGRAM_CHAT_ID     | [Optional - from @userinfobot]
```

---

## 🚀 Step-by-Step: How to Add Each Secret

### Step 1: Go to GitHub Secrets Page
1. Open https://github.com/sentflix01/empire-x
2. Click **Settings** tab
3. Left sidebar → **Secrets and variables** → **Actions**
4. You should see the page with "Repository secrets" section

### Step 2: Add Each Secret One by One

For each secret below, click **"New repository secret"** button and fill in:

---

### Secret #1: DATABASE_URL

**Name:** `DATABASE_URL`

**Value:** (Your Supabase connection string)
```
postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

**How to get it:**
1. Go to https://supabase.com → Your project
2. **Project Settings** → **Database** → **Connection string (URI)**
3. Copy the entire string
4. Paste into GitHub secret

**Paste example:**
```
postgresql://postgres:AbC123xYz789@db.tpgzlokgnjxcerexxoda.supabase.co:5432/postgres?sslmode=require
```

---

### Secret #2: RENDER_API_KEY

**Name:** `RENDER_API_KEY`

**Value:** (Your Render API key)

**How to get it:**
1. Go to https://dashboard.render.com
2. Click your **Account icon** (top-right) → **Account**
3. Scroll down to **API Keys**
4. Click **Create API Key**
5. Copy the key and paste into GitHub secret

**Will look like:**
```
rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Secret #3: RENDER_SERVICE_ID

**Name:** `RENDER_SERVICE_ID`

**Value:** (Your Render backend service ID)

**How to get it:**
1. Go to https://dashboard.render.com
2. Click your **Backend service** (e.g., "nodbusiness-backend")
3. Click **Settings** tab
4. Scroll down to **Service ID**
5. Copy and paste into GitHub secret

**Will look like:**
```
srv_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Secret #4: VERCEL_TOKEN

**Name:** `VERCEL_TOKEN`

**Value:** (Your Vercel personal access token)

**How to get it:**
1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. Give it a name (e.g., "GitHub Deploy")
4. Copy and paste into GitHub secret

**Will look like:**
```
vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Secret #5: BACKEND_URL

**Name:** `BACKEND_URL`

**Value:** (Your Render backend public URL)

**How to get it:**
1. Go to https://dashboard.render.com
2. Click your **Backend service**
3. Copy the **Public URL** from the top of the page
4. Paste into GitHub secret

**Will look like:**
```
https://nodbusiness-backend.onrender.com
```

---

### Secret #6: FRONTEND_URL

**Name:** `FRONTEND_URL`

**Value:** (Your Vercel frontend URL)

**How to get it:**
1. Go to https://vercel.com → Your project
2. Click **Settings** → **Domains**
3. Copy your primary domain (usually the .vercel.app one)
4. Paste into GitHub secret

**Will look like:**
```
https://halehame-eosin.vercel.app
```

---

### Secret #7 (Optional): TELEGRAM_BOT_TOKEN

**Name:** `TELEGRAM_BOT_TOKEN`

**Value:** (Your Telegram bot token)

**How to get it:**
1. Open Telegram → Search for **@BotFather**
2. Send `/newbot`
3. Follow instructions to create a bot
4. Copy the bot token that looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
5. Paste into GitHub secret

**Note:** This is optional. If you skip it, deployment failures won't be sent to Telegram.

---

### Secret #8 (Optional): TELEGRAM_CHAT_ID

**Name:** `TELEGRAM_CHAT_ID`

**Value:** (Your Telegram chat/group ID)

**How to get it:**
1. Open Telegram → Search for **@userinfobot**
2. Send any message
3. The bot replies with your ID (usually a long number like `123456789`)
4. Paste into GitHub secret

**Note:** This is optional. Only needed if you're using Telegram notifications.

---

## ✅ Verification Checklist

After adding all secrets:

- [ ] `DATABASE_URL` — Added ✓
- [ ] `RENDER_API_KEY` — Added ✓
- [ ] `RENDER_SERVICE_ID` — Added ✓
- [ ] `VERCEL_TOKEN` — Added ✓
- [ ] `BACKEND_URL` — Added ✓
- [ ] `FRONTEND_URL` — Added ✓
- [ ] `TELEGRAM_BOT_TOKEN` — Added (optional) ✓
- [ ] `TELEGRAM_CHAT_ID` — Added (optional) ✓

---

## 🧪 Test the Setup

After adding all secrets:

1. Make a test commit:
   ```bash
   git commit --allow-empty -m "test: trigger deploy with new secrets"
   git push origin main
   ```

2. Watch GitHub Actions:
   - Go to your repo → **Actions** tab
   - You should see **"Nodbusiness CI"** workflow running
   - After CI passes, **"Nodbusiness Deploy"** should start
   - Check that migrations run successfully
   - Check that backend deploys to Render
   - Check that frontend deploys to Vercel

3. Verify health:
   - Backend: `curl https://[your-backend-url]/health` → should return `200`
   - Frontend: `https://[your-frontend-url]` → should load

---

## 🆘 Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `DATABASE_URL not set` | Secret not added or wrong name | Check secret name is exactly `DATABASE_URL` |
| `Invalid RENDER_API_KEY` | Key is expired or wrong | Generate new key in Render account |
| `Service not found` | Wrong `RENDER_SERVICE_ID` | Copy correct ID from Render service settings |
| `Deploy doesn't start` | Missing secrets | Make sure all 6 critical secrets are added |
| `Backend won't connect to DB` | Wrong DATABASE_URL format | Use **Connection string (URI)** from Supabase, not connection pooler |

---

**Last Updated:** 2026-08-30
