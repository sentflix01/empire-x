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

## Two-person messaging (messaging.spec.ts)

Three people at once (a buyer, a business owner and a third person), on four
device projects: `messaging-phone` (Pixel 7), `messaging-iphone` (iPhone 14,
WebKit), `messaging-tablet` (iPad Mini, WebKit) and `messaging-desktop`. It
covers:
- a business chat started from a product: live both ways, typing…, seen ticks
- reply, react, edit, pin, delete for everyone / for me, forward
- message requests, blocking with "Not sent · Tap to retry", and "who can message me: nobody"
- groups: create, live delivery, remove someone (their open chat closes); channels: only admins post
- offline: missed messages arrive on reconnect, and a message written offline is sent (Chromium projects)

Each device run reseeds its own three accounts and wipes their chats
(`backend/db/seed-e2e-messaging.js`, local databases only):

```bash
ALLOW_E2E_SEED=1 E2E_MESSAGING_PASSWORD=<16+ chars> DATABASE_URL=<local>   E2E_BACKEND_URL=http://localhost:3001 E2E_FRONTEND_URL=http://localhost:3002   npx playwright test --project=messaging-phone --project=messaging-iphone --project=messaging-tablet --project=messaging-desktop
```

- **Sign-in:** each person signs in once per run through the API (the login limit is 20 per window), and the browser gets the same session cookie.
- **CI:** `.github/workflows/e2e-messaging.yml` runs it on messaging changes and on demand. It uses a Postgres on the runner and a production build. It isn't a required check.

## 4. What does it touch?

Inline references only — nothing external.
