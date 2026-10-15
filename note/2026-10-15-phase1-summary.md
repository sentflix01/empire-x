# Phase 1 summary: project understanding (2026-10-15)

Temporary investigation note (per AGENTS.md). Companion to
[2026-10-15-codebase-audit.md](2026-10-15-codebase-audit.md), which holds the
earlier E2E run and the F-C / F-H finding IDs referenced below. No code was
changed in Phase 1.

## Coverage

Read in full: every doc under `docs/` (product, architecture, backend,
frontend, operations, decisions, infrastructure, support, finance, growth,
brand, trust & safety, compliance, legal, patent, people, investor, strategy),
root docs, `project-brain/`, all `.kiro/specs` and `implementation plan/`,
`note/`, all 5 CI workflows, root/backend/frontend configs and env templates,
backend libs, services, middleware, and the routes and frontend files tied to
each finding.

Not read file by file (stated so this is not overclaimed):
- `docs/Production/` (408 files) and `docs/log-report/` (401 files) are
  machine-generated. They were checked through the generator
  (`scripts/production-docs-sync.cjs --check`: 23 pending changes, all from
  uncommitted branch work) plus spot reads.
- Frontend views and components were exercised through the earlier
  Playwright run (46/49), not reviewed line by line one at a time.
- `note/SHOWROOM_TEMPLATE_RECOMMENDATIONS.md`: summary, structure and sample
  entries (it is a 112-item product idea list).

## 1. Goal and target users

Nodbusiness is a "global superapp" aimed first at Ethiopia. Its launch scope
(docs/product, POST_LAUNCH_FEATURES):

- Local merchants build a mini-website ("Showroom", guided builder with
  templates), list products, and receive orders.
- Customers discover nearby businesses and products, then order (Chapa ETB,
  Stripe, or cash on delivery).
- Profile owners and creators earn commission through profile partnerships.

North-star metric: Weekly Transacting Pairs. Deferred features: Mewacho,
tasks, courses, jobs and events. Their backend routes are no longer mounted.

## 2. Stack and architecture

| Layer | Actual (from code/config) |
|---|---|
| Backend | Express 5.2.1, TypeScript (TS 6, run via tsx in dev, `dist/` in Docker), `pg` pool, AsyncLocalStorage selecting Real vs Demo DB, Socket.IO, BullMQ (producers/workers off by default), optional Redis (no-op fallback), Stripe 23, Chapa, Supabase Storage then R2, Resend email, web-push, Telegram, AI via OpenAI/Gemini/Anthropic |
| Frontend | Next.js 16.3 (`proxy.ts` edge guard), React 19.3, Tailwind 4, Radix/shadcn, Zustand store **and** AuthContext/CartContext, TanStack Query (barely used), i18next (en, am), Leaflet |
| Auth | 15-min access JWT in memory; 7-day refresh JWT in HttpOnly cookie; `nb_auth` hint cookie; Google ID-token sign-in; OTP email verification |
| Data | PostgreSQL (Supabase, eu-west-1 pooler), 51 `migrate*.js` files re-run on every deploy (no ledger table) |
| Hosting | Render free plan (Docker backend), Vercel Hobby (frontend, `/api/*` rewritten to Render), Supabase. `render.yaml`: Chapa on, Stripe off, no `REDIS_URL` |
| CI/CD | `ci.yml` (backend tsc + migrate + jest; frontend lint + tsc + build; npm audit), `deploy.yml` (on green CI: migrate prod DB, Render hook, Vercel), `docs-sync.yml` (bot commits generated docs to main), keep-alive, manual migrate |

## 3. Core features and status

| Feature | Status | Evidence |
|---|---|---|
| Register / OTP / login / Google / refresh / logout | Working, with gaps | F-H1 pre-hijack; F-H9 revocation no-op without Redis; admin lockout (below) |
| Personal + business profiles, profile edit, colour theme | Working | specs verified in code |
| Feed, posts, comments, likes, polls, hashtags, stories | Working | E2E |
| Friends, suggestions, search | Working | suggestion score is 3-factor, not the "four-factor" patent claim |
| Marketplace, products, variants, cart, wishlist | Partial | F-H2 any user can edit/delete any variant |
| Orders, Stripe/Chapa checkout, COD, commission | Partial | F-C1/F-C2 subscription webhooks; F-C3 commission charged twice |
| Reviews | Working, weak integrity | no verified-purchase check, seller can review own product, `order_id` unverified |
| Returns | Partial | approval records no refund (`refund_processed:false`); docs say it refunds |
| Wallet | Partial | ledger only; withdraw debits immediately, payout is manual; no seller proceeds credit |
| Showrooms / builder / templates / QR | Partial | F-H5 editing published site can load blank defaults |
| Showroom external API proxy (Patent 4) | Working | SSRF guard solid; DNS-rebinding window remains; quotas off without Redis |
| Messaging, groups, real-time | Partial | F-H4 newest messages missing; F-H7 forward leaks any message; presence privacy ignored |
| Notifications, push, Telegram | Working | |
| Maps / nearby | Broken | F-H3 queries non-existent columns |
| Business subscriptions, tiers | Partial | F-C1/F-C2; F-H8 paid features unchecked; `tierLimit` caches null business for 5 min and uses `LIMIT 1` without ORDER BY |
| Business webhooks / API keys | Missing behaviour | webhooks never emitted; keys authenticate nothing; F-H6 cannot revoke |
| Referral / points | Broken | wrong column names → 500; promised 20 points never granted; points unredeemable |
| Account delete / data export | Broken / missing | `DELETE /api/auth/me` does not exist; export returns only the account row |
| Verification requests | Partial | re-submitting after a decision hits a UNIQUE constraint → 500 |
| Demo workspace (Track 2) | Working, ops gap | pipeline never migrates the Demo DB |
| Admin, DevOps console, scorecard | Working, with gaps | admin lockout; scorecard reads a `schema_migrations` table that does not exist |
| AI assistant | Working when a key is set | |

## 4. New findings this pass (beyond F-C1..F-H9)

| # | Severity | Finding | Where |
|---|---|---|---|
| N1 | High | `admin@nodbusiness.app` is forced to `is_demo=TRUE` on every migration run; login then returns 403 `LEGACY_DEMO_ACCOUNT` | `backend/db/migrate39.js`, `backend/routes/auth.ts:696,830` |
| N2 | High | Settings "Delete account" calls a route that does not exist; "Export data" returns only the account row, while the shipped Service Agreement promises both | `frontend-next/views/PrivacyAndSecurity.tsx:132-152`, `backend/routes/auth.ts:848` |
| N3 | High (plausible, needs prod check) | Rate limits are probably keyed on Vercel's egress IP, so all users share login/register/OTP buckets | `frontend-next/api/client.ts:17` (same-origin), `next.config.ts` rewrite, `backend/index.ts:63` (`trust proxy 1`) |
| N4 | Medium | Referral feature fully broken (column mismatch, no points, double-counting join) | `backend/routes/referral.ts` vs `backend/db/migrate2.js:234` |
| N5 | Medium | Reviews: no verified purchase, self-review possible, `order_id` not validated | `backend/routes/reviews.ts:50` |
| N6 | Medium (plausible) | Open redirect after login: the `return` check allows `/\evil.com` | `frontend-next/views/Login.tsx:20` |
| N7 | Medium | Verification re-request → 500 (UNIQUE `user_id`) | `backend/db/migrate13.js`, verification route |
| N8 | Medium | Deploy migrates the Real DB only, never the Demo DB; `cancel-in-progress` can cancel a running migration | `.github/workflows/deploy.yml` |
| N9 | Medium | `tierLimit` caches a null business for 5 minutes; multi-business owners get an arbitrary business | `backend/middleware/tierLimit.ts` |
| N10 | Medium | DNS-rebinding window: SSRF check and fetch resolve DNS separately | `backend/services/ssrfValidator.ts`, `proxyGateway.ts:239` |
| N11 | Low | Frontend Vitest suite is not run in CI | `.github/workflows/ci.yml` |
| N12 | Low | Image optimizer accepts any HTTPS host (`hostname: "**"`) | `frontend-next/next.config.ts` |
| N13 | Low | Frontend `.env.example` files are git-ignored by `.env*`, so a fresh clone has no template | `frontend-next/.gitignore` |
| N14 | Low | CI `check-skip` interpolates commit text straight into bash | `.github/workflows/ci.yml` |
| N15 | Low | Scorecard queries non-existent `schema_migrations` | `backend/lib/scorecard.ts` |
| N16 | Low | Frontend `strict` is off (834 errors under strict), though the spec task is ticked done | `frontend-next/tsconfig.json` |

## 5. Docs vs code (main gaps)

1. **Secrets in tracked docs:** `DEPLOYMENT_VARIABLES.md` and
   `docs/infrastructure/DEPLOYMENT_GUIDE.md` contain concrete JWT_SECRET,
   OTP_SALT, EXTERNAL_API_ENCRYPTION_KEY and VAPID values. The repo is private.
   The local `.env` JWT does not match them, and production cannot be checked
   from here.
2. **Compliance, legal and investor claims not backed by code:**
   - "GDPR compliant": the DSR endpoints listed don't exist, and the named DPA
     vendors aren't used.
   - MFA, SOC2 and PCI evidence, encrypted DMs, verified-purchase reviews: none
     present in code.
   - Patents: "4 provisionals filed" vs FILING_TRACKER "NOT FILED", and the
     patent mapping cites files that don't exist.
   - Company: "PLC registered".
3. **Five different price tables:**
   - ToS: $19/$49/$99
   - MONETIZATION: ETB 299/999
   - CURRENT_STATE: $12/$49
   - Subscription spec: ETB 299/799
   - FINANCIAL_MODEL
4. **Downgrade policy:** ToS and FINANCIAL_CONTROLS say a failed payment
   leads to a downgrade. The code deletes the business on day 10.
5. **Age policy conflicts:** 18+, 16–17 with a guardian, and 13+ all appear.
6. **Money flow:**
   - SELLER_HANDBOOK promises proceeds in the wallet within 24–48h. The
     canonical currency doc says that credit is not built.
   - Commission: the docs say it's charged at completion; the code charges it
     at payment and again at completion.
7. **Stale infrastructure docs:**
   - The Oracle / Coolify / Cloudflare Pages / Neon / Railway setup is
     described as current.
   - Redux, Zod, `/api/v1`, Prometheus and Redis-backed rate limiting are
     described but not present.
   - Test and migration counts are out of date.
8. **External-API spec vs code:** decision docs say "never serve stale
   data". The code deliberately serves stale cache and has a circuit breaker
   (Patent 4, 2026-08-23).
9. **Spec checkboxes:**
   - gap-fixes and friends-tab are implemented but unchecked.
   - professional-grade 7.1 is checked but not done.
   - `implementation plan/` duplicates `.kiro/specs` with conflicting states.
10. **Pooler config:** `render.yaml` says transaction pooler on 6543. The
    production env template and the latest commit say session pooler on 5432.

## 6. Repo hygiene observed

- **Uncommitted work:** the current branch `codex/launch-scope-partnership-audit`
  has 76 uncommitted changes that predate this audit. Phase 2 fixes must not
  overwrite them; use separate branches.
- **Unpushed fix branches:** two fix branches from earlier sessions exist
  locally, not pushed:
  - `claude/affectionate-dhawan-af0eab`: F-C1–F-C3
  - `claude/festive-shamir-9e140a`: F-H1, F-H2, F-H6, F-H7
- **Untracked items that look out of place:**
  - `not reference.md` (695 KB) belongs to an unrelated client project.
  - `.codex-release/` is a nested git checkout.
  - `.playwright-mcp/`
  - Empty `frontend-next/app/(app)/{courses,events,jobs,mewacho,tasks}`
    folders.

## 7. Questions for the owner before Phase 2

1. **Secrets:** were the values in `DEPLOYMENT_VARIABLES.md` and
   `DEPLOYMENT_GUIDE.md` ever used in production? If yes, rotate them. Should
   I redact them from the docs either way? Git history keeps them.
2. **Admin identity:** is `admin@nodbusiness.app` a real admin? (Fixing N1
   means removing it from `migrate39.js`.)
3. **Account deletion and export (N2):** hard delete or anonymize? What
   retention applies to orders and financial records?
4. **Settlement model:** does the platform hold buyer funds and credit
   sellers, or do sellers get paid directly? This drives commission timing
   (F-C3), returns/refunds and the wallet.
5. **Subscriptions:** Stripe or Chapa? And which price table is canonical?
6. **Failed-payment policy:** downgrade (as the docs say) or delete on day 10
   (as the code does)?
7. **External-API stale cache:** keep the Patent 4 behaviour and update the
   decision doc, or follow the decision doc?
8. **Age policy:** 18+, 16+ with a guardian, or 13+?
9. **Inaccurate compliance, investor and patent docs:** mark them as
   drafts/aspirational, correct them, or leave them for you?
10. **Redis in production:** is `REDIS_URL` set in the Render dashboard? This
    decides whether F-H9 is live. Also, can I check N3 against the
    production logs or headers?
11. **Fix branches:** push the two earlier fix branches and open PRs?
12. **Untracked files:** may I add `not reference.md`, `.codex-release/` and
    `.playwright-mcp/` to `.gitignore` (without deleting them)?
13. **Vercel Hobby:** Hobby doesn't allow commercial use and Chapa is live.
    Is an upgrade planned?
