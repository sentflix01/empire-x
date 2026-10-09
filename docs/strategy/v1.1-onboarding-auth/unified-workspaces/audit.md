# Unified identity and Demo/Real workspaces — audit

## Target

One authenticated user identity with two deliberately separate workspaces:

- **Real** is the user's normal account and real business activity.
- **Demo** is a practice workspace associated with that identity. Demo records,
  uploads, caches, orders, and external effects must never be treated as Real.
- The UI may feel like one app, but feeds and search results show only the
  currently selected workspace.
- Visitors may browse public Real content read-only and may try an isolated
  Demo preview without creating a separate Demo login.

## Current state

- The application now has one canonical Real sign-in/registration flow; the
  legacy `/choose-mode` path redirects for compatibility. Direct requests to
  authenticate as an independent Demo identity are rejected.
- Authenticated users can request a Demo workspace through a server endpoint.
  The server verifies the canonical Real identity, creates or validates an
  explicitly linked shadow identity in the Demo schema, and issues a signed
  Demo session. Returning to Real validates the link and reissues Real auth.
- The workspace selector is available in the authenticated shell. It clears
  client query state on a successful switch. The server-side database context,
  rather than a client mode flag, selects the active database/schema.
- Runtime pools and migration/seed/cleanup scripts support distinct `public`
  and `demo` schemas on one physical PostgreSQL database, but only with
  different restricted login roles. Startup checks effective schema access,
  superuser status, required migration metadata, and Demo session storage before
  enabling Demo traffic.
- Demo payments and withdrawals are rejected. Other external effects, public
  link behavior, storage ownership, background jobs, WebSocket messages,
  caches, and every data route still require systematic route-by-route review.
- Demo remains disabled until an operator provisions roles, applies both
  schema migration chains, seeds fixtures, and verifies the production grants.
  The exact procedure is in `docs/operations/DEMO_WORKSPACE_DEPLOYMENT.md`.

## Risks and constraints

- Never merge accounts solely by equal email text. An explicit verified identity
  mapping is required; otherwise legacy Demo data must remain recoverable.
- A client toggle or `localStorage` value is not authorization. The server must
  establish workspace context from authenticated, integrity-protected state and
  check ownership on every read/write path.
- One physical database shares capacity, backups, outage scope, and elevated
  administration. For schema isolation, use different restricted roles and
  schema-only `search_path` values; do not use a role that can freely access both
  schemas as the application credential.
- Existing public links, seed fixtures, payments, storage, WebSockets, background
  jobs, migration scripts, and cache keys need explicit workspace behavior.
- The current schema-routing groundwork is backward compatible: separate Demo
  databases continue to use their `public` schema; same-database operation is
  permitted only when schemas and database roles differ.

## Migration approach

Additive and staged. Provision the Demo schema and restricted role, migrate it
independently, preserve Real data, explicitly map legacy Demo records, and
verify effective grants before enabling Demo. The current code supplies the
application and runbook pieces; provisioning, migration, seed, live-browser
verification, and the remaining route audits are release gates, not completed
work. Do not enable Demo against an unprovisioned or unverified schema.
