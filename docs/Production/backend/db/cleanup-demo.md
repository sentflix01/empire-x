# backend/db/cleanup-demo

## 1. What is this?

**Database operations script.** A dry-run-first cleanup for expired Demo sessions and their session-scoped uploads.

## 2. Why does it exist?

The script removes session-scoped AI usage rows and the upload prefix belonging to that session. Demo account, profile, business, and showroom data persist. Database work commits before external object deletion; a pending cleanup marker makes partial storage failures retryable.

## 3. What does it do?

- Requires both `DATABASE_URL` and `DEMO_DATABASE_URL`, and refuses identical normalized database targets.
- Dry-run is the default and does not mutate the database or storage.
- Execution requires `ALLOW_DEMO_CLEANUP=1`, `--execute`, and `--database=<exact demo database name>`.
- Does not delete Demo users or business data.
- Clears local Demo uploads and removes `demo/<sessionId>/` from `DEMO_SUPABASE_BUCKET` (falling back to `SUPABASE_BUCKET` for older Demo objects).
- Run with demo-only credentials and confirm the target before enabling execution.

## 4. What does it touch?

**Source:** `backend/db/cleanup-demo.js`

Do not run the execution mode against real-user or production data during local verification.
