# e2e/ - Playwright End-to-End Suite (TD-003)

## 1. What is this?

**Documentation page.** public.spec.ts: landing/root render, login+register forms present, anonymous /wallet redirects to /login?from=%2Fwallet.

## 2. Why does it exist?

public.spec.ts: landing/root render, login+register forms present, anonymous /wallet redirects to /login?from=%2Fwallet. auth.spec.ts: seeded credential login reaches app shell AND asserts TD-014 invariants in a real browser (JWT absent from localStorage/cookies after login AND after reload proving silent

## 3. What does it do?

public.spec.ts: landing/root render, login+register forms present, anonymous
/wallet redirects to /login?from=%2Fwallet. auth.spec.ts: seeded credential
login reaches app shell AND asserts TD-014 invariants in a real browser (JWT
absent from localStorage/cookies after login AND after reload proving silent
refresh re-hydration); bad credentials stay on /login. The full suite also
checks seeded authenticated flows, realtime chat, COD checkout, and separate
live Demo/Real identities.

## Running the full suite locally

Use disposable local PostgreSQL databases for both `DATABASE_URL` and
`DEMO_DATABASE_URL`; do not point seed or migration commands at a shared or
production database. Migrate each database, then run `npm run seed:e2e` from
`backend/` with `ALLOW_E2E_SEED=1`, `E2E_TEST_PASSWORD`, and
`E2E_ADMIN_PASSWORD` set. The seed command refuses non-local database hosts.
Set `DEMO_ENABLED=true` and a `DEMO_SESSION_SECRET` distinct from `JWT_SECRET`
when starting the backend. Set `E2E_BACKEND_URL`, `E2E_FRONTEND_URL`, and
`NEXT_PUBLIC_API_BASE_URL` for the isolated server ports before running
`npm run test:e2e`. The two E2E accounts are separate Real identities; the
buyer’s same email is also seeded into the Demo database for isolation checks.

## 4. What does it touch?

Inline references only — nothing external.
