# Demo Environment Architecture

_Last updated: 2026-09-25_
_Status: Revised to reflect two-track delivery model and zero-cost constraint._

---

## 1. Purpose and Delivery Model

The Nodbusiness demo is a full-featured **sandbox account**, comparable in purpose to a payment provider's test mode or a trading demo account. A person should be able to learn by doing: create a business, build and publish a showroom, list products, place test orders, use messaging and discovery, and explore advanced builder capabilities — all without touching real data or real payments.

### 1.1 Two-track delivery

The architecture is designed in two tracks, separated by the current zero-cost infrastructure constraint.

**Track 1 — Bridge (current, zero cost)**

| Attribute | Value |
|---|---|
| Database | Single production PostgreSQL (existing) |
| Demo identity | Built-in `test@nodbusiness.app` account (`is_demo = true`) |
| Session | Existing JWT access/refresh token pair |
| Isolation | `is_demo` / `is_seed` flags + `X-Real-Only` filter |
| Stripe | Not isolated in demo — payments not tested in Track 1 |
| Redis | Demo bypass on `is_demo` flag (already implemented) |
| Cost | Zero |

Track 1 is not a full sandbox. It is an intentional, safe, zero-cost bridge that gets beta users into the app immediately. The isolation is weaker than Track 2. This is documented, accepted, and bounded by the `is_demo` flag, which prevents demo sessions from polluting real user data in API list responses.

**Track 2 — Full sandbox (post-revenue)**

| Attribute | Value |
|---|---|
| Database | Dedicated `DEMO_DATABASE_URL` PostgreSQL instance |
| Demo identity | Per-session temporary user (`demo_user_{uuid}`) in demo DB |
| Session | Separate `demo_session` cookie signed with `DEMO_SESSION_SECRET` |
| Isolation | Per-request database routing via verified session context |
| Stripe | `STRIPE_TEST_SECRET_KEY` + separate test webhook endpoint |
| Redis | Demo-namespaced keys (`demo:{sessionId}:...`) |
| Cost | Requires a second database (minimum: second Supabase free project) |

Track 2 is the full production-grade sandbox. It is started only when a second database can be provisioned. The full architecture from the original spec applies here unchanged.

### 1.2 Product invariants — both tracks

These are non-negotiable regardless of track:

1. A demo action must never read or write a production business record that belongs to a real user.
2. A production action must never display demo-only content to a real user (enforced by `X-Real-Only` header in Track 1, by separate DB in Track 2).
3. Demo checkout must never capture or settle real money (deferred to Track 2 — no payments in Track 1 demo).
4. Curated seed content is durable and never deleted by cleanup.
5. Demo access shows all product features but does not grant production admin privileges.
6. The same frontend and backend code serves both environments. No separate deployment.
7. **If environment identity cannot be verified, the request fails closed.** (Track 2 critical; Track 1 degrades gracefully to real mode.)

---

## 2. Logical Components

### Track 1 component model

```
Browser (Next.js)
  │
  ├── Landing page nav
  │     ├── LandingControls ('use client')
  │     │     ├── ThemeToggle   → next-themes
  │     │     ├── LangToggle    → lib/i18n.ts toggleLanguage()
  │     │     └── TryDemoButton → POST /api/auth/login (test@nodbusiness.app)
  │     └── [Create Account] [Sign In]
  │
  ├── /choose-mode  (first-login redirect)
  │     ├── "Explore First"  → sets onboarding_mode='demo', redirect /feed
  │     └── "Jump In"        → sets onboarding_mode='real', redirect /feed
  │
  ├── AppLayout
  │     └── DemoBanner  (shown when is_demo=true OR onboarding_mode='demo')
  │           └── "Create Account →"  (Track 1 copy)
  │
  └── Express backend (single pool: DATABASE_URL)
        ├── PATCH /api/auth/me   → sets onboarding_mode
        ├── GET  /api/auth/me    → returns onboarding_mode
        └── All routes           → existing is_demo Redis bypass (already live)
```

### Track 2 component model

```mermaid
flowchart LR
  Browser[Next.js browser app]
  Edge[Next.js middleware / route gate]
  API[Express API]
  EnvResolver[Environment context resolver]
  RealPool[Real PostgreSQL pool]
  DemoPool[Lazy demo PostgreSQL pool\nDEMO_DATABASE_URL]
  StripeLive[Stripe live account]
  StripeTest[Stripe test account\nSTRIPE_TEST_SECRET_KEY]
  Jobs[BullMQ workers]
  Media[Object storage\nreal: /real/... prefix\ndemo: /demo/{sessionId}/...]
  Redis[Redis\nreal: real:{userId}:...\ndemo: demo:{sessionId}:...]

  Browser -->|JWT cookie| Edge -->|demo_session cookie| API --> EnvResolver
  EnvResolver -->|real session verified| RealPool
  EnvResolver -->|demo session verified| DemoPool
  API -->|real env only| StripeLive
  API -->|demo env only| StripeTest
  API --> Redis
  API --> Media
  Jobs -->|explicit environment in payload| RealPool
  Jobs -->|explicit environment in payload| DemoPool
```

The `EnvResolver` is the critical new component in Track 2. It reads and verifies the `demo_session` cookie (or its absence), establishes an immutable `EnvironmentContext` in `AsyncLocalStorage`, and makes `getRequestDatabase()` available to all downstream middleware and route handlers. It runs before any authentication, authorization, or data query.

---

## 3. Environment and Identity Model

### 3.1 Environments

- **Real:** existing production PostgreSQL (`DATABASE_URL`), real account identity, live provider configuration, normal subscription entitlements.
- **Demo (Track 1):** same production PostgreSQL, built-in demo accounts (`is_demo = true`), existing JWT tokens, Redis bypass on `is_demo` flag.
- **Demo (Track 2):** dedicated demo PostgreSQL (`DEMO_DATABASE_URL`), temporary per-session identities, Stripe test keys, demo-namespaced Redis keys, session cleanup.

Environment is **request context**, not a mutable process-wide variable. A single API instance serves both environments concurrently in Track 2. A global `pool` reference is never mutated when a request enters demo mode.

### 3.2 Session model

**Track 1 session:**
- The demo user (`test@nodbusiness.app`) has a normal JWT access/refresh token pair — identical in structure to any real user's session.
- The `demo: true` claim embedded in the JWT payload (added in the `fix/redis-demo-quota` branch) is used only to bypass Redis operations. It is not an environment routing signal.
- `onboarding_mode` on the `users` table is the routing signal for the `/choose-mode` redirect.

**Track 2 session:**
- A real user session uses the existing real-auth cookie and real JWT signing/verification.
- A demo session uses a **separate** `demo_session` cookie:
  - Signed with `DEMO_SESSION_SECRET` (separate from `JWT_SECRET`)
  - `HttpOnly`, `Secure` in production, `SameSite=Lax`
  - Contains: `sessionId`, `demoUserId`, `issuedAt`, `expiresAt`, `audience: 'demo'`, `version`
  - Must NOT be accepted as a real access or refresh token anywhere
- Both cookies may be present simultaneously: a real user who has entered demo mode has both their real refresh cookie and a `demo_session` cookie. The active environment is determined by which operation the request is performing, disambiguated at the `EnvResolver` layer.
- The `demo_session` cookie is never read by real-environment route handlers.

### 3.3 `onboarding_mode` — preference vs. security boundary

`onboarding_mode` is a **preference field** on the `users` table in the production database. It stores the user's last chosen environment (`'demo'` | `'real'` | NULL). It drives:
- Whether to show `/choose-mode` on first login
- Whether to issue a new demo session on login (Track 2)
- Whether the demo banner is shown (Track 1, as a secondary signal alongside `is_demo`)

It is NOT the active security boundary. In Track 2, the `demo_session` cookie is authoritative. A forged or tampered `onboarding_mode` value in a request body is ignored — the field is only read from the server-side database.

### 3.4 Anonymous demo visitors (Track 2, later milestone)

A visitor who has no real account may receive an anonymous demo identity. This requires:
- A separate anonymous demo entry endpoint (no real session required)
- A temporary demo user created without a real account association
- A clear statement in the registration flow that sandbox content is not migrated on account creation

This is a later milestone. Track 1 handles anonymous exploration via the `test@nodbusiness.app` shared account on the landing page.

---

## 4. Request-Scoped Database Routing (Track 2)

### 4.1 EnvironmentContext type

```ts
type EnvironmentContext = {
  environment: 'real' | 'demo';
  actorId: string;            // real userId or demo temporary userId
  demoSessionId?: string;     // present only when environment === 'demo'
  expiresAt?: number;         // unix timestamp; demo sessions expire after 24h
};
```

This context is established by `EnvResolver` middleware and stored in `AsyncLocalStorage`. It is immutable for the lifetime of a request — it is never mutated mid-request. Route handlers and services receive it by calling `getRequestContext()` or via explicit injection.

### 4.2 Database provider API

```ts
// Returns the pool bound to the verified request context.
// Throws if called outside a verified request context (never silently falls back).
getRequestDatabase(): Pool

// Used only in workers/scripts with an explicit, validated environment argument.
// Never called from request handlers.
getDatabaseForEnvironment(env: 'real' | 'demo'): Pool

// Internal — creates the demo pool lazily on first validated demo request.
// Requires DEMO_DATABASE_URL. Returns null (not the real pool) if unconfigured.
getDemoPool(): Pool | null
```

### 4.3 Middleware execution order (Track 2)

```
1. Cookie parser
2. Request ID
3. EnvResolver  ← establishes EnvironmentContext before any data access
      ├── No demo_session cookie → environment = 'real'
      ├── demo_session cookie present but invalid/expired → reject 401, never fall back to real
      └── demo_session cookie valid → environment = 'demo', load demo session state from demo DB
4. Auth middleware  ← uses getRequestDatabase() — never imports pool directly
5. Authorization / ownership checks
6. Route handler
```

Demo-token verification happens at step 3, before any account query. There is no scenario where a request reaches step 4 with an unverified environment.

### 4.4 Fail-closed behavior

| Scenario | Track 1 | Track 2 |
|---|---|---|
| `DEMO_DATABASE_URL` not set | N/A (not used) | Demo entry returns 503 "Demo not available". Real requests unaffected |
| `demo_session` cookie present but invalid | N/A | 401 — never falls back to real pool |
| Demo DB unreachable | N/A | 503 for demo requests. Real pool unaffected |
| Real DB unreachable | Real requests fail | Real requests fail. Demo requests do NOT retry on demo DB |
| Missing `DEMO_SESSION_SECRET` | N/A | Server refuses to start (startup validation) |

### 4.5 Route coverage requirement (Track 2)

Database routing is only complete when it covers **all** code that reads or writes application data:

- REST route handlers and nested service/repository calls
- Authentication, profile, and authorization checks
- Socket.IO handshake, events, rooms, and presence
- Background jobs, queues, delayed tasks, and scheduled cleanup
- Payment creation, provider callbacks, and webhook processing
- File metadata, upload keys, and generated asset references
- Redis cache keys, rate-limit keys, and idempotency keys
- Reports, analytics, admin operations, exports, and search indexing

Every background job carries an explicit `environment` field in its payload. A job with missing or invalid environment metadata is rejected, not processed against either database.

---

## 5. Forward-Compatibility Constraints on Track 1

These constraints ensure Track 2 slots in without rewriting Track 1 components:

### 5.1 The `TryDemoButton` endpoint

The "Try Demo" button in Track 1 calls `POST /api/auth/login` with the test account credentials. In Track 2 this becomes `POST /api/demo/enter` which issues a `demo_session` cookie. The frontend button component is written to call a configurable action — the backend endpoint changes, the component does not need to be rewritten. Specifically:

- The button action is abstracted as `auth.enterDemo()` in `api/auth.ts`
- In Track 1, `enterDemo()` calls `loginViaEmailPassword('test@nodbusiness.app', 'Test1234!')`
- In Track 2, `enterDemo()` calls `POST /api/demo/enter` and handles the `demo_session` cookie response
- The button component itself does not know which implementation is active

### 5.2 The `/choose-mode` page

The page is built now and does not change in Track 2. The backend endpoint it calls (`PATCH /api/auth/me` with `{ onboarding_mode }`) does not change. In Track 2, the backend additionally issues a `demo_session` cookie when `onboarding_mode = 'demo'` is set — the frontend does not need updating.

### 5.3 The `DemoBanner` component

The banner is built now with conditional copy based on which track is active. In Track 1 it renders when `user.is_demo === true || user.onboarding_mode === 'demo'`. In Track 2 it renders when a valid `demo_session` cookie is present (surfaced via a context value from `AuthProvider`). The component accepts a `track` prop or detects the active track from context — it does not need to be rewritten.

### 5.4 The `onboarding_mode` migration

Migration 40 adds `onboarding_mode TEXT CHECK (onboarding_mode IN ('demo', 'real'))` to the `users` table in the production database. This column exists in both tracks. It is never added to the demo database (Track 2) — the demo DB has its own `demo_sessions` table instead.

---

## 6. Cache and Realtime Isolation

### Track 1

The existing Redis bypass for `is_demo` accounts (implemented in `fix/redis-demo-quota`) handles cache isolation for demo users: demo account requests skip Redis entirely and go straight to the database. No additional cache namespacing is required in Track 1.

### Track 2

Redis keys are namespaced by environment and session:

```
real:{userId}:user           ← user cache (existing)
real:{userId}:sub            ← subscription tier cache
demo:{sessionId}:user        ← demo user cache
demo:{sessionId}:rate:ai     ← demo AI rate limit (separate quota)
demo:{sessionId}:presence    ← presence key
```

Socket.IO rooms are namespaced:

```
real:user:{userId}           ← real user room (existing naming unchanged)
demo:session:{sessionId}     ← demo session room
demo:conv:{convId}           ← demo conversation room
```

A demo socket handshake validates the `demo_session` token independently. It never joins a real-namespaced room and cannot receive events from real user rooms.

---

## 7. Payment Architecture

### Track 1

Payments are not isolated in Track 1. The test account (`test@nodbusiness.app`) can reach the checkout flow, but it uses the production Stripe key. **Users in Track 1 demo mode are not directed toward payments.** The demo banner copy does not mention payments. No test checkout is presented.

### Track 2

```
Verified environment = 'real'  →  Stripe client with STRIPE_SECRET_KEY
Verified environment = 'demo'  →  Stripe client with STRIPE_TEST_SECRET_KEY
```

The Stripe client is never constructed from a global singleton. It is always constructed from verified request context:

```ts
function getStripeClient(env: EnvironmentContext): Stripe {
  if (env.environment === 'demo') {
    const key = process.env.STRIPE_TEST_SECRET_KEY;
    if (!key) throw new DemoUnavailableError('Stripe test mode not configured');
    return new Stripe(key);
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
```

**Webhook routing (Track 2):**

Two separate Stripe webhook endpoints:
- `/api/webhooks/stripe/live` — verifies with `STRIPE_WEBHOOK_SECRET`, asserts `livemode === true`, updates real DB only
- `/api/webhooks/stripe/test` — verifies with `STRIPE_TEST_WEBHOOK_SECRET`, asserts `livemode === false`, updates demo DB only

Never trust `livemode` alone without signature verification. Never route a webhook based on a client cookie.

---

## 8. Demo Data and Session Lifecycle (Track 2)

### 8.1 Demo session table (demo DB)

```sql
CREATE TABLE demo_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_user_id    UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'revoked', 'expired', 'cleaned')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  ended_at        TIMESTAMPTZ,
  cleanup_state   TEXT NOT NULL DEFAULT 'pending'
                  CHECK (cleanup_state IN ('pending', 'running', 'complete', 'failed')),
  cleanup_error   TEXT
);
```

### 8.2 Session entry flow

```
1. Verify real session (or confirm anonymous demo policy)
2. Confirm DEMO_DATABASE_URL is configured and demo DB is healthy
3. BEGIN demo DB transaction
4.   INSERT INTO users (id, is_temp, ...) → demo_user_id
5.   INSERT INTO demo_sessions (...) → session_id
6. COMMIT
7. Sign demo_session JWT with DEMO_SESSION_SECRET, audience='demo'
8. Set HttpOnly demo_session cookie
9. Redirect to /feed (demo DB context)
```

If step 6 fails, no cookie is issued. The user sees a "Demo unavailable" error. The real session is unchanged.

### 8.3 Session exit and cleanup

| Action | Immediate | Async |
|---|---|---|
| Logout | demo_session status → 'revoked', cookie cleared | cleanup_state → 'pending', worker deletes owned rows |
| Switch to real | demo_session status → 'revoked', cookie cleared, real preference updated | cleanup_state → 'pending', worker deletes owned rows |
| 24h expiry | demo_session rejected at EnvResolver, cookie cleared on next request | cleanup_state → 'pending', scheduled worker runs |
| Reset | Old session → 'revoked', new session created | Old session data cleaned, fresh identity active |

Cleanup deletes in dependency-safe order: messages → notifications → orders → products → showroom sections → showrooms → posts → user profile → demo user. Seed rows (`is_seed = TRUE`) are never deleted. Cleanup is idempotent and supports dry-run mode.

---

## 9. Object Storage Isolation

**Track 1:** No changes. Demo uploads go to the same bucket as real uploads (test account is used for demos, not real users' accounts).

**Track 2:**

```
Real uploads:  /real/{userId}/{filename}
Demo uploads:  /demo/{sessionId}/{filename}
```

A lifecycle policy on the demo prefix automatically deletes files older than 48 hours. Cleanup also explicitly deletes demo files during session cleanup. Demo files are never served from a real-user path and vice versa.

---

## 10. Security Model

### Threat surface

| Threat | Track 1 mitigation | Track 2 mitigation |
|---|---|---|
| Demo user reads real user data | `X-Real-Only` filter, `is_demo` flag in responses | Separate DB, separate pool, no cross-DB queries |
| Demo token used against real API | `demo: true` JWT claim is cosmetic — real API requires valid user lookup from real DB | `audience: 'demo'` claim rejected by real auth middleware |
| Forged `demo_session` | N/A | Signature verification with `DEMO_SESSION_SECRET` |
| Demo user gains real admin access | `role` is checked from DB — test account has `role = 'user'` | Demo DB has no production admin rows; demo entitlement is a presentation layer only |
| Real Stripe key used in demo checkout | Payments not offered in Track 1 demo | `getStripeClient()` throws if test key is missing |
| Demo webhook updates real DB | N/A | Separate webhook endpoints + `livemode` assertion |
| Concurrent requests bleed context | N/A | `AsyncLocalStorage` — immutable per-request context |
| Demo DB exhaustion starves real pool | N/A | Separate bounded pools; demo pool has its own `max` connection cap |

### Defense in depth (Track 2)

- Separate DB credentials and network access for demo and production where the hosting platform permits
- Demo DB role has no permissions on production DB
- Production credentials are never available to demo seed/cleanup jobs
- Separate signing secrets, webhook secrets, provider keys, storage prefixes
- Environment-tagged logs (every log line includes `env: real|demo`)
- Rate-limit demo session creation independently (max N demo sessions per IP per hour)
- Fail closed on missing/malformed demo cookies, secrets, or `DEMO_DATABASE_URL`

---

## 11. Observability

**Track 1:** No new observability infrastructure required. The existing Sentry, pino logger, and `/metrics` endpoint are sufficient.

**Track 2 — additional:**

Track all of the following with `env: demo` labels:
- Demo session creation rate and failure rate
- Active demo session count
- Demo DB pool health (connection count, wait queue, error rate)
- Cleanup backlog (sessions pending cleanup, age of oldest pending)
- Cleanup failure rate
- Demo Stripe test event volume
- External service spend attributed to demo (AI tokens, maps, etc.)
- Environment isolation denials (requests that would have crossed environment boundary)

Alerts must distinguish demo outages from real-account outages. Demo DB exhaustion or downtime must not consume the real pool's connection budget.

### Kill switch

`DEMO_ENABLED=false` disables new demo session creation. Existing sessions can exit but no new ones are issued. Real mode is unaffected. Implemented as a startup check and a runtime check in the demo entry endpoint.

---

## 12. Decision Log

| Decision | Track 1 | Track 2 | Reason |
|---|---|---|---|
| Data isolation | `is_demo` flag + `X-Real-Only` | Separate PostgreSQL DB | Track 1: zero cost. Track 2: strongest blast-radius boundary |
| Demo identity | Shared `test@nodbusiness.app` | Temporary `demo_user_{uuid}` per session | Track 1: simple, zero config. Track 2: clean-slate learning model |
| Session mechanism | Existing JWT pair + `onboarding_mode` DB field | `demo_session` cookie + `DEMO_SESSION_SECRET` | Track 1: reuses existing auth. Track 2: separate signing prevents token replay |
| Session lifetime | Persistent (demo account is permanent) | Maximum 24 hours | Track 1: no cleanup needed. Track 2: limits stale credentials |
| Reset | Not applicable (shared account) | Immediate logical revocation, async physical cleanup | Prevents continued access without making logout wait on deletes |
| Default entry point | Landing page "Try Demo" button | Landing page "Try Demo" + `/choose-mode` on first real login | Same UX entry, different backend |
| Payments in demo | Not offered | Stripe test mode (`STRIPE_TEST_SECRET_KEY`) | Track 1: avoids real payment risk. Track 2: full sandbox parity |
| Admin tour | Not built | Sanitized read-only fixture data | Shows capability without granting privilege |
| Seed data count | 150 existing seed records (faker) | 30 curated businesses for MVP, 150 later | Resolves scope conflict; validates architecture sooner |
| Forward compatibility | All Track 1 components designed to extend, not rewrite | Track 2 adds backend layer only | Prevents wasted rework |
