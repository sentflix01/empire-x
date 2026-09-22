# Nodbusiness — Deployment Guide

> **Stack:** Render (backend) · Vercel (frontend) · Supabase (database) · Cloudflare R2 (storage)
> **Last updated:** September 2026

---

## Deploy Architecture

```
GitHub (source of truth)
        │
        │  push to main
        ▼
GitHub Actions CI (ci.yml)
  ├── Backend: tsc --noEmit → migrate → jest
  ├── Frontend: lint → tsc --noEmit → next build
  └── Security audit: npm audit --audit-level=high
        │
        │  all green (push to main only)
        ▼
GitHub Actions Deploy (deploy.yml)
  ├── gate: verify CI passed on this exact commit
  ├── migrate: node db/migrate-all.js → Supabase (direct, port 5432)
  ├── deploy-backend: POST Render deploy hook → Render auto-builds + deploys
  ├── deploy-frontend: vercel pull → vercel build --prod → vercel deploy --prebuilt
  └── healthcheck: GET /health (3 attempts) → Telegram alert on failure
```

---

## Environment Variables Reference

### Staging vs Production

| Area | Development | Production |
|---|---|---|
| Frontend build | `npm run build` passes | Same |
| Backend boot | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` set | Same + all items below |
| Database | Supabase free tier | Same (upgrade plan when needed) |
| Payments | Stripe test keys (`sk_test_`) | `sk_live_` keys only |
| Uploads | Local disk acceptable for dev | R2 required — local disk lost on redeploy |
| Email | OTP prints to console if no key set | Real `RESEND_API_KEY` |
| Redis | Optional (no-op fallback works) | Upstash `rediss://` URL recommended |

---

### Backend — Render Environment Variables

Set these in: **Render → your service → Environment → Environment Variables**

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `DATABASE_URL` | Yes | Supabase **pooler** URL, port 6543, `?sslmode=require` |
| `JWT_SECRET` | Yes | Pre-generated 128-hex-char string |
| `FRONTEND_URL` | Yes | `https://nodbusiness.vercel.app` — for CORS |
| `RESEND_API_KEY` | Recommended | Starts with `re_` — OTPs print to console without it |
| `EMAIL_FROM` | No | `Nodbusiness <noreply@yourdomain.com>` |
| `STRIPE_SECRET_KEY` | For payments | `sk_test_...` (dev) or `sk_live_...` (prod) |
| `STRIPE_WEBHOOK_SECRET` | For orders | `whsec_...` from Stripe → Webhooks → `/api/orders/webhook` |
| `STRIPE_MEWACHO_WEBHOOK_SECRET` | For Mewacho | `whsec_...` — endpoint `/api/mewacho/webhook` |
| `STRIPE_CURRENCY` | No | Default `usd` |
| `R2_ACCOUNT_ID` | For uploads | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | For uploads | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | For uploads | R2 API token secret |
| `R2_BUCKET_NAME` | For uploads | `nodbusiness-uploads` |
| `R2_PUBLIC_URL` | For uploads | `https://pub-xxx.r2.dev` |
| `REDIS_URL` | For queues/cache | `rediss://default:[token]@host.upstash.io:6380` |
| `AI_PROVIDER` | No | `openai` \| `gemini` \| `anthropic` |
| `OPENAI_API_KEY` | For AI | `sk-...` |
| `SENTRY_DSN` | Recommended | From Sentry project settings |
| `VAPID_PUBLIC_KEY` | For push | Pre-generated value |
| `VAPID_PRIVATE_KEY` | For push | Pre-generated value |
| `VAPID_EMAIL` | For push | `mailto:admin@yourdomain.com` |
| `GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console OAuth 2.0 Client ID |
| `EXTERNAL_API_ENCRYPTION_KEY` | For external APIs | Pre-generated 64 hex chars |
| `OTP_SALT` | For OTP | Pre-generated 64 hex chars |
| `CHAPA_SECRET_KEY` | For Ethiopian payments | `CHASECK_test_...` or `CHASECK_live_...` |
| `API_URL` | For Chapa callbacks | `https://nodbusiness-backend.onrender.com` |
| `FF_STRIPE_PAYMENTS` | No | `true` to enable Stripe |
| `FF_CHAPA_PAYMENTS` | No | `true` to enable Chapa |

> **PORT:** Do not set manually — Render injects `PORT=10000` automatically.

---

### Frontend — Vercel Environment Variables

Set these in: **Vercel → Project → Settings → Environment Variables**

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `https://nodbusiness-backend.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://nodbusiness.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For OAuth | Same as backend `GOOGLE_CLIENT_ID` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For Stripe | `pk_test_...` or `pk_live_...` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Same as backend `VAPID_PUBLIC_KEY` |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | From Sentry frontend project |

---

### GitHub Actions Secrets

Set these in: **GitHub → Settings → Secrets and variables → Actions**

| Secret | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase **direct** URL, port 5432 — for migrations |
| `RENDER_DEPLOY_HOOK_URL` | Yes | Render → service → Settings → Deploy Hook |
| `VERCEL_TOKEN` | Yes | Vercel → Account Settings → Tokens |
| `BACKEND_URL` | Yes | `https://nodbusiness-backend.onrender.com` |
| `FRONTEND_URL` | Yes | `https://nodbusiness.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | Optional | For deploy failure notifications |
| `TELEGRAM_CHAT_ID` | Optional | For deploy failure notifications |

---

## Day-to-Day Deployment

### Normal deploy (push to main)
```bash
git add .
git commit -m "feat: add product variants"
git push origin main
# CI/CD handles the rest:
# CI → migrate → Render deploy hook → Vercel deploy → health check
```

### Preview deploy (any other branch)
```bash
git push origin feature/my-feature
# Vercel creates a preview URL automatically for every branch/PR
# Render does NOT auto-deploy non-main branches
```

### Emergency rollback

**Backend — Render dashboard (fastest):**
```
Render → your service → Deploys → find last working deploy → Rollback
Takes ~2–3 minutes
```

**Backend — via Git:**
```bash
git revert HEAD
git push origin main
```

**Frontend — Vercel dashboard:**
```
Vercel → Project → Deployments → find last successful → Promote to Production
Takes ~30 seconds
```

### Manual database migration
```bash
# Use the direct Supabase connection string (port 5432, not pooler)
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres?sslmode=require&channel_binding=require" \
  node backend/db/migrate-all.js
```

---

## First-Time Setup Summary

1. **Create Render account** — https://render.com (free, no card required)
2. **Connect GitHub to Render** — New → Web Service → connect `sentflix01/empire-x`
   - Root directory: `backend`
   - Build: `npm ci && npm run build`
   - Start: `node dist/index.js`
3. **Add all Render env vars** from the table above
4. **Copy Render deploy hook URL** → add to GitHub Secrets as `RENDER_DEPLOY_HOOK_URL`
5. **Create Vercel account** — https://vercel.com (free)
6. **Connect GitHub to Vercel** — New Project → import `sentflix01/empire-x`
   - Root directory: `frontend-next`
7. **Add all Vercel env vars** from the table above
8. **Get Vercel token** → add to GitHub Secrets as `VERCEL_TOKEN`
9. **Set all GitHub Secrets** from the table above
10. **Run Supabase migrations** manually the first time
11. **Set up Upstash Redis** — https://upstash.com (free, no card) → copy `rediss://` URL → add to Render env vars
12. **Set up Cloudflare R2** — create bucket, create API token, add 5 R2 vars to Render
13. **Test deploy** — `git commit --allow-empty -m "test" && git push origin main`
