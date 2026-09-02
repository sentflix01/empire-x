# Nodbusiness — Deployment Guide

> This file covers staging simulation, production deployment, environment variables, and day-to-day deploy workflow.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| CI/CD | Continuous Integration / Continuous Delivery |
| API | Application Programming Interface |
| JWT | JSON Web Token |
| HTTPS | HyperText Transfer Protocol Secure |
| CDN | Content Delivery Network |
| R2 | Cloudflare R2 — object storage service |
| OTP | One-Time Password |
| DB | Database |
| SSL | Secure Sockets Layer |
| TLS | Transport Layer Security |
| ENV | Environment variable |
| VAPID | Voluntary Application Server Identification — Web Push keys |

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
│  Deploy Backend → Render  │   ~2 min
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

Configure the Render service health-check path as `/health`. Do not use `/`:
the backend is an API and intentionally has no root-page route. Render must
receive a `200` response from `/health` before it accepts a deployment.

Database migrations are a blocking deployment gate. Set the
`SUPABASE_DATABASE_URL` GitHub Actions secret to the production database URL;
the deployment workflow applies all pending idempotent migrations before it
requests a Render deployment.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes (enforced)** | PostgreSQL connection string from Supabase or Neon — app hard-exits without it |
| `JWT_SECRET` | **Yes (enforced)** | 64+ char random string — app hard-exits without it |
| `NODE_ENV` | Recommended | `production` enables Helmet CSP, prod rate limits, Secure cookies |
| `PORT` | No | Default `3001` |
| `FRONTEND_URL` | Yes | `https://nodbusiness.vercel.app` (comma-separated for multiple or wildcard patterns like `https://*.vercel.app`) |
| `RESEND_API_KEY` | Recommended | Starts with `re_` |

> Tip: `FRONTEND_URL` can contain multiple trusted origins separated by commas. The first valid URL is used for email/reset links and checkout redirects, while wildcard patterns are used for CORS origins.
>
> Recommended free-tier database: Supabase Postgres. Example connection string:
> `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres?sslmode=require`

| Variable | Required | Description |
|---|---|---|
| `EMAIL_FROM` | No | `Nodbusiness <noreply@nodbusiness.app>` |
| `STRIPE_SECRET_KEY` | For payments | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | For payments | `whsec_...` |
| `R2_ACCOUNT_ID` | For uploads | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | For uploads | R2 API token |
| `R2_SECRET_ACCESS_KEY` | For uploads | R2 API secret |
| `R2_BUCKET_NAME` | For uploads | `nodbusiness-uploads` |
| `R2_PUBLIC_URL` | For uploads | `https://pub-xxx.r2.dev` |
| `REDIS_URL` | For Phase 2 | `rediss://...upstash.io` |

> Note: this app falls back to local disk uploads when R2 is not configured, which is fine for development and testing but not recommended for production deployment.
| `AI_PROVIDER` | No | `openai` \| `gemini` \| `anthropic` |
| `OPENAI_API_KEY` | For AI | `sk-...` |
| `GEMINI_API_KEY` | For AI | `AIza...` |
| `SENTRY_DSN` | Recommended | From Sentry project settings |
| `VAPID_PUBLIC_KEY` | For push | Generated VAPID key |
| `VAPID_PRIVATE_KEY` | For push | Generated VAPID key |
| `VAPID_EMAIL` | For push | `mailto:admin@nodbusiness.app` |
| `TELEGRAM_BOT_TOKEN` | Optional | From @BotFather |
| `GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `https://api.nodbusiness.app` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://nodbusiness.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Same as backend VAPID_PUBLIC_KEY |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | From Sentry project |

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel and `GOOGLE_CLIENT_ID` in Render must
contain the **same Google OAuth Web client ID**. In Google Cloud Console, add
`https://nodbusiness.vercel.app` (and each deliberate preview/custom domain) to
that client’s Authorized JavaScript origins. Do not put a Google client secret
in Vercel or prefix it with `NEXT_PUBLIC_`.

#### Vercel Git previews and private repositories

The Vercel Git integration may block a preview when the commit author does not
have contributor access to the Vercel project. On the Hobby plan, private
repositories do not support collaborator access. This is a Vercel account
policy, not a Next.js build failure.

For a private repository, either upgrade/add the author to the Vercel project,
or disable/disconnect the Vercel Git integration if GitHub Actions is the
chosen deploy path. The production workflow uses the project owner's
`VERCEL_TOKEN`, so that explicit CLI deployment is authenticated as the token
owner rather than as the Git commit author.

---

## GitHub Actions Secrets

The repository uses GitHub Actions to deploy the backend and frontend. Set these secrets in the repository settings before you push to `main`.

| Secret | Required | Description |
|---|---|---|
| `RENDER_API_KEY` | Optional | Render API key for the explicit backend deploy; without it, Render's Git integration deploys the commit |
| `VERCEL_TOKEN` | Yes | Vercel CLI token for frontend deployment |
| `BACKEND_URL` | Yes | Public backend URL used by the post-deploy health check |
| `SUPABASE_DATABASE_URL` | Yes | Production database URL used by the blocking migration job |

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

### Recommended free-tier database migration
If you want to move off Neon because of quota limits, the current recommended configuration is:

- Database: Supabase Postgres
- Backend host: Render
- Frontend host: Vercel
- File storage: Cloudflare R2
- Cache/queue: Upstash Redis

Set this in Render:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres?sslmode=require
JWT_SECRET=replace_with_64_byte_hex_string
FRONTEND_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
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
DATABASE_URL=postgresql://...neon.tech/nodbusiness node backend/db/migrate-all.js
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
