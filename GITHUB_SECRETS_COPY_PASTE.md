# GitHub Secrets — Copy-Paste Values

> Open these in order. For each secret, find the value, copy it, and paste into GitHub.

---

## Secret #1: `SUPABASE_DATABASE_URL`

**Where to get it:**
1. Go to: https://app.supabase.com/
2. Click your project → **Settings** → **Database**
3. Under "Connection string", click **URI** tab
4. Under "Use the pool", click copy button

**What to paste:**
- Copy the full connection string that looks like:
  ```
  postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
  ```

**Where to put it in GitHub:**
- Go to: https://github.com/sentflix01/empire-x/settings/secrets/actions
- Click **"New repository secret"**
- Name: `SUPABASE_DATABASE_URL`
- Paste the value
- Click **Save**

---

## Secret #2: `RENDER_API_KEY`

**Where to get it:**
1. Go to: https://dashboard.render.com/
2. Click your profile (bottom left) → **Account Settings**
3. Scroll to **API Keys** section
4. Click **"Create Key"**
5. Copy the key (starts with `rnd_...`)

**What to paste:**
- Your Render API key (example: `rnd_aBcDeFg123...`)

**Where to put it in GitHub:**
- Go to: https://github.com/sentflix01/empire-x/settings/secrets/actions
- Click **"New repository secret"**
- Name: `RENDER_API_KEY`
- Paste the key
- Click **Save**

---

## Secret #3: `RENDER_SERVICE_ID`

**Where to get it:**
1. Go to: https://dashboard.render.com/
2. Click your **backend service** (the Node.js service, not web)
3. Click **Settings** tab (right side)
4. Find **Service ID** in the settings
5. Copy it (looks like: `srv_...`)

**What to paste:**
- Your Render service ID

**Where to put it in GitHub:**
- Go to: https://github.com/sentflix01/empire-x/settings/secrets/actions
- Click **"New repository secret"**
- Name: `RENDER_SERVICE_ID`
- Paste the ID
- Click **Save**

---

## Secret #4: `VERCEL_TOKEN`

**Where to get it:**
1. Go to: https://vercel.com/account/tokens
2. Click **"Create New Token"**
3. Name: `github-deploy` (or anything)
4. Copy the token (starts with `vercel_...`)

**What to paste:**
- Your Vercel token (example: `vercel_aBcDeFg123...`)

**Where to put it in GitHub:**
- Go to: https://github.com/sentflix01/empire-x/settings/secrets/actions
- Click **"New repository secret"**
- Name: `VERCEL_TOKEN`
- Paste the token
- Click **Save**

---

## Secret #5: `BACKEND_URL`

**Where to get it:**
1. Go to: https://dashboard.render.com/
2. Click your backend service
3. Copy the URL at the top (example: `https://nodbusiness-backend.onrender.com`)

**What to paste:**
- Your full backend URL (no trailing slash)
- Example: `https://nodbusiness-backend.onrender.com`

**Where to put it in GitHub:**
- Go to: https://github.com/sentflix01/empire-x/settings/secrets/actions
- Click **"New repository secret"**
- Name: `BACKEND_URL`
- Paste the URL
- Click **Save**

---

## Secret #6: `FRONTEND_URL`

**Where to get it:**
1. Go to: https://vercel.com/
2. Click your project
3. Go to **Settings** → **Domains**
4. Copy your main domain (example: `halehame-eosin.vercel.app`)

**What to paste:**
- Your Vercel domain (no `https://`, no trailing slash)
- Example: `halehame-eosin.vercel.app`

**Where to put it in GitHub:**
- Go to: https://github.com/sentflix01/empire-x/settings/secrets/actions
- Click **"New repository secret"**
- Name: `FRONTEND_URL`
- Paste the domain
- Click **Save**

---

## ✅ Verify All 6 Are Added

After adding all 6, check: https://github.com/sentflix01/empire-x/settings/secrets/actions

You should see all 6 secrets listed.

---

## 🚀 Next Step

Make a commit to trigger deploy:
```bash
git commit --allow-empty -m "test: trigger deploy with all secrets"
git push origin main
```

Then watch GitHub Actions: https://github.com/sentflix01/empire-x/actions

It should: **CI → Deploy → Migrate → Backend Deploy → Frontend Deploy**
