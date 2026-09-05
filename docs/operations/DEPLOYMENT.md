# Nodbusiness — Deployment Guide

> Backend: Render · Frontend: Vercel · Database: Neon (PostgreSQL) · Storage: Cloudflare R2

---

## Deploy Architecture

```
GitHub (source of truth)
        │
        │  push to main
        ▼
GitHub Actions CI
  ├── Backend tests pass?
  ├── Next.js build passes?
  └── Security audit clean?
        │
        │  all green
        ▼
┌───────────────────────────┐
│  Deploy Backend → Render  │   ~3 min
└───────────────────────────┘
        │
        │  success + health check passes
        ▼
┌───────────────────────────┐
│  Deploy Frontend → Vercel │   ~3 min
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│  Health check: GET /health│   verifies backend is alive
└───────────────────────────┘
```

---

## Environment Variables Reference

### Staging Simulation vs Public Production

For a development/staging simulation, you can deploy with test services and incomplete optional integrations. The goal is to review the product experience before public launch.

Minimum staging requirements:

| Area | Requirement |
|---|---|
| Frontend build | `cd frontend-next && npm run build` passes |
| Backend boot | `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL` set |
| Database | Separate staging database; seeded/test data only |
| Payments | Stripe test keys only |
| Uploads | Local disk is acceptable for short-lived simulation; R2 is better if you need persistent uploaded images |
| Email | Resend test sender, SMTP, or console OTP flow |
| AI / Redis / Push / Sentry | Optional for staging unless you are specifically testing those features |

> Free beta expectations: this repo can support a small closed beta on free infrastructure, but it is not designed for a full 1000-user / 150-business production launch on free resources. Expect only a small pilot of around 20–100 active users and a handful of businesses if you keep uploads, email, and database usage light.

Public production requirements are stricter: use R2 for uploads, managed Redis if queues/presence matter, real monitoring, verified email domain, live payment keys only after business/legal review, and security debt from `TECHNICAL_DEBT.md` reviewed.

### Backend (Render)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `3001` (Render sets this automatically) |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | 64+ char random string |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `FRONTEND_URL` | Yes | `https://nodbusiness.vercel.app` — must match Vercel domain exactly for CORS + refresh cookie to work. Comma-separated for multiple origins. Wildcard patterns (`https://*.vercel.app`) supported for preview deployments. |
| `RESEND_API_KEY` | Recommended | Starts with `re_` — do NOT use placeholder values like `re_test_disabled` or the mailer falls back to console (dev only) |
| `EMAIL_FROM` | No | `Nodbusiness <noreply@nodbusiness.app>` |
| `STRIPE_SECRET_KEY` | For payments | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | For orders webhook | `whsec_...` — from Stripe Dashboard → Webhooks → `/api/orders/webhook` |
| `STRIPE_MEWACHO_WEBHOOK_SECRET` | For Mewacho | `whsec_...` — separate endpoint → `/api/mewacho/webhook`, event: `checkout.session.completed` |
| `STRIPE_CURRENCY` | No | Default `usd`. Set `etb` only if your Stripe account supports it. |
| `STRIPE_ETB_TO_USD_RATE` | No | Default `0.008` (1 ETB ≈ 0.008 USD) |
| `R2_ACCOUNT_ID` | For uploads | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | For uploads | R2 API token |
| `R2_SECRET_ACCESS_KEY` | For uploads | R2 API secret |
| `R2_BUCKET_NAME` | For uploads | e.g. `nodbusiness-uploads` |
| `R2_PUBLIC_URL` | For uploads | `https://pub-xxx.r2.dev` |
| `REDIS_URL` | For queues/presence | `rediss://...upstash.io` — optional, app works without it |
| `AI_PROVIDER` | No | `openai` \| `gemini` \| `anthropic` |
| `OPENAI_API_KEY` | For AI | `sk-...` |
| `SENTRY_DSN` | Recommended | From Sentry project settings |
| `VAPID_PUBLIC_KEY` | For push | Generated VAPID key |
| `VAPID_PRIVATE_KEY` | For push | Generated VAPID key |
| `VAPID_EMAIL` | For push | `mailto:admin@nodbusiness.app` |
| `GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Google Cloud Console |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `https://nodbusiness-backend.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://nodbusiness.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Same as backend `VAPID_PUBLIC_KEY` |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | From Sentry project |

---

## GitHub Actions Secrets

The repository uses GitHub Actions to deploy the backend and frontend. Set these secrets in the repository settings before you push to `main`.

| Secret | Required | Description |
|---|---|---|
| `RAILWAY_TOKEN` | Yes | Railway CLI token for backend deployment |
| `VERCEL_TOKEN` | Yes | Vercel CLI token for frontend deployment |
| `BACKEND_URL` | Yes | Public backend URL used by the post-deploy health check |
| `SOURCE_DATABASE_URL` | Optional | Local or staging DB URL for Neon migration workflow |
| `NEON_DATABASE_URL` | Optional | Neon connection string for migration workflow |

> If your source database is only accessible from your laptop, use `scripts/export_and_restore_to_neon.ps1` instead of the GitHub Actions migration workflow.
>
> If you use Vercel preview deployments and Google login, include `https://*.vercel.app` in `FRONTEND_URL` and add your preview URLs as authorized JavaScript origins in your Google Cloud OAuth client.

---

## Day-to-Day Deployment

### Normal deploy (push to main)
```bash
git add .
git commit -m "feat: add product variants"
git push origin main
# CI/CD handles the rest automatically
```

### Preview deploy (any other branch)
```bash
git push origin feature/my-feature
# Vercel creates a preview URL automatically
# Railway does NOT deploy non-main branches by default
```

### Emergency rollback
```bash
# Backend — Railway dashboard
# Railway → Deployments → last working deploy → Rollback

# Frontend — Vercel dashboard
# Vercel → Deployments → last successful → Promote to Production
```

### Manual database migration
```bash
# If a migration wasn't run automatically
DATABASE_URL=postgresql://...neon.tech/empirex node backend/db/migrate-all.js
```

---

## First-Time Setup Summary

1. Push code to GitHub
2. Set up Neon → run `node backend/db/migrate-all.js` (26 migrations)
3. Set up Render → add env vars → deploy backend
4. Set up Vercel → add env vars → deploy `frontend-next`
5. Update `FRONTEND_URL` in Render to your Vercel URL (critical for refresh cookie + CORS)
6. Set up Cloudflare R2 → add R2 env vars to Render
7. Set up Resend → add real `RESEND_API_KEY` to Render (not a placeholder)
8. Set up Stripe → add two webhook endpoints:
   - `/api/orders/webhook` → `STRIPE_WEBHOOK_SECRET`
   - `/api/mewacho/webhook` → `STRIPE_MEWACHO_WEBHOOK_SECRET` (event: `checkout.session.completed`)
9. Set up Better Uptime → monitor `/health`
10. Set up Sentry → add `SENTRY_DSN` to both Render and Vercel
11. Register a user, place a test order, create a Mewacho group, contribute — verify everything works
