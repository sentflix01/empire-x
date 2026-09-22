# Nodbusiness — CI/CD Pipeline

> How code goes from developer laptop to production — what actually runs today, what it does
> and does not guarantee, and the roadmap to make every step a hard gate.
> **Verified against `.github/workflows/ci.yml` and `deploy.yml` on September 2026.**
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| CI/CD | Continuous Integration / Continuous Delivery |
| PR | Pull Request |
| API | Application Programming Interface |
| DB | Database |
| SAST | Static Application Security Testing |
| ENV | Environment Variable |
| SHA | Commit hash (Git) |
| YAML | CI/CD config format |

---

## Current-state summary (updated September 2026)

| Claim | Reality today |
|---|---|
| "CI blocks merges" | ✅ **Blocking**: backend typecheck + Jest suites, frontend lint + typecheck + build all fail the run. `npm audit` at `--audit-level=high` (both packages). |
| "Deploy waits for CI" | ✅ **Gated**: `deploy.yml` triggers only via `workflow_run` after a successful CI run on main, for the exact same commit (`gate` job). A red build cannot reach production. |
| "Backend deploys to Coolify" | ✅ Explicit Coolify webhook (`POST` with `Authorization: Bearer`) triggered after migrations pass. Falls back to Coolify Git integration if webhook secret is missing. |
| "Frontend deploys to Cloudflare Pages" | ✅ Cloudflare Pages connects directly to the GitHub repo and deploys automatically on every push to main. No CI step needed — the `deploy-frontend` job logs status only. |
| "Health-check failure alerts" | ⚠️ Health check sends a Telegram alert when secrets are set; does **NOT** fail the workflow (`exit 0` regardless). Rollback is manual per §Manual rollback. |
| "Staging environment" | ❌ Does not exist. `main` is the only environment. Cloudflare Pages creates preview deployments for every PR automatically. |
| Migrations on deploy | ✅ Real: `deploy.yml` runs `db/migrate-all.js` against Supabase (direct connection, port 5432) before the Coolify webhook fires. |
| Zero-downtime deploys | ✅ Coolify reads the backend Dockerfile `HEALTHCHECK`. New container must pass `/health` before the old container is stopped. |

---

## Pipeline Overview

```
Developer pushes to GitHub
          │
          ▼
Nodbusiness CI (ci.yml)  ── blocking jobs:
  ├── Backend:  tsc --noEmit → migrate (local postgres) → jest --runInBand
  ├── Frontend: lint → tsc --noEmit → next build
  └── Audit:    npm audit --audit-level=high (both packages)
          │
     All pass? ──❌──▶ deploy never triggers
          │ ✅ (push to main only)
          ▼
workflow_run event → Nodbusiness Deploy (deploy.yml)
  ├── gate:            CI conclusion == success AND commit matches
  ├── changes:         detect if frontend-next/** changed
  ├── migrate:         node db/migrate-all.js → Supabase (direct, port 5432)
  ├── deploy-backend:  POST Coolify webhook (--retry 3) → rolling container swap
  ├── deploy-frontend: log note only — Cloudflare Pages deploys automatically
  └── healthcheck:     GET /health (3 attempts) + frontend ping → Telegram on fail
```

---

## Deploy Pipeline (`.github/workflows/deploy.yml`)

| Job | What it does | Failure behavior |
|-----|--------------|------------------|
| `gate` | Checks CI conclusion == `success` and commit SHA matches. | **Hard gate:** if CI failed or SHA mismatch, all downstream jobs are skipped. |
| `changes` | `git diff` detects if `frontend-next/**` changed in this commit. | Informational only — Cloudflare Pages deploys regardless. |
| `migrate` | `npm ci` then `node db/migrate-all.js` with `DATABASE_URL`. Migrations are idempotent and tracked in `schema_migrations`. | **Hard gate:** migration failure skips `deploy-backend`. |
| `deploy-backend` | Fires `COOLIFY_WEBHOOK_URL` with `Authorization: Bearer COOLIFY_TOKEN`. Retries 3×. If webhook secrets are missing, prints notice and exits 0 (Coolify Git integration picks up the push). | Fails workflow on non-2xx HTTP status from Coolify. |
| `deploy-frontend` | Logs that Cloudflare Pages is deploying automatically. No action taken. | Never fails — informational only. |
| `healthcheck` | Waits 30s, polls `BACKEND_URL/health` up to 3×15s. Checks frontend URL. | **Never fails the workflow** (`exit 0`), but sends Telegram alert when a result is `fail`. |

Concurrency: only the newest production deploy is retained (`concurrency: deploy-production`, obsolete queued or running deploys are cancelled).
Environments: `migrate` and `deploy-backend` jobs target the GitHub `production` environment for secrets scoping.

---

## Cloudflare Pages — Frontend Deploy (Automatic)

Cloudflare Pages connects to the GitHub repository directly. On every push to `main`:

1. Cloudflare detects the push automatically (no webhook or CI step needed)
2. Builds `frontend-next/` using `npm run build`
3. Deploys the static output to 335+ edge PoPs globally
4. Preview deployments are created automatically for every PR

**Build settings in Cloudflare Pages dashboard:**
```
Root directory:      frontend-next
Build command:       npm run build
Build output dir:    out
Node.js version:     20
```

**Environment variables to set in Cloudflare Pages dashboard:**
```
NEXT_PUBLIC_API_BASE_URL   = https://api.yourdomain.com
NEXT_PUBLIC_APP_URL        = https://nodbusiness.pages.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID = ...googleusercontent.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
NEXT_PUBLIC_VAPID_PUBLIC_KEY = BN...
NEXT_PUBLIC_SENTRY_DSN     = https://...@sentry.io/...
```

---

## Coolify — Backend Deploy (Webhook-Triggered)

Coolify runs on the Oracle Cloud Johannesburg ARM VM. It manages the backend Docker container.

**Deploy flow:**
1. GitHub Actions fires `POST COOLIFY_WEBHOOK_URL` with `Authorization: Bearer COOLIFY_TOKEN`
2. Coolify pulls the latest code from the connected GitHub repo
3. Coolify builds the Docker image using `backend/Dockerfile`
4. Coolify starts the new container
5. The Dockerfile `HEALTHCHECK` runs: `wget -qO- http://localhost:10000/health || exit 1`
6. Once the health check passes, Coolify stops the old container → **zero downtime**
7. If the health check never passes within the timeout, Coolify keeps the old container running and marks the deploy as failed

**Required GitHub Secrets:**
```
COOLIFY_WEBHOOK_URL   — from Coolify → Application → Webhooks
COOLIFY_TOKEN         — from Coolify → Settings → API Tokens
```

---

## Manual Rollback

```bash
# Option 1: Git revert (re-runs full pipeline)
git revert HEAD
git push origin main
# Runs: CI → migrate (idempotent) → Coolify deploy → health check

# Option 2: Coolify dashboard (instant, no code change)
# Coolify → Application → Deployments → select previous deployment → Redeploy
# Time: ~60 seconds (Coolify re-deploys from cached image)

# Option 3: Force specific commit via webhook
# Update COOLIFY_WEBHOOK_URL to point to a specific deployment UUID
```

Migrations are additive-first by standard (`docs/backend/DATABASE.md`). A rollback deploy must not depend on dropped columns. If a migration was destructive, restore per `operations/BACKUPS.md` — there is no automatic DB rollback.

---

## Supabase Keep-Alive (`.github/workflows/supabase-keepalive.yml`)

Runs on a `cron: '0 8 */5 * *'` schedule (every 5 days at 08:00 UTC). Executes `psql "$DATABASE_URL" -c "SELECT 1"` to reset the Supabase free-tier 7-day inactivity pause clock. The backend's own keep-alive ping (every 4 minutes in `index.ts`) covers active deployment periods.

---

## Gap Plan — Remaining (in priority order)

1. ~~Make CI blocking~~ ✅ Done 2026-08-23.
2. ~~Gate deploys on CI~~ ✅ Done 2026-08-23 (`workflow_run` + gate job).
3. ~~Migrate deploy target to Coolify~~ ✅ Done September 2026.
4. ~~Move frontend to Cloudflare Pages~~ ✅ Done September 2026.
5. **Automatic rollback on health regression** — keep the previous Coolify deployment warm; on healthcheck failure, trigger redeploy of the last known-good image instead of only alerting.
6. **Tag releases.** `vX.Y.Z` git tags on deploy.
7. **Staging tier:** `develop` branch → separate Coolify application + Supabase branch before promoting to main.
8. **Pre-commit hooks (husky + lint-staged):** eslint + tsc --noEmit on staged files only.
9. **Post-deploy canary check:** replay a small set of read endpoints and compare error rate vs baseline for 10 minutes.

## Related docs

- `DEPLOYMENT_VARIABLES.md` — all environment variables for every service
- `infrastructure/CLOUD_PROVIDERS.md` — Oracle/Coolify/Supabase/CF Pages provider decisions
- `infrastructure/CURRENT_STATE.md` — live stack snapshot
- `operations/SEVERITY_LEVELS.md` — what happens when a bad deploy reaches prod
