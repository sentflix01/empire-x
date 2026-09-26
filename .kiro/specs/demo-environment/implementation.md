# Demo Environment Implementation Plan

_Last updated: 2026-09-25_
_Status: Revised — restructured into Track 1 (build now, zero cost) and Track 2 (post-revenue). Premature phases removed. Discovery requirements clarified per track._

---

## 1. How to Read This Document

This file is an **implementation plan**, not an authorisation to run migrations, seed a database, deploy, or change provider settings. Every phase ends with a release gate that must pass before the next phase starts.

The plan is split into two tracks:

- **Track 1** is everything that can be built right now at zero infrastructure cost. It uses the existing single production database, the existing seed accounts, and the existing auth system. All five Track 1 tasks can be sequenced and shipped as a single branch.
- **Track 2** is the full production-grade sandbox. It requires a second PostgreSQL database (`DEMO_DATABASE_URL`). It does not start until revenue allows that second database to be provisioned. Every Track 2 phase references the Track 1 component it extends so nothing is rewritten.

Do not start Track 2 while Track 1 is undeployed. Do not start Track 2 phases out of order — each phase's release gate is a prerequisite for the next.

---

## 2. Pre-Implementation Discovery

Before writing any code in either track, verify the following. Record findings in a comment block at the top of the relevant file or in a `docs/demo-audit.md`.

### 2.1 Required for Track 1 (do now)

- [ ] Confirm the `users` table does not already have an `onboarding_mode` column (migration 40 will add it).
- [ ] Confirm `test@nodbusiness.app` and `admin@nodbusiness.app` exist in the database with `is_demo = TRUE` after migration 39 runs.
- [ ] Confirm the landing page (`app/landing/page.tsx`) is a server component — no `'use client'` directive at the top level. The `LandingControls` component must be a separate `'use client'` file.
- [ ] Confirm `next-themes` `ThemeProvider` is wrapping the landing page (it is, via `app/providers.tsx` and the root layout) so `useTheme()` works in a client component rendered within the landing page.
- [ ] Confirm `toggleLanguage()` and `getCurrentLang()` are exported from `lib/i18n.ts` (they are).
- [ ] Confirm `auth.loginViaEmailPassword()` exists in `api/auth.ts` and stores the token correctly (it does — calls `storeToken()`).
- [ ] Confirm `AppLayout` is the correct place to inject the `DemoBanner` — it wraps all authenticated pages.
- [ ] Confirm the `AuthContext` exposes `user.is_demo` and `user.onboarding_mode` (check what `GET /api/auth/me` returns and whether the type needs updating).

### 2.2 Required before Track 2 starts

- [ ] Inventory every file that imports `pool` from `db/pool` directly. Every one of these is a migration target for `getRequestDatabase()`. Record the full list — do not start Phase 2.1 without it.
- [ ] Inventory every BullMQ job payload type. Every one must gain an explicit `environment: 'real' | 'demo'` field.
- [ ] Confirm `DEMO_DATABASE_URL` target is a completely separate PostgreSQL instance (different hostname or database name on a different Supabase project). Refuse to proceed if it points to the same database as `DATABASE_URL`.
- [ ] Confirm `DEMO_SESSION_SECRET` is set, is at least 32 random bytes, and is different from `JWT_SECRET`.
- [ ] Map every Stripe API call and webhook handler. Confirm `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_WEBHOOK_SECRET` are set before enabling demo payments.
- [ ] Map all upload paths, AI calls, Socket.IO room names, and Redis key patterns — record which need environment namespacing.

---

## 3. Track 1 — Bridge Implementation (Build Now)

### Overview

Five tasks, one branch (`feat/demo-landing-bridge`), zero new infrastructure. Each task is independently testable. Together they deliver:
- Theme toggle, language toggle, and "Try Demo" button on the landing page
- First-login `/choose-mode` page
- Demo banner in the authenticated app
- `onboarding_mode` migration

Estimated scope: 1–2 days of implementation.

---

### Task T1.1 — Migration 40: `onboarding_mode` column

**File:** `backend/db/migrate40.js`

Add `onboarding_mode` to the `users` table in the production database.

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_mode TEXT
  CHECK (onboarding_mode IN ('demo', 'real'));
-- NULL = user has not yet chosen (triggers /choose-mode redirect)
-- 'demo' = user chose demo mode
-- 'real' = user chose real mode
```

No backfill. Existing users get NULL — the choose-mode redirect only fires when NULL, so existing users are not redirected.

**Release gate:**
- Migration runs without error against the real database.
- `SELECT onboarding_mode FROM users LIMIT 1` returns NULL for existing rows.
- `INSERT ... onboarding_mode = 'invalid'` fails the CHECK constraint.

---

### Task T1.2 — Backend: expose and update `onboarding_mode`

**Files touched:**
- `backend/routes/auth.ts` — add `onboarding_mode` to the `GET /api/auth/me` SELECT and to the user object returned after login/Google auth
- `backend/lib/types.ts` — add `onboarding_mode?: 'demo' | 'real' | null` to `AuthUser`

**New endpoint:** `PATCH /api/auth/me/mode`

```ts
// Body: { mode: 'demo' | 'real' }
// Auth: requireAuth
// Sets onboarding_mode on the authenticated user's record
// Returns: { onboarding_mode: 'demo' | 'real' }
```

This endpoint is the only way `onboarding_mode` changes. It is never accepted from a JWT claim or a query parameter.

**Forward-compatibility note:** In Track 2, this endpoint additionally creates or revokes a `demo_session` based on the new mode. The endpoint shape does not change.

**Release gate:**
- `GET /api/auth/me` returns `onboarding_mode` in its response for all users.
- `PATCH /api/auth/me/mode` with `{ mode: 'demo' }` sets the column and returns the new value.
- `PATCH /api/auth/me/mode` with `{ mode: 'invalid' }` returns 400.
- Unauthenticated `PATCH /api/auth/me/mode` returns 401.

---

### Task T1.3 — Frontend: `LandingControls` component

**New file:** `frontend-next/components/landing/LandingControls.tsx`

A `'use client'` component containing three controls rendered in the landing page nav:

**ThemeToggle:**
- Uses `useTheme()` from `next-themes`
- Renders `Moon` icon (dark mode) or `Sun` icon (light mode) from `lucide-react`
- `mounted` guard prevents hydration mismatch (same pattern as `AppLayout`)
- `aria-label` reflects current state: "Switch to dark mode" / "Switch to light mode"

**LangToggle:**
- Calls `toggleLanguage()` from `lib/i18n.ts` on click
- Displays `'EN'` or `'አማ'` as a text badge
- Uses `useTranslation()` to get the current language (or `i18n.language` directly)
- `mounted` guard to avoid SSR/client mismatch on localStorage read

**TryDemoButton:**
- Calls `auth.enterDemo()` from `api/auth.ts` (see below) on click
- Loading state: "Loading demo…" + spinner, button disabled
- Error state: inline error message below the button, does not redirect
- On success: `window.location.href = '/feed'`
- `aria-label="Try the demo"` for accessibility

**`api/auth.ts` — new `enterDemo()` method:**

```ts
// Track 1 implementation:
async enterDemo(): Promise<void> {
  await this.loginViaEmailPassword('test@nodbusiness.app', 'Test1234!');
  // storeToken() is called inside loginViaEmailPassword — no extra step needed
}
// Track 2: this method will call POST /api/demo/enter instead.
// The button component does not change.
```

**Integration into landing page:**

The landing page (`app/landing/page.tsx`) remains a server component. The nav's button group is replaced with:

```tsx
{/* These three buttons are client-side — theme, language, and demo login */}
<LandingControls />
{/* These two links are server-rendered */}
<Link href="/register">Create Account</Link>
<Link href="/login">Sign In</Link>
```

On mobile (below `sm`): theme and language toggles become icon-only (`aria-label` retained). "Try Demo" remains a full button. "Create Account" is hidden (same as existing behaviour). "Sign In" and "Try Demo" remain visible.

**Release gate:**
- Theme toggle changes the `html` class between `dark` and `''` and persists across page reload.
- Language toggle switches `i18n.language` and `localStorage.empire_lang` between `'en'` and `'am'`.
- "Try Demo" button logs in as `test@nodbusiness.app`, stores the token, and redirects to `/feed`.
- "Try Demo" shows a loading state while the login request is in flight.
- If the backend is unreachable, "Try Demo" shows an inline error and does not navigate.
- All three controls render without hydration warnings (`mounted` guard in place).
- TypeScript check passes.

---

### Task T1.4 — Frontend: `/choose-mode` page

**New files:**
- `frontend-next/app/(auth)/choose-mode/page.tsx`
- `frontend-next/app/(auth)/choose-mode/ChooseMode.tsx` (client component)

**Logic:**

```
On mount:
  if (!authChecked) → show loading spinner
  if (!isAuthenticated) → redirect /login
  if (user.onboarding_mode !== null) → redirect /feed
  else → show the two-option screen
```

**UI — two cards:**

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  🗺  Explore First              │  │  ⚡  Jump In                    │
│                                 │  │                                 │
│  See a fully populated demo     │  │  Start with your own blank      │
│  of the platform. Browse,       │  │  feed and build your real       │
│  build, and explore freely.     │  │  presence from scratch.         │
│                                 │  │                                 │
│  [ Explore Demo →  ]            │  │  [ Start Building →  ]          │
└─────────────────────────────────┘  └─────────────────────────────────┘
                    Explore first. Switch to real any time.
```

**On "Explore Demo →" click:**
1. Call `PATCH /api/auth/me/mode` with `{ mode: 'demo' }`
2. On success: `window.location.href = '/feed'`
3. Loading state on button during request

**On "Start Building →" click:**
1. Call `PATCH /api/auth/me/mode` with `{ mode: 'real' }`
2. On success: `window.location.href = '/feed'`

**Redirect logic in `AppLayout` (or Next.js middleware):**

After a successful login that resolves `user.onboarding_mode === null`, redirect to `/choose-mode?return=/feed` before rendering `AppLayout`. The existing auth redirect logic in `AppLayout` gains one additional check:

```ts
if (authChecked && isAuthenticated && user.onboarding_mode === null) {
  router.push('/choose-mode');
  return;
}
```

**Forward-compatibility note:** In Track 2, clicking "Explore Demo →" additionally triggers demo session creation on the backend. The `/choose-mode` page itself does not change — the backend `PATCH /api/auth/me/mode` endpoint handles the session creation transparently.

**Release gate:**
- A user with `onboarding_mode = NULL` is redirected to `/choose-mode` after login.
- A user with `onboarding_mode = 'demo'` or `'real'` is redirected to `/feed`, not `/choose-mode`.
- Clicking "Explore Demo →" sets `onboarding_mode = 'demo'` in the DB and lands on `/feed`.
- Clicking "Start Building →" sets `onboarding_mode = 'real'` in the DB and lands on `/feed`.
- Direct navigation to `/choose-mode` by a user who already chose redirects to `/feed`.
- Page is accessible without JavaScript disabled (server renders the redirect check).
- TypeScript check passes.

---

### Task T1.5 — Frontend: `DemoBanner` component

**New file:** `frontend-next/components/demo/DemoBanner.tsx`

A non-dismissible amber banner injected in `AppLayout` below the main navigation.

**Visibility condition (Track 1):**

```ts
const showDemoBanner =
  user?.is_demo === true || user?.onboarding_mode === 'demo';
```

**Track 1 banner content:**

```
🧪  You're exploring a demo account — sign up to keep your work.   [Create Account →]
```

**Track 2 banner content** (future — detected by presence of `demo_session` context):

```
🧪  Demo sandbox — activity and payments use test data.   [Switch to Real →]
```

The component accepts a `track` prop (`'1' | '2'`) or auto-detects from context. In Track 1 the `track` prop is always `'1'`. In Track 2 the `AuthProvider` sets it from the verified session context.

**"Create Account →" (Track 1):** navigates to `/register`.

**"Switch to Real →" (Track 2):** opens `SwitchToRealModal` (see below).

**`SwitchToRealModal`** — built now, used in Track 2:

```
┌──────────────────────────────────────────────┐
│  Switch to your real account?                │
│                                              │
│  Track 1 copy:                               │
│  "You'll leave the demo account and return   │
│  to your own feed. Your real account         │
│  starts empty."                              │
│                                              │
│  Track 2 copy:                               │
│  "Your demo session will end. Content you    │
│  created in demo mode will be removed        │
│  within 24 hours. Your real account and      │
│  its data are untouched."                    │
│                                              │
│  [ Yes, switch to real ]  [ Stay in demo ]   │
└──────────────────────────────────────────────┘
```

The modal is keyboard-accessible (focus trap, `Escape` closes, `Enter` on primary button confirms).

**Integration in `AppLayout`:**

```tsx
{showDemoBanner && <DemoBanner track="1" />}
```

Placed immediately after the `<nav>` element, before the main content area. The banner has `position: sticky` so it remains visible while scrolling.

**Release gate:**
- Banner appears for `test@nodbusiness.app` login.
- Banner appears for any user with `onboarding_mode = 'demo'`.
- Banner does not appear for users with `onboarding_mode = 'real'` or `null`.
- Banner is not dismissible — no close button, no way to hide it via UI.
- "Create Account →" navigates to `/register`.
- Banner does not break layout on mobile (wraps correctly, text truncates if needed).
- `SwitchToRealModal` renders without errors (even if "Switch to Real" is not wired in Track 1 — the button can be hidden with `track === '1'`).
- TypeScript check passes.

---

### Track 1 — Full Release Gate

All five tasks complete and passing individually, plus:

- [ ] A logged-out visitor can click "Try Demo" on the landing page and reach `/feed` within 3 seconds on a warm backend.
- [ ] A new real user (not `test@nodbusiness.app`) who registers sees `/choose-mode` on first login.
- [ ] Choosing "Explore Demo" from `/choose-mode` shows the demo banner on `/feed`.
- [ ] Choosing "Jump In" from `/choose-mode` does not show the demo banner.
- [ ] Theme toggle on the landing page persists after navigating to `/login` and back.
- [ ] Language toggle on the landing page persists into the authenticated app.
- [ ] TypeScript check passes for the entire frontend.
- [ ] Existing auth integration tests pass (17/17).
- [ ] No new console errors or hydration warnings introduced.
- [ ] Branch pushed to `feat/demo-landing-bridge`, PR opened, reviewed, merged per SOP.
- [ ] Migration 40 run against the production database before deploy.

---

## 4. Track 2 — Full Sandbox Implementation (Post-Revenue)

Track 2 starts only when:
1. Track 1 is deployed and stable in production.
2. A second PostgreSQL database is provisioned (`DEMO_DATABASE_URL` is set to a different host/database than `DATABASE_URL`).
3. `DEMO_SESSION_SECRET` is generated (32+ random bytes, stored as a secret, never committed).
4. The full discovery checklist in §2.2 is complete.

Track 2 is documented here at the phase level. Detailed task breakdowns are written per-phase as that phase begins — do not write Track 2 task-level detail until Track 1 is stable, because the codebase will have changed.

---

### Phase 2.0 — Requirements and Discovery Finalisation

Before any code:

1. Confirm the `requirements.md` contradictions in §12 are fully resolved (they are as of this revision).
2. Complete the Track 2 discovery checklist (§2.2).
3. Produce a route inventory: every Express route handler, its direct pool imports, and its environment assignment.
4. Produce a side-effect matrix: every external call (Stripe, AI, email, push, maps, storage, Socket.IO, Redis) with its demo policy, credentials, spend limit, and cleanup action.
5. Confirm hosting platform supports two separate database projects at zero incremental cost (e.g., second Supabase free-tier project). Document the chosen approach.

**Phase 2.0 exit gate:** Route inventory complete, no unreviewed entry. Side-effect matrix complete. Hosting approach confirmed and documented.

---

### Phase 2.1 — Database Provider and Environment Context

Build the `getRequestDatabase()` abstraction and `EnvResolver` middleware as described in `architecture.md §4`.

Key deliverables:
- `backend/lib/db.ts` — exports `getRequestDatabase()`, `getDatabaseForEnvironment()`, `getDemoPool()`
- `backend/middleware/envResolver.ts` — establishes `EnvironmentContext` in `AsyncLocalStorage`
- All direct `pool` imports in route handlers replaced with `getRequestDatabase()`
- Startup validation: server refuses to start if `DEMO_DATABASE_URL` === `DATABASE_URL`, or if `DEMO_SESSION_SECRET` is missing/too-short when `DEMO_ENABLED=true`

**Phase 2.1 release gate:**
- Parallel real and demo test requests cannot exchange `EnvironmentContext`.
- Missing `DEMO_DATABASE_URL` never produces a real DB query for a demo request — returns 503.
- A forged, expired, revoked, or wrong-audience demo token cannot reach a route handler.
- Real authentication and real database behaviour retain all existing test coverage.
- Each converted route has a paired test: real request touches only real test pool; demo request touches only demo test pool; wrong pool throws immediately.

---

### Phase 2.2 — Demo Session Lifecycle

Build the demo session entry, exit, reset, and expiry flows as described in `architecture.md §8`.

Key deliverables:
- Demo DB migration: `demo_sessions` table, `is_temp` flag on `users`
- `POST /api/demo/enter` — creates session, issues `demo_session` cookie
- `POST /api/demo/exit` — revokes session, clears cookie
- `POST /api/demo/reset` — revokes + creates fresh session
- `api/auth.ts` `enterDemo()` updated: calls `POST /api/demo/enter` instead of the Track 1 login
- Cleanup worker: BullMQ job with explicit `environment: 'demo'` in payload, runs against demo pool only
- 24-hour expiry enforcement in `EnvResolver`

**Phase 2.2 release gate:**
- Entry returns demo data and never returns real-owned rows.
- Switch-to-real returns the real account's prior profile/businesses unchanged.
- Revoked/expired `demo_session` cookie cannot access any route or published demo object.
- Cleanup removes only the target session's owned data; seed rows survive.
- Cleanup is safe to retry (idempotent).

---

### Phase 2.3 — Frontend Environment UX

Extend the Track 1 components for the Track 2 session model. No rewrites — extensions only.

Key deliverables:
- `DemoBanner`: `track` prop switches to `'2'` when `demo_session` context is present; "Switch to Real →" now wired to `SwitchToRealModal` → `POST /api/demo/exit`
- `/choose-mode`: backend now issues `demo_session` cookie on "Explore Demo →" (no frontend change needed)
- `AuthProvider`: surfaces `isDemo: boolean` and `demoSessionId: string | null` from a new `/api/auth/env` endpoint or from the `/api/auth/me` response
- Environment badge in profile/account menus: "Demo user" vs "Real account" vs "Guest"
- Demo-specific checkout copy: test card tooltip (`4242 4242 4242 4242`) shown in payment forms when `isDemo === true`
- Demo showroom builder banner: "You're building in demo mode — switch to real to keep your showroom permanently."

**Phase 2.3 release gate:**
- All Track 1 release gate items still pass.
- Demo banner shows Track 2 copy for real users who entered demo via the new session flow.
- Demo banner shows Track 1 copy for `test@nodbusiness.app` sessions (backward compatible).
- Environment badge shows correctly in profile menu for both real and demo users.
- Switching to real from the banner revokes demo session and lands on real feed with real account intact.

---

### Phase 2.4 — Stripe Test Mode Isolation

Key deliverables:
- `getStripeClient(env: EnvironmentContext): Stripe` factory (see `architecture.md §7`)
- All existing Stripe API calls updated to use the factory
- `/api/webhooks/stripe/live` — new endpoint, `STRIPE_WEBHOOK_SECRET`, asserts `livemode === true`, updates real DB
- `/api/webhooks/stripe/test` — new endpoint, `STRIPE_TEST_WEBHOOK_SECRET`, asserts `livemode === false`, updates demo DB
- Existing single webhook endpoint retired after both new endpoints are tested
- Demo checkout UI: test card instruction tooltip

**Phase 2.4 release gate:**
- Demo checkout uses test key, never live key — confirmed by test that configures live pool to throw.
- Test webhook rejects live events; live webhook rejects test events.
- Duplicate webhook events are deduplicated per environment.
- A completed test checkout updates demo orders and balances in demo DB only; real DB is untouched.

---

### Phase 2.5 — Seed Dataset

Key deliverables:
- `backend/db/seed-demo.js` — 30 businesses across 10 sectors as per `requirements.md §10`
- Must require `DEMO_DATABASE_URL`, print redacted target, offer dry-run mode, be idempotent
- All seed rows: `is_seed = TRUE`
- `npm run seed:demo` script entry in `backend/package.json`

**This script is not executed against any hosted database during implementation.** It is validated against a local disposable PostgreSQL instance only.

**Phase 2.5 release gate:**
- `seed-demo.js` exits with error if `DEMO_DATABASE_URL` is not set.
- Running twice produces the same result (idempotent).
- Seed rows survive a full session cleanup pass — no seed data deleted.
- All 30 businesses visible in demo feed after seeding.

---

### Phase 2.6 — External Services and Side Effects

Work through the side-effect matrix produced in Phase 2.0. For each row: implement the demo policy, add the test, mark the matrix row complete. Minimum coverage:

| Service | Demo policy |
|---|---|
| AI (OpenAI / Anthropic) | Same provider, same responses. Per-session token budget enforced. Demo does not bypass the budget. |
| Email / SMS | Route to a configured sink address or allowlisted address. Never send to arbitrary recipients from demo flows. |
| Push notifications | Demo-labeled, scoped to demo session. Subscriptions deleted on session cleanup. |
| Object storage | `/demo/{sessionId}/` prefix. Lifecycle auto-delete after 48h. |
| Maps / geocoding | Real service, real coordinates. Same quota monitoring as real mode. |
| Socket.IO | Demo-namespaced rooms (`demo:...`). Demo handshake validates `demo_session` independently. |
| Redis | Demo-namespaced keys (`demo:{sessionId}:...`). Demo rate limits are separate from real rate limits. |
| Chapa | Sandbox key (`CHASECK_TEST-...`). Callback verified with sandbox signing secret. |
| BullMQ workers | All job payloads carry `environment: 'demo'`. Workers use `getDatabaseForEnvironment('demo')` only. |

**Phase 2.6 release gate:**
- Each service row in the matrix has a passing test.
- No demo action produces a real email, SMS, or push notification to an unintended recipient.
- Demo socket events do not appear in real user feeds.
- AI spend attributed to demo does not exceed configured per-session budget.

---

### Phase 2.7 — Test Strategy and Acceptance

#### Unit tests (all phases)
- Token verifier rejects wrong secret, audience, environment, expiry, revoked session
- `getRequestDatabase()` selects correct pool; no implicit fallback
- Stripe client factory selects test/live from verified context only
- Cleanup ownership logic: seed rows survive, session-owned rows are deleted
- Entitlement visibility (all features) vs authorisation enforcement (no real admin access)

#### Integration tests (all phases)
Paired real/demo tests for every route class. In demo tests, configure real pool to throw if touched. In real tests, configure demo pool to throw if touched.

#### End-to-end tests (Phase 2.4+)
Against disposable isolated test databases and Stripe test mode:

1. Register/login a real account → see `/choose-mode` → select "Explore First"
2. Confirm demo banner and demo identity (temp user, not real user)
3. Build and publish a demo showroom → confirm accessible at its URL
4. Complete a Stripe test checkout using `4242 4242 4242 4242` → confirm demo order/ledger update
5. Attempt environment-crossing URLs and stale/forged demo sessions → confirm no production records touched
6. Switch to real → confirm real account state is intact and demo banner is gone
7. Reset/re-enter demo → confirm new identity, preserved seed content, removed session-owned content
8. Let session expire → confirm 24h expiry enforced and cleanup runs

E2E tests must never target production credentials or the production database.

#### Security and resilience tests
- Concurrent demo and real requests cannot leak `AsyncLocalStorage` context
- Demo DB down does not affect real requests
- Real DB down does not cause demo requests to retry on real DB
- Webhook signature/environment mismatch rejected before any DB write
- Demo `admin` routes never grant live admin authority
- Cookie flags, CSRF, CORS, and origin checks validated for actual domain setup

#### Track 2 full release checklist
- [ ] All Phase 2.1–2.6 release gates passed
- [ ] Route/job/webhook/socket/external side-effect inventory has no unreviewed entry
- [ ] Production DB credentials cannot connect to demo DB (network/role level where possible)
- [ ] Demo seed and cleanup commands pass only against disposable demo/test DB
- [ ] Stripe test and live webhook paths independently configured and tested
- [ ] Switch, reset, expiry, and return-to-real flows pass browser E2E
- [ ] Monitoring, spend alerts, kill switch, backup, and recovery playbook ready
- [ ] Rollback plan preserves real sessions and real DB state
- [ ] Product copy consistently uses "sandbox" / "test data", not "simulated"

---

## 5. Deferred Milestones

These items are designed and spec'd but not implemented until Phase 2.3 (environment UX) is stable and passing:

| Milestone | Depends on | Notes |
|---|---|---|
| Video player (`/tour/video`) | Phase 2.3 | Needs stable demo session to route video progress storage |
| 14-step interactive tour guide | Phase 2.3 | Tour steps reference live UI elements — needs demo DB data to be present |
| Expand seed to 150 businesses | Phase 2.5 stable | Validate DB performance at 30 first |
| Anonymous demo entry (no real account) | Phase 2.2 | Separate entry flow, separate policy for data migration on registration |
| Developer sandbox API keys | Phase 2.2 | Needs session lifecycle; scoped to sandbox endpoints only |
| Demo showroom share links (public visitors) | Phase 2.3 | Requires read-only capability token design; demo cookie not transferred |
| Admin preview (sanitised read-only fixture) | Phase 2.3 | Must use fixture data only — never real admin APIs |

---

## 6. Rollout Sequence

### Track 1 rollout
1. Run migration 40 against production database.
2. Deploy `feat/demo-landing-bridge` branch.
3. Smoke-test: landing page → Try Demo → `/feed` with seed data and demo banner.
4. Smoke-test: register new account → `/choose-mode` → both paths.
5. Verify existing users with `onboarding_mode = NULL` are redirected to `/choose-mode` on next login.
6. Monitor for errors (Sentry), hydration warnings (browser console), and auth test regressions.

### Track 2 rollout
1. Deploy Phase 2.1 with `DEMO_ENABLED=false`. Verify real flows are unaffected.
2. Configure `DEMO_DATABASE_URL` (separate instance), `DEMO_SESSION_SECRET`, `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`.
3. Run demo DB migrations and health tests in a non-production environment.
4. Enable `DEMO_ENABLED=true` for internal accounts only.
5. Test full entry → create → checkout → switch → reset → cleanup cycle internally.
6. Enable for a small beta cohort with spend, pool, cleanup, and error monitoring.
7. Expand after security and reliability gates pass.

### Rollback (either track)
- Track 1: revert the branch. Migration 40's new column has no data dependencies — it can be left in place or rolled back with `ALTER TABLE users DROP COLUMN onboarding_mode`.
- Track 2: set `DEMO_ENABLED=false`. Existing real sessions and real database are unaffected. Demo DB is quarantined for investigation. Code rollback requires confirming schema changes are backward-compatible.

---

## 7. Cost and Operational Decisions

Before Track 2 beta, document and assign owners for:

- Demo DB compute and storage ceiling (and what happens when it is hit)
- AI token spend per demo session (hard cap or soft alert)
- Object storage quota for demo uploads
- Rate limit on demo session creation per IP per hour
- Who responds to demo isolation alerts
- Who may run destructive seed/reset/cleanup commands and on which environments
- Support process for demo users who hit a bug or unexpected state

Do not promise "every feature works in demo" until its row in the side-effect matrix (Phase 2.6) is implemented and tested. Feature parity means shared product behaviour within explicit sandbox boundaries — not production privileges, real financial settlement, or uncapped external usage.
