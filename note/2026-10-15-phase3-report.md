# Phase 3 report: audit fixes (2026-10-15)

Follows [2026-10-15-phase1-summary.md](2026-10-15-phase1-summary.md) (project
understanding, doc-vs-code gaps, owner questions) and
[2026-10-15-codebase-audit.md](2026-10-15-codebase-audit.md) (F-C / F-H IDs).

## Where the work is

- **Branch:** `claude/phase2-audit-fixes`, cut from `11493fd` (the tip of
  `codex/launch-scope-partnership-audit`).
- **Worktree:** `C:\Users\Administrator\Desktop\app\pro-v1-phase2`. Its
  `node_modules` are junctions to the main checkout's.
- **Your 77 uncommitted changes were not touched.** None of the fixed files
  overlap them. `tierLimit.ts` does overlap, so it was left alone.
- **Status:** 5 commits, local only, not pushed, no PR.

| Commit | Content |
|---|---|
| `589da18` | Referral rewards, verification requests |
| `d9ee878` | Maps column names, newest chat messages |
| `fee592a` | Review integrity, login return-path validation |
| `29d5fae` | CI frontend tests, CI injection hardening, deploy cancel, scorecard, env templates |
| `63b6918` | Presence visibility, no-Redis presence broadcast |

## How fixes were verified

Each fix was checked three ways:

1. **New regression tests.** They fail on the old code and pass on the new.
2. **Live probe.** A throwaway local Postgres (embedded, port 55432, all
   migrations run) and the branch backend on port 3021. Hosted databases
   were never used.
3. **Browser check** where the fix is user-facing (built frontend on 3022).

Final gates on the branch:

| Gate | Result |
|---|---|
| Backend `tsc --noEmit` | pass |
| Backend Jest | 435 passed, 2 failed. Both failures already fail at the base commit: `demoUploadIsolation`, `orderStatusMigration`. Your uncommitted work edits both. |
| Frontend lint / `tsc --noEmit` / Vitest | pass / pass / 169 of 169 |
| Frontend production build | pass with `next build --webpack`. Turbopack refuses the junctioned `node_modules` in the worktree (a setup limit, not a code problem); CI builds with Turbopack. |

## Issues fixed

| ID | Severity | File / location | Problem | Fix | Verification |
|---|---|---|---|---|---|
| N4 | Medium | `backend/routes/referral.ts` | Wrong column names (`amount`/`description` vs `points`/`reason`) gave 500s. The promised 20/50 points were never awarded. The stats join double-counted. `referral_link`/`total_referred` were never returned. | Real columns. Award 50 to the referrer and 20 to the referee in one transaction, and update `user_profiles.points`. Separate aggregates. Return the fields the page reads. | 6 of 7 new tests fail on old code. Live: 50/20 points, duplicate 409, self 404. Referral page shows the code and link in the browser. |
| N7+ | High (worse than first logged) | `backend/routes/verification.ts` | The frontend calls `GET /api/verification/status`, which didn't exist. `POST` dropped `selfie_url`/`id_document_url`, which are NOT NULL, so every request failed. A re-request after a decision hit `UNIQUE(user_id)`. | Added `/status` in the shape the component reads. Store and validate both URLs. A resolved request re-opens the same row. | New tests. Live: status, 400 without URLs, 201, 409 while pending, re-request after rejection gives 201. |
| F-H3 | High | `backend/routes/maps.ts:75,124` | Selected `name`/`category`/`logo_url`/`address` from `businesses`, which uses `business_*` columns, so 500s. | Real columns, with aliases that keep the response fields. | Live: old code 500, now 200 with names and addresses. Tests pin the column names. |
| F-H4 | High | `backend/routes/messages.ts:198` | Fetched the oldest N messages, so long chats never showed recent ones. An invalid `before` or `limit` gave 500. | Take the newest N (before the cursor), return them oldest-first. 422 for an invalid `before`; default limit when the value is invalid. | Live with 205 messages: was msg 1–200, now msg 6–205; paging back gives 1–5. Bad cursor 500 → 422. |
| N5 | Medium | `backend/routes/reviews.ts:50` | Sellers could review their own products. `order_id` wasn't checked. Fractional ratings returned 500. | 403 for self-review. `order_id` must be the reviewer's order for that product. Ratings must be integers 1–5. 404 for an unknown product. | New tests. Live: 403, 400, 400, 201, and the averages update. |
| N6 | Medium | `frontend-next/views/Login.tsx:20`, `app/choose-mode/page.tsx`, `proxy.ts` | The `return` check let `/\evil.com` and `/%09/evil.com` through. Browsers resolve both to `evil.com`, confirmed with the WHATWG URL parser. | New `lib/safeReturnPath.ts` resolves against a fixed origin, used in all 3 places. | 9 unit tests. Proxy: unsafe `return` dropped, `/wallet` kept. Browser: logging in with `return=/\evil.example` lands on `/feed`. |
| Presence | Medium | `backend/routes/messages.ts` presence routes, `backend/socket.ts` `emitPresenceUpdated` | `presence_visibility='nobody'` was ignored. Without Redis (production) every presence change was broadcast to every socket. | GET hides status from others. PUT skips the fan-out for "nobody". The no-Redis path targets followers from the DB. | New tests. Live with real sockets: follower 1 / stranger 0; with "nobody" 0 / 0 and others see hidden; the user still sees their own status. |
| N11 | Low | `.github/workflows/ci.yml` | Vitest never ran in CI. | New `frontend-tests` job on Node 24 (Vitest 5 and jsdom need Node 22+). The build job stays on Node 20. | YAML parses. The suite passes locally (169). Not yet run on GitHub. |
| N14 | Low | `.github/workflows/ci.yml` check-skip | Commit message and author were interpolated into bash. | Passed through `env:` instead. | YAML parses. Not yet run on GitHub. |
| N8 (part) | Medium | `.github/workflows/deploy.yml` | `cancel-in-progress: true` could kill the migrate job halfway through. | `false`: a newer deploy queues. | YAML parses. |
| N15 | Low | `backend/lib/scorecard.ts:47`, `views/Scorecard.tsx` | Queried a table that doesn't exist, so it always said "0 migrations applied". | Reports "unknown: no ledger" (`null` / "—"). | Run against the local DB. |
| N13 | Low | `frontend-next/.gitignore` | `.env*` kept `.env.example` and `.env.local.example` out of git. | Whitelisted. Both files committed; they contain placeholders only. | `git check-ignore`; secret scan of both files. |

## Not fixed, and why

| ID | Severity | Item | Reason |
|---|---|---|---|
| N1 | High | Admin lockout (`migrate39.js` marks `admin@nodbusiness.app` as demo) | Needs your answer: is that a real admin? (Q2) |
| N2 | High | Account delete / data export | Needs a decision: hard delete or anonymize, and retention rules (Q3) |
| N3 | High (plausible) | Rate limits probably shared through Vercel's egress IP | Needs production headers or logs to confirm before changing `trust proxy` (Q10) |
| N9 | Medium | `tierLimit` caches a null business; `LIMIT 1` with no ORDER BY | `tierLimit.ts` has your uncommitted edits; fixing it here would conflict |
| N10 | Medium | DNS-rebinding window in the external-API proxy | A clean fix needs the `undici` package (a download) or rewriting the Patent 4 transport that its resilience tests rely on. Your call. |
| N8 (rest) | Medium | Deploy never migrates the Demo DB | Deliberately manual and guarded (`ALLOW_DEMO_MIGRATIONS`). Automating it is an ops decision. |
| N12 | Low | Image optimizer allows any HTTPS host | Restricting hosts could break user media from storage domains we can't list. Product call. |
| N16 | Low | Frontend `strict` off (834 errors under strict) | Large and mechanical; not a defect fix. |
| F-H5 | High | Builder can load blank defaults over a published site | The builder files are heavily modified in your uncommitted work |
| F-C1–F-C3, F-H1, F-H2, F-H6, F-H7 | Critical/High | — | Already fixed on `claude/affectionate-dhawan-af0eab` and `claude/festive-shamir-9e140a` (local, not pushed) |
| F-H8, F-H9 | High | Paid features without a tier check; security controls that depend on Redis | Tier gating needs the pricing decision (Q5). F-H9 depends on whether Redis is configured in production (Q10). |
| Referral farming | Low | Any existing account can apply a code once | Restricting it to new accounts is a product rule |

## Feature status after this branch

| Feature | Status |
|---|---|
| Auth (register, OTP, login, Google, refresh) | Partial: F-H1 (fixed on another branch), N1, N3, F-H9 |
| Profiles, feed, posts, friends, search, notifications | Working |
| Maps / nearby | **Working** (was broken) |
| Chat | **Partial → mostly working**: newest messages and presence privacy fixed; F-H7 fixed on another branch |
| Reviews | **Working**: self-review and fake `order_id` blocked; purchase still not required |
| Referral and points | **Working** for earning; points still can't be redeemed anywhere |
| Verification badges | **Working** (was broken end to end) |
| Orders, commission, subscriptions | Partial: F-C1–F-C3 on another branch; F-C2 needs Stripe test keys to verify |
| Wallet, returns/refunds, seller payouts | Partial: settlement model undecided (Q4) |
| Showroom builder | Partial: F-H5 |
| Business webhooks and API keys | Missing behaviour: never emitted, keys authenticate nothing |
| Account delete / export | Broken: N2 |
| External-API proxy | Working; N10 open |

## Doc mismatches

All doc-vs-code gaps are in Phase 1 §5. This branch updated
`docs/backend/API.md` (Referral and Verification sections). It did not
regenerate `docs/backend/API_REFERENCE.md`: regenerating from this branch
would rewrite line numbers that came from your uncommitted auth work, and the
`docs-sync` workflow regenerates it after merge anyway.

## Risks and next steps

1. **Merge order.** This branch, the two earlier fix branches and your 77
   uncommitted changes all diverge from `11493fd`. Commit or land your
   in-progress work first, then rebase these three branches on it.
2. **CI unverified.** The new CI job and deploy settings only run on GitHub.
   Watch the first run after pushing.
3. **Open questions.** The 13 owner questions in Phase 1 §7 block N1, N2,
   N3, F-H8, F-H9 and the doc corrections.
4. **Untested paths.** Stripe/Chapa webhooks still haven't been tested end
   to end; that needs provider test keys.
