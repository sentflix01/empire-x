# Nodbusiness — CI/CD Pipeline

> How code goes from developer laptop to production — what actually runs today, what it does
> and does not guarantee, and the roadmap to make every step a hard gate.
> **Verified against `.github/workflows/ci.yml` and `deploy.yml` on 2026-08-23.**

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

## ⚠️ Current-state summary (updated 2026-08-23 — TD-019 shipped)

| Claim | Reality today |
|---|---|
| "CI blocks merges" | ✅ **Now blocking**: backend typecheck + Jest suites, frontend lint + typecheck + build all fail the run. `npm audit` remains advisory until the dependency backlog clears. |
| "Deploy waits for CI" | ✅ **Now gated**: deploy.yml triggers only via `workflow_run` after a successful CI run on main, for the exact same commit (`gate` job). A red build cannot reach production. |
| "Health-check failure alerts" | ⚠️ Health check sends a Telegram alert when secrets are set; does **NOT** fail the workflow (`exit 0` regardless). Rollback is manual per §Manual rollback. Automatic rollback is future work. |
| "Staging environment" | ❌ Does not exist. `main` is the only environment. |
| Migrations on deploy | ✅ Real: `deploy.yml` runs `db/migrate-all.js` against Supabase before services restart. |
| Vercel build gate | ✅ Real: frontend is built in CI; production deploys are submitted with a bounded two-attempt prebuilt upload and Vercel readiness is checked asynchronously. |

Optional deploy secrets to configure: `BACKEND_URL`, `FRONTEND_URL`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID` (health checks skip gracefully when unset, but the backend URL one is
needed for enforcement).

The pipeline below documents what happens today, followed by the remaining gap plan.

---

## Pipeline Overview (as implemented)

```
Developer pushes to GitHub
          │
          ▼
Nodbusiness CI (ci.yml)  ── blocking jobs:
  ├── Backend: tsc --noEmit → migrate → jest --runInBand
  ├── Frontend: lint → tsc --noEmit → next build
  └── Audit: npm audit (advisory)
          │
     All pass? ──❌──▶ deploy never triggers
          │ ✅ (push to main only)
          ▼
workflow_run event → Nodbusiness Deploy (deploy.yml)
  ├── gate: CI conclusion == success AND commit matches
  ├── migrate: node db/migrate-all.js → Supabase
  ├── deploy-backend: render deploy (uses Git integration if no valid API key)
  ├── detect deploy scope: skips Vercel when frontend files did not change
  ├── deploy-frontend: vercel pull → vercel build --prod → async prebuilt deploy
  └── healthcheck: /health + frontend (informational; Telegram alert on failure)
```

---

## Deploy Pipeline (`.github/workflows/deploy.yml`)

| Job | What it does | Failure behavior |
|-----|--------------|------------------|
| `migrate` | `npm ci` then `node db/migrate-all.js` with `SUPABASE_DATABASE_URL`. Migrations are idempotent and tracked in `schema_migrations`. | **Hard gate:** a migration failure skips both deploy jobs. |
| `deploy-backend` | Explicit `render deploy` when a valid `RENDER_API_KEY` is configured. Otherwise the Render Git integration deploys the same commit. | Skips the explicit CLI path gracefully on missing/invalid token. |
| `deploy-frontend` | Runs only when `frontend-next/**` changed. Uses `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --archive=tgz --no-wait`, with two short submission retries and a 15-minute job limit. | Fails after two unsuccessful submissions; Vercel finishes readiness asynchronously and the health-check job verifies availability. |
| `healthcheck` | Runs after every successful backend deployment; waits 15 s, then polls `$BACKEND_URL/health` up to 3×15 s. It checks the frontend only when it was redeployed. | **Never fails the workflow** (`exit 0` regardless), but sends Telegram when an explicit health result is `fail`. |

Concurrency: only the newest production deploy is retained (`concurrency: deploy-production`, obsolete queued or running deploys are cancelled).
Environments: all jobs target the GitHub `production` environment for secrets scoping.

### Manual rollback

```bash
git revert <bad-commit>
git push origin main        # re-runs migrate (idempotent) + both deploys

# Backend-only fast path (if RAILWAY_TOKEN configured locally):
cd backend && railway redeploy --service halehame-backend <previous-deployment>
```

Migrations are additive-first by standard (`docs/backend/DATABASE.md`); a rollback deploy must
not depend on dropped columns. If a migration was destructive, restore per
`operations/BACKUPS.md` — there is no automatic DB rollback.

---

## Gap plan — remaining (in priority order)

1. ~~Make CI blocking~~ ✅ Done 2026-08-23.
2. ~~Gate deploys on CI~~ ✅ Done 2026-08-23 (`workflow_run` + gate job).
3. **Automatic rollback on health regression** — keep the previous Railway/Vercel deployment warm; on healthcheck failure, trigger rollback instead of only alerting.
4. **Tag releases.** `vX.Y.Z` git tags on deploy (changelog already pretends tags exist — none do).
5. **Staging tier:** `develop` branch → separate Railway/Vercel projects before promoting to main.
6. **Pre-commit hooks (husky + lint-staged):** eslint + tsc --noEmit on staged files only, so basic errors never reach CI.
7. **Post-deploy canary check:** after healthcheck, replay a small set of read endpoints (feed, product detail) and compare error rate vs baseline for 10 minutes.
8. **Gate `npm audit` at `--audit-level=critical`** once the current dependency backlog is cleared.

## Related docs

- `operations/DEPLOYMENT.md` — operator procedures and env vars
- `infrastructure/CLOUD_PROVIDERS.md` — Railway/Vercel/Neon/Upstash roles
- `operations/SEVERITY_LEVELS.md` — what happens when a bad deploy reaches prod
