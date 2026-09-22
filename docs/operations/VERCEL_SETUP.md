# Nodbusiness — Vercel Setup Guide

> The frontend is deployed on **Vercel Hobby** (free, no card required).
> Current live URL: `nodbusiness.vercel.app`
> **Last updated:** September 2026

---

## Why Vercel

- No credit card required on the Hobby plan
- Already working at `nodbusiness.vercel.app` — zero migration effort
- Native Next.js support (same team builds both)
- Automatic preview deployments for every PR
- GitHub Actions integration via Vercel CLI + `VERCEL_TOKEN`

> **ToS note:** Vercel Hobby is for non-commercial, personal projects.
> Upgrade to Vercel Pro ($20/mo) before accepting real payments from real users.
> During dev/demo phase, Hobby is fine.

See ADR-016 in `docs/architecture/ADR.md` for the full decision record.

---

## One-Time Setup

### Step 1: Connect Vercel to GitHub

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repository (`sentflix01/empire-x` or your fork)
3. Set **Root Directory** to `frontend-next`
4. Click **Deploy**

### Step 2: Configure Build Settings

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `frontend-next` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` (Vercel auto-detects) |
| **Node.js version** | `20.x` |

> Setting the root directory to `frontend-next` is the most common setup mistake. Double-check this.

### Step 3: Set Environment Variables

In Vercel → your project → **Settings** → **Environment Variables**, add:

| Variable | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-app.onrender.com` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://nodbusiness.vercel.app` | Production |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID | All |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | All |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Your VAPID public key | All |
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry frontend DSN | All |

> `NEXT_PUBLIC_*` variables are baked into the JavaScript bundle at build time.
> Never put server-side secrets in `NEXT_PUBLIC_*` variables.

### Step 4: Get Your Vercel Token (for CI/CD)

1. Vercel → **Account Settings** → **Tokens** → **Create Token**
2. Name it `github-actions`, scope: Full Account
3. Copy the token and add it to GitHub Secrets as `VERCEL_TOKEN`

The `deploy.yml` GitHub Actions workflow uses this token to deploy automatically on every push to `main`.

---

## How Deploys Work

```
Push to main
     │
     ▼
GitHub Actions: deploy-frontend job
     │
     ▼
vercel --prod (uses VERCEL_TOKEN from GitHub Secrets)
     │
     ▼
Vercel builds frontend-next/ and deploys globally
     │
     ▼
Live at nodbusiness.vercel.app
```

Every PR also gets an automatic preview URL from Vercel (no config needed).

---

## Rollback

```
Vercel → your project → Deployments
→ Find the last working deployment
→ Click the three-dot menu → "Promote to Production"
→ Takes ~10 seconds
```

---

## Where Secrets Go

| Secret type | Location |
|---|---|
| Backend API keys (`JWT_SECRET`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, etc.) | **Render** env vars — never in Vercel |
| Frontend public vars (`NEXT_PUBLIC_*`) | **Vercel** environment variables |
| CI/CD deploy token | **GitHub** repository secrets (`VERCEL_TOKEN`) |

---

## Google OAuth Setup

Your Google Cloud Console **Authorized redirect URIs** must include:

```
https://your-app.onrender.com/api/auth/google/callback
```

And **Authorized JavaScript origins**:

```
https://nodbusiness.vercel.app
```

If you add a custom domain later, add that domain to both lists.

---

## Adding a Custom Domain (when ready)

1. Vercel → your project → **Settings** → **Domains** → Add domain
2. Add DNS records at your registrar as shown by Vercel
3. SSL is provisioned automatically within minutes
4. Update `NEXT_PUBLIC_APP_URL` env var to the new domain
5. Update Google OAuth authorized origins to include the new domain

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails immediately | Wrong root directory | Set root directory to `frontend-next` in Vercel project settings |
| `Module not found` build error | Dependency issue | Run `npm ci --legacy-peer-deps` locally, fix the error, push again |
| `Environment variable not defined` | Missing `NEXT_PUBLIC_*` var | Add the missing variable in Vercel env vars, redeploy |
| App loads but API calls fail | Wrong `NEXT_PUBLIC_API_BASE_URL` | Check it points to your Render backend URL (no trailing slash) |
| WebSocket (chat) not connecting | CSP `connect-src` missing wss:// host | `wsHost` in `next.config.ts` derives it automatically from `NEXT_PUBLIC_API_BASE_URL` |
| OAuth login fails / state mismatch | Render backend was sleeping on first request | Render wakes in ~30s on free tier — retry, or set up keep-alive ping |
| CI deploy fails | `VERCEL_TOKEN` missing or expired | Regenerate token in Vercel account settings, update GitHub Secret |

---

## Keep-Alive for Render Free Tier

Render free tier sleeps after 15 minutes of inactivity. This breaks the first request (including OAuth callbacks). The backend has a self-ping configured in `index.ts`. You can also use a free external service:

- **UptimeRobot** (free) — monitor `https://your-app.onrender.com/health` every 5 minutes
- This keeps the backend awake during active development and demo sessions

---

## Previous Setup (Removed)

This file was previously named `CLOUDFLARE_PAGES_SETUP.md` and described:
- **Frontend:** Cloudflare Pages
- **Backend:** Oracle Cloud Johannesburg + Coolify v4

That setup required a credit card for Oracle identity verification, which is not available at this stage. It has been replaced by the zero-card Render + Vercel development stack documented here.

The `nodbusiness.vercel.app` URL is the current active frontend deployment.
