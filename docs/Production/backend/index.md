# backend/index.ts — Server Entry Point

## 1. What is this?

**Documentation page.** The front door of the entire API: builds the Express app, wires every

## 2. Why does it exist?

Single boot file. Everything a request touches, in exact order, is configured here.

## 3. What does it do?

1. Sentry init -> compression + ETag caching -> realMode filter (hides seed data)
2. requestId / httpLogger / apiVersion (every response carries `API-Version: 1`)
3. **Boot guard**: hard-exits unless `DATABASE_URL` + `JWT_SECRET` are set
4. Helmet security headers (strict CSP in production) + Server header removal
5. CORS allowlist (wildcard-subdomain support, credentials enabled)
6. Rate limiting: 500 req/15min on `/api/*` + stricter 20/15min on login/register
   (Redis-backed store; **skipped entirely in development**)
7. Body parsing - `express.raw()` FIRST for the Stripe webhook, then JSON/urlencoded (10mb)
8. Static `/uploads`, `/health`, all route mounts, admin-only `/metrics`
9. Error chain: Sentry handler -> errorMiddleware -> 404 catch-all
After listen: stories cleanup scheduler, queue workers, **backup schedule**,
Supabase bucket auto-create, production cache warm + DB keep-alive pings,
graceful SIGTERM/SIGINT shutdown.

None - it runs. See `startBackupSchedule`, `startWorkers` wiring.

## 4. What does it touch?

**Connections:**
All 45 routes (see INDEX), lib/logger, lib/redis, db/pool, socket.ts (HTTP server share).

**Safety / data notes:**
Env validation is the only hard gate; everything else degrades gracefully.
Rate limits are enforced ONLY outside development - see ENVIRONMENT_VARIABLES.md.

**Related docs:**
operations/DEPLOYMENT.md, infrastructure/CI_CD_PIPELINE.md, backend/SECURITY.md
