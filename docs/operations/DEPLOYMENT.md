# Empire X — Deployment Guide

> This file covers staging simulation, production deployment, environment variables, and day-to-day deploy workflow.

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
│  Deploy Backend → Railway │   ~2 min
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

Public production requirements are stricter: use R2 for uploads, managed Redis if queues/presence matter, real monitoring, verified email domain, live payment keys only after business/legal review, and security debt from `TECHNICAL_DEBT.md` reviewed.

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `3001` |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | 64+ char random string |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `FRONTEND_URL` | Yes | `https://empirex.app` (comma-separated for multiple) |
| `RESEND_API_KEY` | Recommended | Starts with `re_` |
| `EMAIL_FROM` | No | `Empire X <noreply@empirex.app>` |
| `STRIPE_SECRET_KEY` | For payments | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | For payments | `whsec_...` |
| `R2_ACCOUNT_ID` | For uploads | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | For uploads | R2 API token |
| `R2_SECRET_ACCESS_KEY` | For uploads | R2 API secret |
| `R2_BUCKET_NAME` | For uploads | `empire-x-uploads` |
| `R2_PUBLIC_URL` | For uploads | `https://pub-xxx.r2.dev` |
| `REDIS_URL` | For Phase 2 | `rediss://...upstash.io` |
| `AI_PROVIDER` | No | `openai` \| `gemini` \| `anthropic` |
| `OPENAI_API_KEY` | For AI | `sk-...` |
| `GEMINI_API_KEY` | For AI | `AIza...` |
| `SENTRY_DSN` | Recommended | From Sentry project settings |
| `VAPID_PUBLIC_KEY` | For push | Generated VAPID key |
| `VAPID_PRIVATE_KEY` | For push | Generated VAPID key |
| `VAPID_EMAIL` | For push | `mailto:admin@empirex.app` |
| `TELEGRAM_BOT_TOKEN` | Optional | From @BotFather |
| `GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `https://api.empirex.app` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://empirex.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Same as backend VAPID_PUBLIC_KEY |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | From Sentry project |

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
2. Set up Neon → run migrations
3. Set up Railway → add env vars → deploy backend
4. Set up Vercel → add env vars → deploy `frontend-next`
5. Update `FRONTEND_URL` in Railway to your Vercel URL
6. Set up Cloudflare R2 → add R2 env vars to Railway
7. Set up Resend → add `RESEND_API_KEY` to Railway
8. Set up Better Uptime → monitor `/health`
9. Set up Sentry → add `SENTRY_DSN` to both Railway and Vercel
10. Register a user, place a test order, verify everything works

For staging-only simulation, stop after steps 1-5 if your core flows work. Add R2, Resend, Sentry, Redis, push, and custom domains only when those features are part of the simulation.
