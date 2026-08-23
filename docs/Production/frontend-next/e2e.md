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
refresh re-hydration); bad credentials stay on /login; suite skips cleanly when
seed data missing. Run: npm run test:e2e (boots backend+frontend automatically).

## 4. What does it touch?

Inline references only — nothing external.
