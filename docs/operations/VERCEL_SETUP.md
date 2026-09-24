# Nodbusiness — Vercel Setup Guide

> **Last updated:** September 22, 2026
> **Current live URL:** https://nodbusiness.vercel.app
> **Project:** `nodbusiness` on Vercel Hobby (free)

---

## Current Setup

| Field | Value |
|---|---|
| Project name | `nodbusiness` |
| Account | sentflix01 (GitHub login) |
| Plan | Hobby (Free) |
| Repository | `sentflix01/empire-x` |
| Root directory | `frontend-next` |
| Framework | Next.js 16 (SSR — not static export) |
| Production URL | https://nodbusiness.vercel.app |
| Branch | `main` |
| Node.js version | 20.x |

---

## Environment Variables (Currently Set)

| Variable | Environment | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Production | `https://nodbusiness-backend-9psf.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://nodbusiness.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | All | Google OAuth client ID |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | All | Web push VAPID public key |
| `NEXT_PUBLIC_SENTRY_DSN` | All | Sentry frontend DSN |
| `NEXT_PUBLIC_APP_VERSION` | All | `1.0.0` |
| `NEXT_PUBLIC_CHAPA_PUBLIC_KEY` | All | Chapa public key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | All | Stripe publishable key (Stripe off — `FF_STRIPE_PAYMENTS=false`) |

---

## How Deploys Work

**Automatic:** Vercel is connected to GitHub. Every push to `main` that changes files in `frontend-next/` triggers a deploy via Vercel CLI in the GitHub Actions deploy workflow.

**Preview deployments:** Every PR automatically gets a preview URL at `nodbusiness-git-BRANCH-sentflixs-projects.vercel.app`.

**Deployment trigger in CI:**
```yaml
- name: Deploy to Vercel
  run: vercel deploy --prebuilt --prod --yes --no-wait --token=${{ secrets.VERCEL_TOKEN }}
  working-directory: frontend-next
```

---

## Multiple Domains Explained

Every deployment gets 3 URLs — all are normal Vercel behavior:

| URL | What it is |
|---|---|
| `nodbusiness.vercel.app` | Permanent production URL — always use this |
| `nodbusiness-git-main-sentflixs-projects.vercel.app` | Auto-generated branch URL — follows latest main |
| `nodbusiness-HASH-sentflixs-projects.vercel.app` | Unique URL for a specific deployment — frozen in time |

Only `nodbusiness.vercel.app` matters for users.

---

## Rollback

1. Vercel → nodbusiness → **Deployments**
2. Find last green **Ready** deployment
3. Click three-dot menu → **"Promote to Production"**
4. Takes ~10 seconds

---

## Adding a Custom Domain (When Ready)

1. Purchase domain (e.g., `nodbusiness.app`)
2. Vercel → nodbusiness → **Settings** → **Domains** → Add domain
3. Follow DNS instructions (add CNAME or A record at registrar)
4. SSL is auto-provisioned within minutes
5. Update env vars:
   - Vercel: `NEXT_PUBLIC_APP_URL` → `https://nodbusiness.app`
   - Render: `FRONTEND_URL` → `https://nodbusiness.app`
   - Google OAuth: Add `https://nodbusiness.app` to authorized origins

---

## Build Settings

The frontend uses **SSR mode** (not static export). This is important:
- No `output: 'export'` in `next.config.ts`
- Vercel handles SSR natively — no special config needed
- `next build` produces a `.next/` directory (not `out/`)

**Build command:** `next build` (via `npm run build`)
**Output directory:** `.next` (Vercel auto-detects)

---

## Important: Vercel Hobby ToS

Vercel Hobby is for **non-commercial, personal use only**. This means:
- ✅ OK for development, testing, demos
- ✅ OK for beta testing with invited users
- ❌ Not OK for accepting real payments from real users

**Upgrade to Vercel Pro ($20/mo) before:**
- Going live with Stripe/Chapa payments
- Accepting paying subscribers

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails with "Module not found" | Dependency issue | Run `npm ci --legacy-peer-deps` locally, fix error |
| "Git information retrieval failed" | Redeploying an old commit that lost its ref | Trigger a fresh deploy via git push instead of clicking "Redeploy" |
| API calls fail with CORS error | `NEXT_PUBLIC_API_BASE_URL` wrong | Update to current Render URL, redeploy |
| OAuth login fails | Render backend sleeping on first request | cron-job.org keep-alive prevents this — ensure it's running |
| Env var not taking effect | `NEXT_PUBLIC_*` baked at build time | Must redeploy frontend after changing any `NEXT_PUBLIC_*` var |
| Two deployments per push | Old duplicate project still connected | Was resolved — only `nodbusiness` project is now active |
