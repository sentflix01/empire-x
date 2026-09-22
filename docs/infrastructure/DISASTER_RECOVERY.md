# Nodbusiness — Disaster Recovery

> **Last updated:** September 22, 2026
> **RTO target:** < 30 minutes for full recovery
> **RPO target:** < 24 hours (daily backups) — zero data loss for DB (Supabase manages durability)

---

## Key Principle

All data lives in **external managed services** — not on the Render server. This means:
- Render container can be deleted and recreated with zero data loss
- Vercel deployment can be redeployed from GitHub with zero data loss
- The only data that can be lost is files uploaded to local disk (not cloud storage)

---

## Scenario 1 — Backend Service Down (Render)

**Symptoms:** `/health` returns 503 or times out. UptimeRobot alert fires.

**Recovery steps:**

```
1. Check Render dashboard
   → https://dashboard.render.com → nodbusiness-backend → Events
   → Look for crash logs or OOM (out of memory)

2. Check Render logs
   → Render → nodbusiness-backend → Logs
   → Look for startup errors (missing env vars, DB connection failure)

3. If bad deployment:
   → Render → Deploys → find last working deploy → three-dot → Redeploy
   → Takes ~3 minutes

4. If env var issue:
   → Render → Environment → fix the variable → Save, rebuild, and deploy

5. If Render service deleted or corrupted:
   → Create new Web Service from scratch (see DEPLOYMENT.md → First-Time Setup)
   → All env vars documented in ENVIRONMENT_VARIABLES.md
   → Data is safe in Supabase — nothing lost
   → Expected recovery: ~15 minutes
```

**Verification:** `curl https://nodbusiness-backend-9psf.onrender.com/health` returns `{"status":"ok"}`

---

## Scenario 2 — Frontend Down (Vercel)

**Symptoms:** `nodbusiness.vercel.app` returns error or blank page.

**Recovery steps:**

```
1. Check Vercel deployment status
   → https://vercel.com → nodbusiness → Deployments
   → Look for failed deployment

2. Rollback to last working deployment
   → Find last green "Ready" deployment
   → Three-dot menu → "Promote to Production"
   → Takes ~10 seconds

3. If all deployments broken:
   → Trigger fresh deploy: git commit --allow-empty -m "fix: force redeploy" && git push origin main
   → CI runs, then Vercel deploys
   → Takes ~8 minutes
```

---

## Scenario 3 — Database Issues (Supabase)

**Symptoms:** `/health` returns `"database": "error"`. All API endpoints return 500.

**Sub-scenario A: Supabase project paused (free tier)**

Free tier projects pause after 1 week of no activity.

```
1. Go to https://supabase.com → your project
2. Click "Restore project" button
3. Wait 2-3 minutes for project to resume
4. Verify: curl /health shows "database": "connected"
```

Prevention: `supabase-keepalive.yml` GitHub Actions workflow runs every 6 hours.

**Sub-scenario B: Wrong DATABASE_URL**

```
1. Go to Supabase → Settings → Database → Connection string
2. Select "Transaction mode" (pooler, port 6543)
3. Copy the URL and replace [YOUR-PASSWORD] with your actual password
4. Update in Render → Environment → DATABASE_URL
5. Save, rebuild, and deploy
```

**Sub-scenario C: Database data loss (unlikely — Supabase manages durability)**

Supabase Pro includes Point-in-Time Recovery. On free tier:
```
1. Go to Supabase → Storage → Backups (if any)
2. Or restore from backup file in backend/backups/ (if local backup ran)
3. Re-run migrations: node db/migrate-all.js
4. Re-seed if needed: node db/create-admin.js
```

---

## Scenario 4 — Redis Down (Upstash)

**Symptoms:** Logs show `Redis quota exceeded` or `ioredis unavailable`. App continues working (graceful degradation).

**Impact when Redis is down:**
- Rate limiting falls back to in-memory (per-instance, not shared)
- JWT revocation disabled (tokens can't be force-invalidated)
- BullMQ queues fall back to synchronous execution
- Socket.IO runs in single-instance mode (no Redis adapter)
- User auth cache disabled (more DB queries)

**Recovery steps:**

```
Option A — Wait for daily reset
   → Upstash free tier resets at midnight UTC (500K/day limit)
   → No action needed

Option B — Create new database
   → console.upstash.com → Delete old database → Create Database
   → Region: eu-central-1 (Frankfurt)
   → Copy new rediss:// URL
   → Render → Environment → REDIS_URL → update → Save, rebuild, and deploy

Option C — Flush the database (resets quota immediately)
   → console.upstash.com → your database → Data Browser → Flush DB
   → Warning: this deletes all cached data (safe — it's all ephemeral)
```

---

## Scenario 5 — Email Service Down (Resend)

**Symptoms:** OTP emails not delivered. Users can't register or log in.

**Impact:** Registration and email-verified login broken. Google OAuth still works.

**Recovery steps:**

```
1. Check Resend status: https://status.resend.com
2. If quota exceeded (3K/month limit):
   → Wait until next month reset
   → Or upgrade to Resend Pro
3. If API key revoked:
   → resend.com → API Keys → Create new key
   → Render → Environment → RESEND_API_KEY → update → redeploy
4. Fallback: configure SMTP (Gmail) as backup
   → Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS to Render env vars
   → Remove RESEND_API_KEY (SMTP is used when Resend key is absent)
```

---

## Scenario 6 — File Uploads Broken (Supabase Storage)

**Symptoms:** Image uploads fail. Uploaded images show broken links.

**Recovery steps:**

```
1. Check Supabase Storage bucket
   → supabase.com → your project → Storage
   → Verify "uploads" bucket exists and is public

2. If bucket deleted:
   → The bucket is auto-created at backend startup
   → Restart Render service → bucket recreates automatically

3. If SUPABASE_STORAGE_KEY wrong:
   → Must be the service_role key, NOT the anon key
   → Supabase → Settings → API → service_role → copy
   → Render → Environment → SUPABASE_STORAGE_KEY → update → redeploy

4. If Supabase storage quota exceeded (1GB free):
   → Delete old/unused files via Supabase Storage dashboard
   → Or upgrade to Supabase Pro ($25/mo) for 100GB
   → Or configure Cloudflare R2 (R2_* env vars)
```

---

## Scenario 7 — Google OAuth Broken

**Symptoms:** "Sign in with Google" button fails. Error in browser console.

**Recovery steps:**

```
1. Check OAuth client in Google Cloud Console
   → console.cloud.google.com → APIs → Credentials → your client

2. Verify authorized redirect URIs include:
   → https://nodbusiness-backend-9psf.onrender.com/api/auth/google/callback

3. Verify authorized JavaScript origins include:
   → https://nodbusiness.vercel.app

4. If Render URL changed:
   → Update the redirect URI in Google Cloud Console
   → Update GOOGLE_CLIENT_ID in Render (should be unchanged)
   → Update NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel

5. If OAuth client deleted:
   → Create new OAuth 2.0 Web application client
   → Add all required URIs
   → Update GOOGLE_CLIENT_ID in both Render and Vercel
   → Redeploy both services
```

---

## Scenario 8 — Full Stack Recovery (Nuclear Option)

If everything is broken and needs to be rebuilt from scratch:

**Time estimate: ~30 minutes**

```
Step 1 (5 min): Create new Render service
   → dashboard.render.com → New → Web Service
   → Connect sentflix01/empire-x
   → Docker, backend/Dockerfile, backend context, Frankfurt, Free
   → Add all env vars from ENVIRONMENT_VARIABLES.md

Step 2 (5 min): Run migrations
   → Local: cd backend && NODE_TLS_REJECT_UNAUTHORIZED=0 node db/migrate-all.js
   → Creates all 38 tables

Step 3 (2 min): Create admin account
   → node db/create-admin.js

Step 4 (3 min): Create new Upstash Redis
   → console.upstash.com → Create Database → eu-central-1
   → Update REDIS_URL in Render

Step 5 (2 min): Verify Supabase Storage
   → Bucket auto-creates on first backend startup

Step 6 (5 min): Redeploy frontend
   → git commit --allow-empty -m "fix: force redeploy" && git push origin main
   → OR: Vercel → Deployments → Redeploy

Step 7 (2 min): Update Google OAuth if URL changed
   → Add new Render URL to redirect URIs

Step 8 (2 min): Set up keep-alive
   → cron-job.org → update URL if changed
   → UptimeRobot → update URL if changed

Step 9 (2 min): Verify
   → curl /health → all services connected
   → Log in as admin@nodbusiness.app
```

---

## Data Safety Summary

| Data | Location | Durability | Recovery |
|---|---|---|---|
| User accounts | Supabase PostgreSQL | Managed by Supabase (replicated) | Never lost unless Supabase deletes the project |
| Posts, products, orders | Supabase PostgreSQL | Same | Same |
| Uploaded files | Supabase Storage | Managed by Supabase | Never lost unless bucket deleted |
| Redis cache | Upstash | Ephemeral — by design | Safe to lose — all regenerated |
| Source code | GitHub | Permanent | Never lost |
| Environment variables | Render + Vercel dashboards | Managed by providers | Document in ENVIRONMENT_VARIABLES.md |
| Local disk uploads | `/app/uploads` on Render | **LOST on every redeploy** | Configure Supabase Storage to avoid this |

---

## Emergency Contacts

| Service | Status page | Support |
|---|---|---|
| Render | https://status.render.com | https://community.render.com |
| Vercel | https://vercel-status.com | https://vercel.com/support |
| Supabase | https://status.supabase.com | https://supabase.com/support |
| Upstash | https://status.upstash.com | https://upstash.com/support |
| Resend | https://status.resend.com | https://resend.com/support |
