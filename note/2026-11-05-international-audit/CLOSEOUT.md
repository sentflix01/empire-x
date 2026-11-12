# Nodbusiness audit — close-out report

**Date:** 2026-11-08 · **Audit:** 2026-11-05 → 06 (`REPORT.md`) · **Fixes:** PRs #178, #179, #180 (merged and deployed; deploy run #527 green)
**Production check:** 39 of 39 read-only checks passed on 2026-11-08 (`evidence/prod-verify-2026-11-08.json`, script `scripts/prod-verify.cjs`)

> **Update 2026-11-11:** a re-audit to the full 13-phase prompt is in [`REAUDIT-2026-11-11.md`](REAUDIT-2026-11-11.md): GO WITH CONDITIONS, 16 new findings (1 High).

---

## 1. Verdict

**Was:** NO-GO for international public launch; GO WITH CONDITIONS after eight "before launch" items.
**Now:** **GO WITH CONDITIONS.** All engineering items before launch are done and verified. Three conditions remain, and only the owner (or counsel) can close them:

| # | Condition before public launch | Finding | Who |
|---|---|---|---|
| 1 | Set `PRIVATE_SUPABASE_BUCKET` on Render, then run the verification-document move script (dry run first). Until then existing identity documents stay at their old public URLs. | F-013 | Owner |
| 2 | Move the API off the free plan (or keep it warm) and add an external uptime alert. | F-030 | Owner |
| 3 | Counsel confirms the data-protection proclamation number and obligations. | F-054 | Counsel |

Recommended within 30 days: set `MFA_ENCRYPTION_KEY` and have every admin turn on two-factor sign-in (F-017); make the E2E check required and turn on GitHub secret scanning with push protection (F-032, F-024); add the Refund Policy (F-055).

## 2. In numbers

| | |
|---|---|
| Findings | 57: 45 issues, 12 positive |
| Fixed | **35** fixed, plus **5** fixed with an owner step pending |
| Partly done | 3: F-052 (strict TypeScript: backend and frontend lib/hooks done; components and views to follow), F-055 (Refund Policy wording needed; statement, licence, OpenAPI and docs freshness done), F-029 (TLS and email DNS not checkable from here) |
| Open | 2: F-030 (hosting plan, owner), F-053 (intermittent test, cause not found) |
| Tests in CI (all blocking) | Backend 759 unit + 315 database · frontend 560 unit · E2E Chromium journeys · two-person messaging on phone, iPhone, iPad and desktop · secret scan · dependency audit (no ignores) · colour-token guard |
| Production (read-only, guest) | 39 / 39: API health and error shapes, security headers and CSP, routing, service worker, accessibility statement, reflow at 320 px, colour tokens, axe WCAG 2.2 AA on 8 public pages in light and dark (0 violations) |

## 3. The original "before launch" list

| Item | Findings | Status |
|---|---|---|
| Verification documents private; delete files on erasure | F-013, F-014 | Done in code and tests · **owner must set the bucket and move existing files** |
| Stop the Bookmarks request loop | F-040 | Done |
| Product photo upload and the other missing routes | F-001–F-006 | Done; F-005/F-006 routes checked on production |
| API outage, hosting plan, uptime alert | F-030 | **Open (owner).** The API answered in 707 ms, then 178 ms today |
| Tokens out of logs and Sentry | F-015 | Done |
| Service worker | F-048 | Done; checked on production |
| Contrast, skip link, unnamed controls | F-041–F-043, F-035 | Done; axe clean on production, light and dark |
| Tour default; compliance wording | F-031, F-054 | Tour decided by owner; docs corrected · **counsel to confirm the law number** |

## 4. Every finding

| ID | Severity | Finding | Status (2026-11-08) | Evidence |
|---|---|---|---|---|
| F-001 | High | Product photos cannot be uploaded: frontend calls a missing /api/upload/multiple route | Fixed | Tests in CI |
| F-002 | Medium | AI product description button calls a missing route and shows a developer message to users | Fixed | Tests in CI |
| F-003 | Medium | Delivery timeline uses wrong API paths, so tracking never loads or saves | Fixed | Tests in CI |
| F-004 | Low | Name change calls a missing route and silently ignores the failure | Fixed | Tests in CI |
| F-005 | Low | Telegram notification toggle calls a missing route | Fixed | Production check passed |
| F-006 | Low | Admin DevOps console calls 11 routes the backend does not have | Fixed | Production check passed |
| F-007 | Low | Authentication errors do not follow the documented error shape | Fixed | Production check passed |
| F-008 | Low | Engineering docs describe controls that no longer match the code | Fixed | Docs updated |
| F-009 | Medium | No migration ledger: CONTRIBUTING describes schema_migrations, which does not exist | Fixed | Tests in CI |
| F-010 | Info | Positive: local seed and admin tools refuse non-local databases | Positive — keep | No change needed |
| F-011 | Info | Positive: generated API reference matches the live routers | Positive — keep | No change needed |
| F-012 | Low | Guests are not redirected from product builder pages at the edge | Fixed | Production check passed |
| F-013 | High | Identity documents and selfies are stored at public, non-expiring URLs | Fixed — owner step pending: Set PRIVATE_SUPABASE_BUCKET on Render, then run the verification-document move script (dry run first) | Tests in CI |
| F-014 | Medium | Deleting an account or content never deletes the stored files | Fixed | Tests in CI |
| F-015 | Medium | Guest order access tokens are written to logs and error tracking | Fixed | Tests in CI |
| F-016 | Medium | Frontend content policy allows inline scripts in production | Fixed | Production check passed |
| F-017 | Medium | Password policy has no common-password check and MFA is unavailable | Fixed — owner step pending: Set MFA_ENCRYPTION_KEY on Render; each admin turns on two-factor sign-in | Tests in CI |
| F-018 | Low | Revoked access tokens stay valid while Redis is unavailable | Fixed | Tests in CI |
| F-019 | Low | Public Chapa verify route changes order state from a guessable reference | Fixed | Production check passed |
| F-020 | Low | Sandbox payment pages place an unchecked return_url into page script (non-production) | Fixed | Tests in CI |
| F-021 | Low | Dependency-audit ignore list is stale and one justification is inaccurate | Fixed | Tests in CI |
| F-022 | Low | Workflows lack least-privilege token permissions and SHA-pinned actions | Fixed | Workflow settings in effect on every CI run |
| F-023 | Low | Some public endpoints return internal data or lack specific rate limits | Fixed | Production check passed |
| F-024 | Low | No secret scanning in CI; stop-gap history scan found no live secrets | Fixed — owner step pending: Turn on GitHub secret scanning and push protection | Tests in CI |
| F-025 | Info | Positive: one-time codes, reset tokens and passwords are handled to a high standard | Positive — keep | No change needed |
| F-026 | Info | Positive: object-level access checks hold in code review and live two-account tests | Positive — keep | No change needed |
| F-027 | Info | Positive: webhooks, internal jobs, sandbox gates and guest order tokens are well protected | Positive — keep | No change needed |
| F-028 | Info | Positive: no third-party requests or cookies before sign-in on public pages (local) | Positive — keep | No change needed |
| F-029 | Info | Production passive checks: frontend verified; API, TLS and email DNS not verifiable | Partly verified — API and frontend checked on production; TLS and email DNS not checked from here | — |
| F-030 | High | Production API did not respond for at least seven minutes | Open — owner: hosting plan and external uptime alert (API answered today: see production checks) | API answered /health in 707 ms, then 178 ms (2026-11-08) |
| F-031 | Medium | Guided tour opens over every page for new visitors; its default contradicts the flag docs | Fixed | Tests in CI |
| F-032 | Medium | Most journey tests never run in CI and 20 of 51 fail on a clean local stack | Fixed — owner step pending: Make the E2E check required on main | Tests in CI |
| F-033 | Low | A product with no business is accepted but invisible to everyone else | Fixed | Tests in CI |
| F-034 | Medium | Malformed input returns 500 errors instead of 400/404 | Fixed | Production check passed |
| F-035 | Low | Email verification code field has no accessible name | Fixed | Tests in CI |
| F-036 | Low | Unknown URLs send guests to sign-in instead of a 404 page | Fixed | Production check passed |
| F-037 | Info | Positive: order journey is correct and safe end to end (24/24 checks) | Positive — keep | No change needed |
| F-038 | Info | Positive: two-person messaging works live on desktop and phone (10/10) | Positive — keep | No change needed |
| F-039 | Info | Positive: self-service data export and account deletion work (9/10; files: F-014) | Positive — keep | No change needed |
| F-040 | High | Bookmarks page requests /api/saves in an endless loop for users with no bookmarks | Fixed | Tests in CI |
| F-041 | Medium | Brand amber and gold text fail colour contrast across most pages | Fixed | Production check passed |
| F-042 | Medium | Skip link goes nowhere and several pages lack a main landmark or heading | Fixed | Tests in CI |
| F-043 | Medium | Unnamed buttons, links and fields, and nested interactive controls | Fixed | Production check passed |
| F-044 | Low | Small reflow, target-size and forced-colours gaps | Fixed | Production check passed |
| F-045 | Medium | Mobile load is slow: 1 MB intro video on every page, up to 4 s splash, heavy JavaScript | Fixed | Tests in CI |
| F-046 | Medium | Design tokens are bypassed widely and the brand colour is inconsistent | Fixed | Production check passed |
| F-047 | Low | Landing page and menu still promote wallet and payments the platform no longer offers | Fixed | Production check passed |
| F-048 | Medium | Service worker never installs, so push notifications and offline support cannot work | Fixed | Production check passed |
| F-049 | Info | Positive: keyboard operation, motion preferences and page structure basics are sound | Positive — keep | No change needed |
| F-050 | Info | Positive: API stays error-free under local load up to 200 concurrent clients | Positive — keep | No change needed |
| F-051 | Medium | Money-path code lacks tests where CONTRIBUTING.md requires them | Fixed | Tests in CI |
| F-052 | Low | Unused and undeclared packages; TypeScript strict mode off | Partly — unused packages removed; strict TypeScript on for the backend and frontend lib/ and hooks/; components/ and views/ to follow | production check passed |
| F-053 | Low | A frontend unit test file fails intermittently in the full parallel run | Open — cause not found; capture the full error on the next CI failure (TD-025) | — |
| F-054 | Medium | Compliance docs claim 'Compliant' and may cite the wrong Ethiopian law number | Fixed — owner step pending: Counsel confirms the data-protection proclamation number and obligations | Docs updated |
| F-055 | Low | No accessibility statement, licence file or OpenAPI spec; most docs undated | Partly — statement, licence, OpenAPI file and docs freshness check done; Refund Policy needs owner/counsel wording | production check passed |
| F-056 | Info | Positive: all required quality gates pass and the schema enforces integrity | Positive — keep | No change needed |
| F-057 | Medium | Map labels insert product, business and user names as HTML (stored XSS) | Fixed | Tests in CI |

## 5. What the production check covered, and what it could not

- **Covered:** guest pages and anonymous API requests only (GET/HEAD; no sign-in, no forms, no payments), as agreed for production.
- **Not covered on production:** signed-in journeys (tested in CI against a real backend and database instead), product images (this environment cannot reach the storage host), TLS configuration and email DNS (F-029).
- **Still open from the original scope:** Firefox; Safari/iOS beyond the messaging suite, which now runs on iPhone and iPad emulation in CI; real Android/iOS hardware; screen-reader output; production load and soak tests.

## 6. Where things are

- What was found: `findings/`, `SUMMARY.md`, `REPORT.md` (unchanged, historical).
- What was done: `FIXES.md` (one row per fix, with tests), `project-brain/DECISIONS.md`.
- Production evidence: `evidence/prod-verify-2026-11-08.json`; regenerate this table with `python3 -I scripts/closeout-table.py`.
