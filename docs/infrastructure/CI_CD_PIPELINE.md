# Nodbusiness — CI/CD Pipeline

> **Last updated:** September 22, 2026
> **Platform:** GitHub Actions
> **Stack:** Render (backend) + Vercel (frontend) + Supabase

---

## Pipeline Overview

```
Push to main branch
        │
        ▼
┌─────────────────────────────────────────┐
│          Nodbusiness CI                 │
│  (ci.yml — must pass before deploy)     │
│                                         │
│  ├── check-skip                         │
│  ├── backend (typecheck + tests)        │
│  ├── frontend (lint + typecheck + build)│
│  └── audit (npm audit --level=high)     │
└─────────────────────┬───────────────────┘
                      │ on: CI success
                      ▼
┌─────────────────────────────────────────┐
│          Nodbusiness Deploy             │
│  (deploy.yml — triggered by CI)         │
│                                         │
│  ├── gate (verify CI passed)            │
│  ├── changes (detect frontend changes)  │
│  ├── migrate (run DB migrations)        │
│  ├── deploy-backend (Render hook)       │
│  ├── deploy-frontend (Vercel CLI)*      │
│  └── healthcheck                        │
└─────────────────────────────────────────┘

* only if frontend-next/ files changed
```

---

## GitHub Secrets Required

| Secret | Used by | Value |
|---|---|---|
| `DATABASE_URL` | `deploy.yml` migrate job | Supabase pooler URL (port 6543) |
| `RENDER_DEPLOY_HOOK_URL` | `deploy.yml` deploy-backend job | `https://api.render.com/deploy/srv-...?key=...` |
| `VERCEL_TOKEN` | `deploy.yml` deploy-frontend job | Vercel personal access token |
| `BACKEND_URL` | `deploy.yml` healthcheck job | `https://nodbusiness-backend-9psf.onrender.com` |
| `FRONTEND_URL` | `deploy.yml` healthcheck job | `https://nodbusiness.vercel.app` |

Set at: `https://github.com/sentflix01/empire-x/settings/secrets/actions`

---

## CI Workflow (`ci.yml`)

**Trigger:** Push to `main`, PR to `main` or `develop`

**Jobs:**

### 1. check-skip
Skips CI if commit message contains `[skip ci]` or author is `nodbusiness-docs-bot`.

### 2. backend (timeout: 15 min)
Runs against a local PostgreSQL 16 container.

```yaml
env:
  DATABASE_URL: postgresql://nodbusiness:testpassword@localhost:5432/nodbusiness_test
  JWT_SECRET: ci-test-secret-do-not-use-in-production-at-all
  NODE_ENV: test
```

Steps:
- `npm ci` — install dependencies
- `npx tsc --noEmit` — TypeScript typecheck (blocking)
- `npm run migrate` — run all 38 migrations against test DB
- `npx jest --runInBand --forceExit --testTimeout=10000` — 308 tests (blocking)

### 3. frontend (Next.js)
Steps:
- `npm ci --legacy-peer-deps`
- `npm run lint` — ESLint (blocking)
- `npx tsc --noEmit` — TypeScript typecheck (blocking)
- `npm run build` — Next.js build (blocking)

Build env vars used in CI:
```
NEXT_PUBLIC_API_BASE_URL: https://example-ci-build.nodbusiness.app
NEXT_PUBLIC_APP_URL: https://example-ci-build.pages.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID: ci-placeholder-google-client-id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_ci_placeholder
NEXT_PUBLIC_SENTRY_DSN: ""
```

### 4. audit
- `npm audit --audit-level=high --package-lock-only` for both backend and frontend
- Blocks on high (CVSS ≥7.0) or critical vulnerabilities

---

## Deploy Workflow (`deploy.yml`)

**Trigger:** `workflow_run` — fires when `Nodbusiness CI` completes on `main`

**Jobs:**

### 1. gate
Checks that CI concluded with `success`. Blocks deploy if CI failed or was cancelled.

### 2. changes
Detects whether `frontend-next/` files changed using `git diff`. Sets output `frontend=true/false` to skip unnecessary Vercel deploys.

### 3. migrate
Runs `node db/migrate-all.js` against the production Supabase database.
- Uses `secrets.DATABASE_URL` (pooler URL, port 6543)
- Verifies the database connection first; missing credentials or a failed connection blocks deployment
- Idempotent — safe to run on every deploy

### 4. deploy-backend
Runs only after CI and database migrations succeed, then fires the Render deploy hook via HTTP POST.
- Uses `secrets.RENDER_DEPLOY_HOOK_URL`
- Requires the hook URL; missing configuration blocks deployment
- Includes the exact `workflow_run.head_sha` as the hook's `ref` so Render cannot deploy a newer, untested main commit
- Render automatic deploys are disabled in `render.yaml`; the Render service must be synced to this setting
- Waits for HTTP 2xx response from Render

### 5. deploy-frontend
Runs only after migrations succeed and `changes.outputs.frontend == 'true'`.
- Installs Vercel CLI: `npm install -g vercel`
- Links the `frontend-next/` source directory to the existing `nodbusiness` Vercel project
- `vercel pull --yes --environment=production --token=...`
- `vercel build --prod --token=...`
- `vercel deploy --prebuilt --prod --yes --token=...` waits for deployment completion so build/runtime failures fail the job
- Up to 2 retry attempts

### 6. healthcheck (non-blocking)
- Waits 30 seconds for services to stabilize
- Checks backend `/health` (3 attempts, 15s apart)
- Checks frontend URL (3 attempts, 15s apart)
- Sends Telegram alert if either fails (requires `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`)
- `continue-on-error: true` — never blocks the deploy

---

## Other Workflows

### DB Migrate → PostgreSQL (manual)
File: `.github/workflows/db-migrate-to-supabase.yml`

Manual trigger only. Runs migrations against production Supabase.
Useful for emergency migration runs outside the normal deploy cycle.

**Trigger:** GitHub Actions → "DB migrate → PostgreSQL (manual)" → Run workflow

### Supabase Keep-Alive
File: `.github/workflows/supabase-keepalive.yml`

Runs every 6 hours via cron. Pings Supabase with `SELECT 1` to prevent the free tier project from pausing due to inactivity (Supabase pauses free projects after 1 week of no queries).

### Nodbusiness Docs Sync
File: `.github/workflows/docs-sync.yml`

Automatically keeps documentation in sync. Runs on doc changes.

---

## Concurrency

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: true
```

Only one deploy runs at a time. If a new deploy starts while one is running, the old one is cancelled.

---

## Skipping CI

Add `[skip ci]` or `[ci skip]` to the commit message:

```bash
git commit -m "docs: update README [skip ci]"
```

---

## Typical Timeline

| Stage | Duration |
|---|---|
| CI — check-skip | <5s |
| CI — backend typecheck + 308 tests | ~3 min |
| CI — frontend lint + typecheck + build | ~2 min |
| CI — security audit | ~30s |
| Deploy — gate | <5s |
| Deploy — migrations | ~30s |
| Deploy — Render build + deploy | ~3-5 min |
| Deploy — Vercel build + deploy | ~2-3 min |
| Deploy — health check | ~1 min |
| **Total: push to live** | **~8-12 min** |

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| CI backend job hangs > 15 min | Open handles in tests | `--forceExit` is set — job will be killed at 15 min timeout |
| Deploy skipped after CI | CI concluded with `failure` or `cancelled` | Fix failing tests/typecheck, push again |
| Migrations skipped | `DATABASE_URL` secret missing | Add `DATABASE_URL` to GitHub Secrets |
| Render deploy not triggered | `RENDER_DEPLOY_HOOK_URL` missing | Get from Render → service → Settings → Deploy Hook |
| Vercel deploy fails | `VERCEL_TOKEN` expired | Regenerate in Vercel → Account Settings → Tokens |
| Health check fails | Render cold start taking >45s | Expected on free tier — health check is non-blocking |
| `npm audit` blocks deploy | High/critical vulnerability | Run `npm audit fix` locally, commit, push |
