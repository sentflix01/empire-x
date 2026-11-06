---
name: local-stack
description: Start, check or stop a fully local Nodbusiness stack (Postgres, Redis, backend on :3001, frontend on :3002) with seeded test accounts, for testing, auditing or reproducing bugs without touching hosted services. Use before any runtime test, E2E run, screenshot or audit step that needs the running app.
---

# Local stack

## When to use

Any time a task needs the running app. All active testing happens here, never
against production or hosted databases (`note/2026-11-05-international-audit/README.md`).

## Commands

```bash
bash note/2026-11-05-international-audit/scripts/local-stack.sh up      # idempotent; ~15 s warm
bash note/2026-11-05-international-audit/scripts/local-stack.sh status
bash note/2026-11-05-international-audit/scripts/local-stack.sh down
```

`up` does, in order: generate local-only secrets → start Postgres on
127.0.0.1:5432 → start Redis on 127.0.0.1:6379 → run every migration
(`npm run migrate`) → seed E2E accounts (`ALLOW_E2E_SEED=1 npm run seed:e2e`) →
start backend and frontend dev servers → print health.

Human contributors on their own machine can use `docker compose up` instead
(`docker-compose.yml`); this script is for environments without Docker networking.

## State and secrets

- Everything lives in `$NB_LOCAL_DIR` (default `~/.nodbusiness-local`), outside the repo.
  When run as root, Postgres data goes to `/var/lib/postgresql/nodbusiness-local`.
- `env.sh` there holds generated `JWT_SECRET`, `OTP_SALT`, DB password and E2E
  passwords (mode 600). They are local test values; still never paste them into
  findings, commits or chat.
- Load them into a shell with `source ~/.nodbusiness-local/env.sh` before running
  backend scripts or Playwright.
- Logs: `backend.log`, `frontend.log`, `migrate.log`, `seed.log` in the same folder.

## Safety rules

1. Never point this at a hosted database. Do not create or edit `backend/.env`
   for this; the script exports local values instead. The repo's own guard
   (`backend/db/operationSafety.js`) also refuses non-local seed targets.
2. `next dev` rewrites `frontend-next/AGENTS.md`, `next-env.d.ts` and
   `tsconfig.json` on start. Do not commit those changes with unrelated work;
   revert them with `git checkout -- <file>`.
3. Payments, email and AI run in local/console modes here (`/health` shows
   `email: console`, `ai: not configured`, `storage: local`). Do not add real
   provider keys.
4. `env.sh` exports `NODE_ENV=development` for the dev servers. For a production
   frontend build (performance or CI-gate checks) override it:
   `NODE_ENV=production npm run build && NODE_ENV=production npx next start -p 3002`
   from `frontend-next/` — building with `development` fails at prerender with
   "Cannot read properties of null (reading 'useState')".
5. Demo mode needs a separate `DEMO_DATABASE_URL`; it is off by default. Enable it
   only with a second local database or schema, never a shared one.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `initdb: Permission denied` | Run as a user that owns `$NB_PGDATA`, or set `NB_PGDATA` to a folder the `postgres` user can write |
| Migrations fail | Read `migrate.log`; each migration must be safe to re-run (no ledger table exists) |
| Backend refuses to start with an isolation error | A Demo variable is set without a separate database — unset `DEMO_*` |
| Port in use | `local-stack.sh down`, then check `ss -ltnp` |
