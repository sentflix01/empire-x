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

## ⚠️ Honest current-state summary

| Claim | Reality today |
|---|---|
| "CI blocks merges" | ❌ CI runs on PRs/pushes but **every meaningful check is non-blocking**: backend tests run with `\|\| true`, `tsc --noEmit \|\| true`, `npm audit \|\| true`. Nothing prevents merging a red build. |
| "Deploy waits for CI" | ❌ `deploy.yml` triggers on any push to `main` **independently** of ci.yml. A broken commit deploys. |
| "Health-check failure rolls back" | ❌ The post-deploy healthcheck job always exits 0, even when `/health` never turns healthy. No rollback, no notification. |
| "Staging environment" | ❌ Does not exist. `main` is the only environment. |
| Migrations on deploy | ✅ Real: `deploy.yml` runs `db/migrate-all.js` against Neon before services restart. |
| Vercel build gate | ✅ Real: frontend is built in CI (`vercel build --prod`) and upload retries 3×; a failed build fails the workflow. |

The pipeline below documents **what actually happens**, followed by the gap plan.

---

## Pipeline Overview (as implemented)

```
Developer pushes to GitHub
          │
          ▼
ci.yml  (PRs + push to main/develop)            deploy.yml  (push to main only)
  ├── backend: npm test (--if-present ‖ true)     ├── migrate: node db/migrate-all.js → Neon
  │          npm audit --audit-level=high ‖ true   ├── deploy-backend: railway up (skips if no token;
  ├── frontend: npm run lint  (BLOCKING)           │        Railway git-integration auto-deploys anyway)
  │             npx tsc --noEmit ‖ true            ├── deploy-frontend: vercel pull → vercel build --prod
  │             npm run build (BLOCKING)           │        → vercel deploy --prebuilt (3 retries; BLOCKING)
  └── audit:   npm audit (frontend) ‖ true         └── healthcheck: curl /health + frontend (INFORMATIONAL,
                                                            always exit 0)
```

Blocking steps today: **frontend lint**, **frontend production build**.
Everything else informs but does not enforce.

---

## Deploy Pipeline (`.github/workflows/deploy.yml`)

| Job | What it does | Failure behavior |
|-----|--------------|------------------|
| `migrate` | `npm ci` then `node db/migrate-all.js` with `NEON_DATABASE_URL`. Migrations are idempotent and tracked in `schema_migrations`. | Fails the workflow; backend/frontend jobs still run (they are parallel, no `needs`). |
| `deploy-backend` | Explicit `railway up --service halehame-backend` when `RAILWAY_TOKEN` is set+valid. Otherwise skipped — Railway's git integration deploys the same commit within ~1–2 min anyway. | Skips gracefully on missing/expired token. |
| `deploy-frontend` | `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --archive=tgz` with 3 retry loop. | Fails the workflow after 3 attempts. |
| `healthcheck` | Waits 30 s, polls `$BACKEND_URL/health` up to 6×15 s, checks frontend URL (default `https://halehame-eosin.vercel.app`). | **Never fails the workflow** (`exit 0` regardless). Treat output as informational only. |

Concurrency: one deploy at a time (`concurrency: deploy-production`, queue instead of cancel).
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

## Gap plan — making this world-class (in priority order)

1. **Make CI blocking.** Remove `|| true` from backend tests and typecheck (backend now has
   257 passing Jest tests and clean `tsc`; the old "1752 pre-existing TS errors" comment is
   obsolete). Keep `npm audit` advisory until the dependency backlog is cleared, then gate at
   `--audit-level=critical`.
2. **Gate deploys on CI.** Add `needs`/`workflow_run`: deploy.yml should trigger only after the
   ci.yml run for that SHA succeeds (GitHub `workflow_run` or reusable-workflow call).
3. **Make the healthcheck real.** On failure: post to the team Telegram webhook, mark the
   release, and keep the previous Railway/Vercel deployment warm for one-click rollback.
4. **Tag releases.** `vX.Y.Z` git tags on deploy (changelog already pretends tags exist — none do).
5. **Staging tier:** `develop` branch → separate Railway/Vercel projects before promoting to main.
6. **Pre-commit hooks (husky + lint-staged):** eslint + tsc --noEmit on staged files only, so basic errors never reach CI.
7. **Post-deploy canary check:** after healthcheck, replay a small set of read endpoints
   (feed, product detail) and compare error rate vs baseline for 10 minutes.

## Related docs

- `operations/DEPLOYMENT.md` — operator procedures and env vars
- `infrastructure/CLOUD_PROVIDERS.md` — Railway/Vercel/Neon/Upstash roles
- `operations/SEVERITY_LEVELS.md` — what happens when a bad deploy reaches prod
