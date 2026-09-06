# Vercel Setup — How to fix the two-project confusion

> **The problem:** this repo (`sentflix01/empire-x`) is currently connected to **two** Vercel projects — `nodbusiness` and `frontend-next` — and only one of them has the required env vars. Every push triggers **two** builds, and one of them always fails.

---

## TL;DR — what to do in the Vercel dashboard

1. **Open the `frontend-next` project** (the one with **no env vars**).
2. **Settings → General → "Delete Project"** (or "Disconnect from Git" if you want to keep settings but stop builds).
3. The **canonical production frontend is the `nodbusiness` project** — it owns the `nodbusiness.vercel.app` domain and all the env vars.

That's it. One Vercel project, one deployment per push.

---

## Why the current setup is broken

The repo is a monorepo: `backend/` (Render) and `frontend-next/` (Vercel). When you import the repo into Vercel, it auto-detects Next.js and asks for a "Root Directory". If you didn't set it, Vercel tried to build from the repo root and failed (no `package.json` at root) — or it built the wrong directory and the result was bogus.

Two projects were created over time:
- `nodbusiness` — has env vars, was working, recently started showing **Error 3s** for the new commits
- `frontend-next` — has **zero** env vars, every build is **Error 3s** (fails immediately, no time to actually build)

The 3-second error is not a code bug — it's a Vercel-side config problem (no Root Directory, or pointing at the wrong subdirectory, or no env vars to even start the build).

---

## Recommended canonical setup

### One Vercel project: `nodbusiness`

This is the production frontend. It deploys to `nodbusiness.vercel.app`.

#### Dashboard settings

| Setting | Value |
|---|---|
| Project name | `nodbusiness` |
| Git repository | `sentflix01/empire-x` |
| Production branch | `main` |
| **Root Directory** | `frontend-next` |
| Build command | *(blank — Vercel auto-detects `next build`)* |
| Output directory | *(blank — Vercel auto-detects `.next`)* |
| Install command | *(blank — Vercel auto-detects `npm install`)* |
| Node.js version | `20.x` |

The `frontend-next/vercel.json` in this repo pins all of the above explicitly, so the dashboard settings above are just belt-and-braces.

#### Required Environment Variables

The build itself only needs `NEXT_PUBLIC_*` variables (baked into the JS at build time). The non-public server-side vars are **not** needed by the frontend build.

| Variable | Required? | Example value | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | `https://nodbusiness-backend.onrender.com` | Backend API base URL — **must** match the Render backend URL exactly |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://nodbusiness.vercel.app` | Used for shareable links, OAuth redirects |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For Google Sign-In | `771304409161-...apps.googleusercontent.com` | Google OAuth client ID (must match `GOOGLE_CLIENT_ID` in backend `.env`) |
| `NEXT_PUBLIC_SUPABASE_URL` | For uploads | `https://xxxx.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For uploads | `eyJ...` | Supabase anon key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | `BLd2...` | Web push public key (must match `VAPID_PUBLIC_KEY` in backend) |
| `NEXT_PUBLIC_SENTRY_DSN` | For Sentry | `https://...@sentry.io/...` | Sentry client DSN |
| `NEXT_PUBLIC_CHAPA_PUBLIC_KEY` | For Chapa payments | `CHAPUBK-...` | Chapa public key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For Stripe | `pk_live_...` | Stripe publishable key |
| `NEXT_PUBLIC_APP_VERSION` | For cache busts | `1.0.0` | Optional — forces rebuilds on version bump |

Variables marked **Yes** are the minimum to get a working build. The others are only needed for the specific features they unlock.

> **Tip:** Vercel env vars can be set per-environment (Production / Preview / Development). Use the same values for Production and Preview so PR previews work — but use `localhost:3001` for `NEXT_PUBLIC_API_BASE_URL` in **Development** if you run the backend locally.

### Backend: `nodbusiness-backend` on Render

Out of scope for Vercel. The backend's env vars live in the **Render dashboard**, not Vercel. They are NOT shared with Vercel.

If you ever need to **share** the same secret between frontend and backend (e.g. a Stripe secret + publishable), they must be added in BOTH dashboards. There's no cross-share.

---

## The `frontend-next/vercel.json` file

Pinned in this repo (commit `0e61239`+). Vercel reads this when present. It explicitly tells Vercel:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "rootDirectory": "frontend-next",
  "trailingSlash": false,
  "cleanUrls": true
}
```

Combined with the dashboard "Root Directory" setting, this removes the ambiguity that was causing the 3-second errors.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build is **Error 3s** | Wrong Root Directory, or no env vars, or `package.json` not found | Set Root Directory to `frontend-next`; check env vars exist for the environment being deployed (Production vs Preview) |
| Build is **Error 4m** (real compile error) | Code error or missing dep | Read the build log; usually TypeScript or ESLint error |
| Build is **Ready** but page is 500 at runtime | Runtime env var missing | Add the var to the Vercel project; redeploy |
| Two builds fire per push | Two Vercel projects connected to the same repo | Delete the `frontend-next` project (the one with no env vars) |

---

## Where each domain lives

| Domain | Hosted by | Project |
|---|---|---|
| `nodbusiness.vercel.app` | Vercel | `nodbusiness` |
| `nodbusiness-backend.onrender.com` | Render | `nodbusiness-backend` |
| `nodbusiness.app` (custom) | Vercel (after DNS setup) | `nodbusiness` |

Never put backend secrets (`DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, etc.) in Vercel — those go in **Render**. The frontend only ever needs `NEXT_PUBLIC_*` variables.
