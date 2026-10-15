# Codebase audit — 2026-10-15

Non-authoritative investigation note (see `note/README.md`). Branch
`codex/launch-scope-partnership-audit`, audited as the working tree including
uncommitted changes (≈75 modified/untracked files).

## Scope and method

| Area | Coverage |
|---|---|
| Backend `index.ts`, `socket.ts`, all 12 middleware, all 45 route modules | Read in full |
| Backend `lib/`, `services/`, `utils/` | Read in full except `ai.ts`, `alerts.ts`, `copilot.ts`, `scorecard.ts`, `showroomDoctor.ts`, `suggestionScore.ts`, `types.ts` (skimmed) |
| Backend `db/` | `pool.ts`, migration runner, migrations 49–51, schema for tables touched by findings, seed safety guard. Older migrations and seed content (`templateData.js`, seed patches) checked only by targeted search |
| Frontend (~60k lines) | Read: API client, Next config/CSP, edge proxy, showroom builder edit/load logic, public showroom renderer, chat loading. Remaining views/components covered by targeted pattern sweeps (raw HTML, user-controlled URLs, iframes, token storage), not line by line |
| `docs/` (~900 files), `.kiro/`, `implementation plan/` | Not reviewed except deployment config (`render.yaml`) |

Every finding below was checked against the code (and schema/runtime where
noted). "Verified" means reproduced or proven by a concrete artifact, not only
inferred.

## Test results

| Gate | Result |
|---|---|
| Backend `npm run typecheck` | Pass |
| Backend Jest (`jest --runInBand`, DB mocked) | 58/58 suites, 478/478 tests pass |
| Frontend `npm run lint` | Pass |
| Frontend Vitest | 25/25 files, 165/165 tests pass |
| Frontend `tsc --noEmit` | Fails only on corrupted generated files in `.next/dev/types` (left by the running dev server). Source alone typechecks clean |
| Frontend `next build` (clean copy, webpack) | Pass, 51 pages |
| Playwright, mocked specs (public, signup, google-auth, demo-mode, business-showroom-flow) | Dev server: 38/41 pass. Clean prod build: Google popup handoff passes; 3 showroom-builder specs fail (see F-H5); one auth spec (C4) aborted a navigation once (flaky) |
| Playwright, full suite on an isolated stack (throwaway embedded Postgres 18.4 → backend :3011 → prod frontend build :3012) | **46/49 pass**, including all DB-backed specs: login, realtime chat (live + persisted), checkout/COD orders, account-mode guard. Failures: 2 showroom-builder specs (F-H5 and one unresolved), C4 logout (test race: it deletes the hint cookie inside a live page while a session refresh is in flight) |
| Migrations on a fresh Postgres | All 51 apply cleanly; re-running is idempotent |
| Backend legacy `test/e2e.test.js`, `api.test.js` | Not run |

### Live reproductions on the isolated stack

| Finding | Observed |
|---|---|
| F-C1 | `INSERT INTO webhook_events (event_id, …)` → `column "event_id" … does not exist` |
| F-C3 | `commissions` has only a non-unique index on `order_id` |
| F-H1 | Attacker registers victim email, victim registers and verifies → attacker's password logs in, victim's own password is rejected |
| F-H2 | User B `PUT` on user A's variant → 200 (price 1.00, stock 999); `DELETE` → 200 |
| F-H3 | `GET /api/maps/nearby` → 500 (`column "name" does not exist`) |
| F-H4 | 205 messages sent, load returns `msg 1`…`msg 200`; the 5 newest are missing |
| F-H7 | Outsider forwards a private A→B message into their own group → 201 with the content |
| Upload | Valid 1×1 PNG on local storage → 415 `MAGIC_BYTE_MISMATCH` |
| New | `npm run seed` accounts (`is_seed = TRUE`) cannot log in: login returns `LEGACY_DEMO_ACCOUNT`, so the dev seed produces unusable accounts |

Why the Jest suite missed the bugs below: `setupTests.js` replaces the pool
with a mock for every test, so SQL against non-existent columns (F-C1, F-H3)
and schema mismatches never execute.

## Critical

**F-C1. Business subscription webhook can never succeed.**
`backend/routes/subscriptions.ts:283` inserts `webhook_events (event_id, event_type, processed_at)`, but the table (`backend/db/migrate20.js:45`) has `id, type, processed_at`. Every subscription event throws, the claim is rolled back, Stripe retries forever, and a paying business is never activated. Orders use the correct columns (`orders.ts:632`).

**F-C2. Subscription period dates are read from fields Stripe no longer returns.**
The installed `stripe@23.0.0` pins API `2026-09-30.endive`, where `current_period_start/end` exist only on subscription items (`node_modules/stripe/cjs/resources/SubscriptionItems.d.ts:54`), not on the subscription. `subscriptions.ts:331` therefore builds `new Date(NaN)`, which `pg` serialises as `0NaN-NaN-…` (verified), and `customer.subscription.updated` (`:363`) never extends `current_period_end`. Once F-C1 is fixed, renewals would not move the period forward, and `scripts/business-subscription-lifecycle.js` would hide, block, and on day 10 **permanently delete the business and its products** for a customer who is still paying. `invoice.paid` is not handled at all.

**F-C3. Platform commission is charged twice on online orders.**
`collectCommission` (`routes/commission.ts:24`) relies on `ON CONFLICT DO NOTHING`, but `commissions` has no unique constraint on `order_id` (`migrate3.js:83–94`, no later migration adds one), and the wallet debit runs whether or not the insert happened. It is called when a Stripe/Chapa order is paid (`orders.ts:466`, `:762`) and again when the buyer marks it completed (`orders.ts:285`).

## High

**F-H1. Account pre-hijacking through unverified registrations.**
`POST /api/auth/register` for an existing unverified email re-sends an OTP but keeps the original password hash (`auth.ts:269–285`); `verify-otp` then marks the account verified and logs in. Google sign-in links any existing account by email and sets `is_verified = TRUE` without clearing the password (`auth.ts:789–794`) and without checking `email_verified`. An attacker who registers a victim's email first keeps a working password after the victim verifies or signs in with Google.

**F-H2. Any signed-in user can edit or delete any product variant.**
`PUT /api/variants/:id` and `DELETE /api/variants/:id` (`routes/variants.ts:37–54`) have no ownership check (create does).

**F-H3. Nearby/map endpoints query columns that do not exist.**
`routes/maps.ts:75` and `:124` select `name, category, logo_url, address` from `businesses`; the table has `business_name, business_category, business_logo_url, business_address` (`migrate.js:92–109`). `/api/maps/nearby` (types `all`/`businesses`) and product search with any match return 500.

**F-H4. Chat shows the oldest messages, never the newest.**
`GET …/messages` orders `ASC LIMIT n` (`routes/messages.ts:203`) and the client asks for 200 (`views/ChatRoom.tsx:91`). Any conversation over 200 messages opens on its first 200; new messages only appear via the socket while the page is open.

**F-H5. Editing a published website can load blank defaults and overwrite it.**
In `views/ShowroomCreate.tsx`, the edit loader (`:340`) merges the fetched site into form state, but the defaults effect (`:378–406`) resets `formData`/`activeSections` whenever `draftKey` changes, and `draftKey` (`:292`) changes when the signed-in user finishes loading. If the user resolves after the showroom fetch, the editor shows template defaults and "Publish" saves them over the real site. Reproduced by the E2E spec "editing a published showroom restores its sections" (business name field empty).

**F-H6. Webhooks and API keys cannot be updated, disabled, or revoked.**
`PUT/DELETE /api/business-webhooks/:id` and `DELETE /api/business-api-keys/:id` read `req.businessId`, which only `checkTierLimit` sets; these routes don't use it, so the query matches `business_id = NULL` and always returns 404. A leaked API key cannot be revoked. (`validateApiKey` is also never used, so keys currently grant nothing.)

**F-H7. Message forward leaks any message.**
`POST /api/messages/messages/:id/forward` (`messages.ts:405`) checks membership of the target conversation only, not the source. Anyone with a message ID can copy its content into their own conversation.

**F-H8. Paid features without a tier check.**
External data sources (`routes/externalSources.ts`, advertised as Premium) have no tier gate. Published showrooms can be edited to add Pro-only sections without re-checking the tier, because the entitlement check in `showrooms.ts:348` runs only when `status: 'published'` is sent in the update.

**F-H9. Production depends on Redis for security controls that silently turn off.**
`render.yaml` leaves `REDIS_URL` unset. Without it: refresh-token revocation on logout/password change, the OTP attempt counter, login lockout, and AI rate limits all become no-ops (`auth.ts:198–227`, `middleware/auth.ts:132`). A copied refresh cookie stays valid for 7 days after logout. Also, `ioredis` TLS defaults to `rejectUnauthorized: false` (`lib/redis.ts:114`).

## Medium

- **CSP blocks the site builder's own embeds.** `frame-src` allows only Stripe and Google accounts (`frontend-next/next.config.ts:96`), so YouTube video, Google Maps, and live-location iframes in public showrooms (`SectionRenderer.tsx:584`, `:602`, `LiveLocationSection.tsx:169`) are blocked in production.
- **Local-disk uploads always rejected.** With no cloud storage (dev, E2E), `routes/upload.ts:22–28` passes only the first 12 bytes to `sharp().metadata()`, which fails for every real PNG/JPEG (verified). Production with Supabase/R2 is unaffected.
- **Partial Stripe refunds over-credit sellers.** `orders.ts:541–547` applies the cumulative refund ratio to an already-reduced commission on each `charge.refunded` event. The handler is not transactional, so a mid-way failure plus Stripe retry re-applies wallet credits and coupon increments.
- **Chapa redirect breaks with multiple frontend URLs.** `orders.ts:751` and `wallet.ts:204` use raw `FRONTEND_URL` (comma-separated list) instead of `getPrimaryFrontendUrl()`.
- **Subscriptions are Stripe-only while production has Stripe off.** `render.yaml` sets `FF_STRIPE_PAYMENTS=false` and enables Chapa, but `/api/subscriptions/create` requires the Stripe flag, so no business can buy a plan or publish a website. This is a product/config conflict to decide, not a code fix.
- **Rate limits may be shared by all users.** The frontend proxies `/api/*` through Vercel rewrites (`next.config.ts:18`); with `trust proxy = 1` the backend likely sees Vercel egress IPs, so the 20-per-15-minute login limit could apply across users. Needs confirmation against real request logs.
- **Presence privacy setting is never enforced.** `presence_visibility` is stored (`messages.ts:381`) but `GET /presence/:userId` and the socket fan-out ignore it; without Redis the fan-out broadcasts to every socket.
- **Exact user coordinates exposed.** `/api/maps/nearby?type=people` returns profile `latitude/longitude` to anonymous callers.
- **Reviews need no purchase** and accept a seller reviewing their own product (`routes/reviews.ts:50`).
- **Group chats can add anyone**, including users who blocked the creator (`messages.ts:152`, `:309`).
- **HTML injection in emails.** Product titles go unescaped into order-confirmation email HTML (`utils/mailer.ts:146`).
- **Login lockout sends a broken reset link** with token `lockout-alert` (`auth.ts:645`).
- **AI chat `max_tokens` and `system_prompt` are client-controlled and uncapped** (`routes/ai.ts:83–86`).
- **SSRF guard is check-then-fetch** (DNS rebinding window) and reads unbounded response bodies (`services/proxyGateway.ts:332–387`).
- **Tier cache caches "no business" for 5 minutes** (`middleware/tierLimit.ts:68–79`); a new business owner is treated as freemium meanwhile.

## Low

- `GET /api/orders/chapa/status/:tx_ref` is unauthenticated; tx_refs are guessable from user-ID prefix + timestamp.
- Non-production `POST /api/wallet/topup` lets any user credit their own wallet, and non-numeric amounts can write `NaN` into `wallets.balance`.
- `databaseIdentity()` (`db/pool.ts:40`) ignores the Supabase pooler tenant (username), so the shared-database isolation check can be skipped or misapplied.
- Showroom create returns raw DB error text (`showrooms.ts:318`); upload errors echo provider responses.
- `/health` publicly reports which providers are configured.
- Story replies are readable by any signed-in user (`stories.ts:77`); story and product view counts can be inflated.
- Poll votes are a read-modify-write on JSON and lose concurrent votes (`polls.ts:28–38`).
- Next image optimizer allows `https://**` (open image proxy).
- Prod CSP keeps `script-src 'unsafe-inline'`.
- Sentry v10's `setupExpressErrorHandler` is called before routes are mounted, so it never sees errors.
- `tsconfig.json` includes `.next/dev/types`, so a running or crashed dev server breaks `tsc` and `next build` locally.
- Migrations rerun every file on each deploy (no applied-migrations ledger); safe only while every migration stays idempotent.
- `index.ts` requires untracked files (`lib/businessSubscriptionPolicy.ts`, `middleware/publicDemoBrowse.ts`, `scripts/business-subscription-lifecycle.js`); committing the modified files without them breaks the build.

## Environment observations

- `frontend-next/.env.local` contains a live-format `sb_secret_` Supabase key and demo session secret. The file is gitignored, so this is not a leak, but keep it out of shared copies and rotate if this machine's files were ever shared.
- Your local dev server on port 3002 returns 404 for `/showroom/create`, `/templates`, `/samples` even though the routes exist and build correctly. Its route types are truncated; restarting `next dev` should clear it.

## Not verified

- Behaviour against the hosted Supabase database itself (all live testing used a throwaway local Postgres), and the legacy backend e2e/api scripts.
- Stripe/Chapa payment webhooks end to end (no provider test keys locally); F-C2 and the refund findings rest on code and type evidence.
- The two remaining showroom-builder E2E failures in the production build ("scratch publish", "back button") were not root-caused: the trace shows an RSC fetch failure, a full reload, then a redirect to `/login` and an error boundary respectively.
- Deployment-specific claims (Vercel IP forwarding, live Render env vars) are inferred from repository config only.
