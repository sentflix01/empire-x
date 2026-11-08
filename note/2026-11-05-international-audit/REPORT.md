# Nodbusiness — International-Grade Audit Report

**Audit period:** 2026-11-05 → 2026-11-06 · **Repository:** `sentflix01/empire-x` (branch `claude/charming-lamport-n3ppii`, base `b9877bd`)
**Mode:** audit only; no product code was changed · **Findings:** 56 (machine-readable in `findings/`, table in `SUMMARY.md`)

> **Update 2026-11-08:** the fixes are merged and deployed. Current status, the remaining launch conditions and production evidence are in [`CLOSEOUT.md`](CLOSEOUT.md). This report is kept as written on 2026-11-06.

---

## 1. Executive summary

### Verdict: **NO-GO** for international public launch today → **GO WITH CONDITIONS** once the eight "before launch" items in §7 are done.

The foundations are stronger than most products at this stage: every required CI gate passes (661 backend unit tests, 212 database tests, 478 frontend tests, typecheck, lint, build); access control held in code review and live two-account tests; the order journey passed 24 of 24 correctness and abuse checks; payments webhooks, one-time codes and guest order links are built to a high standard; no third-party trackers load before sign-in.

What blocks launch is a short list of concrete defects, each small to medium to fix:

| # | Top risk | Findings | Why it matters |
|---|---|---|---|
| 1 | **Identity documents and selfies are publicly reachable by URL, and are never deleted** | F-013 (High, CVSS 8.2), F-014 | Government IDs of verified users are exposed to anyone who obtains a link; erasure requests leave them online. Highest legal exposure. |
| 2 | **Production API was unreachable for at least 7 minutes** on a free hosting plan | F-030 (High) | Every signed-in feature depends on it; no external uptime alert caught it. |
| 3 | **Bookmarks page floods the API (~178 requests/s)** for users with no bookmarks | F-040 (High) | Trips the per-IP rate limit within ~3 s, locking that user — and everyone behind the same mobile-carrier IP — out of the whole app for 15 minutes. |
| 4 | **Sellers cannot attach product photos**; 16 frontend calls hit routes that do not exist; most journeys are not tested in CI | F-001 (High), F-002–F-006, F-032 | A core seller journey is broken and similar regressions reach production unnoticed. |
| 5 | **Guest order access tokens are written to logs and Sentry** | F-015 (Medium, CVSS 5.9) | Anyone with log access can open a guest's order, contact details and receipts. |

### Scores by area (0–100) and comparison with the big-platform bar

Scores weigh confirmed findings by severity against what was verified; areas with large unverified scope are capped and say so.

| Area | Score | vs. big-platform bar | Basis |
|---|---|---|---|
| Functionality | 55 | Falls short | Orders, messaging, deletion work; photo upload, delivery tracking, AI description, bookmarks broken (F-001–F-006, F-040) |
| UX & simplicity | 60 | Falls short | Clean forms and flows; auto-opening tours on every page, 4 s splash, developer text shown to users (F-031, F-045, F-002) |
| Accessibility | 55 | Falls short | Good keyboard and motion basics (F-049); contrast, skip link, unnamed controls (F-041–F-044, F-035) |
| Security | 70 | Approaches | Strong authN/authZ and webhooks (F-025–F-027); public ID documents (F-013), CSP inline scripts (F-016), no MFA (F-017) |
| Privacy | 55 | Falls short | No pre-consent tracking, self-service export/delete (F-028, F-039); F-013, F-014, F-015 |
| Performance | 60 | Falls short | CLS good; LCP 3.2–4.0 s mobile, 1 MB video on every page (F-045) |
| Scalability & reliability | 45 | Falls short | Error-free under local load (F-050); production outage, free plan, no migration ledger, broken service worker (F-030, F-009, F-048) |
| Legal compliance | 50 | Falls short | Legal pages exist; no accessibility statement, compliance doc overclaims, law number to confirm (F-054, F-055, F-047) — counsel |
| International readiness | 60 | Approaches | English + Amharic, ETB, Amharic and emoji data round-trip (F-037); no RTL; strings and locales not fully audited |
| Architecture & code | 75 | Approaches | Modular monolith, gates green, sound schema (F-056); strict mode off, unused packages, money-path test gaps (F-051, F-052) |
| Integrations | 65 | Approaches | Stripe/Chapa webhooks verified and idempotent (F-027); web push cannot work (F-048); Google sign-in not verifiable here |
| Documentation | 60 | Approaches | Large handbook, accurate API reference (F-011); stale and over-claiming pages (F-008, F-054, F-055) |
| Cross-device consistency | 60 | Approaches | Phone and desktop Chromium pass; 3 px overflow at 320 px (F-044); Safari/WebKit and real devices unverified |
| Motion & smoothness | 60 | Approaches | Reduced motion honoured (F-049); heavy splash/video; frame-rate profiling not done (unverified) |
| Design system & colour | 50 | Falls short | 39% of colour classes bypass tokens, split brand palette, contrast failures (F-046, F-041) |
| Content quality | 60 | Approaches | Plain, consistent copy; wallet/payments claims contradict the business model (F-047); developer message to users (F-002) |
| Code & repository hygiene | 70 | Approaches | Lint/typecheck clean, 2 ts-ignores; unused deps, flaky test, Vite leftovers (F-052, F-053, F-048) |

---

## 2. Scope and method

| Item | Detail |
|---|---|
| Environments | Local stack in the cloud sandbox (Postgres 16, Redis 7, backend dev runtime, frontend dev and production builds) for all active testing. Production: passive GET/HEAD only, two hosts, after owner approval and an environment allow-list. |
| Browsers / devices | Chromium (Playwright) desktop 1280–1440 px, 320/375/768 px viewports, Pixel 7 emulation, dark mode, forced colours, reduced motion. **Not available:** Firefox, Safari/WebKit, iOS/Android hardware, screen readers. |
| Tools | Playwright 1.64 (repo) and the preinstalled Playwright; axe-core 4.10.3; Lighthouse 12.8.2 (mobile, simulated throttling); depcheck 1.4.7; Python `cvss` (CVSS v4.0); custom scripts in `scripts/` (endpoint introspection, ownership scan, two-account and order-journey checks, history secret scan, load test). |
| Roles tested | Guest, member (two same-role accounts plus a third), seller with business, admin, guest buyer via private link. |
| Standards | OWASP Top 10:2025, ASVS 5.0 (L2; L3 for payment paths), OWASP API Top 10:2023, WCAG 2.2 AA / EN 301 549 V4.1.1, ISO/IEC 25010:2023, Core Web Vitals. |
| Out of scope / not done | Active testing of production; real payments; real email/SMS; load tests against production; legal opinions. |
| Unverified (and why) | Production TLS policy (sandbox proxy intercepts TLS), production API headers (API unreachable), email DNS (no tooling), Google sign-in (no client ID), WebKit/iOS/Android, screen-reader output, frame-rate profiling, full git history (shallow clone, 76 commits). See F-029. |

Evidence standard: every finding has evidence (file:line, request/response, tool output, screenshot) or is marked UNVERIFIED; secrets and personal data are never copied. All findings pass `scripts/validate-findings.mjs`.

## 3. Phase 1 inventory (summary)

Full detail: `inventory/README.md`.

- **Backend:** 51 route mounts, **354 endpoints** introspected from the live routers — 38 public, 37 optional sign-in, 240 sign-in, 39 admin. Documented reference matches (F-011).
- **Frontend:** 60 pages; 222 distinct `/api` paths called; **16 call routes that do not exist** (F-001–F-006).
- **Data:** 92 tables, 24 holding personal or sensitive data (names, emails, phones, addresses, coordinates, receipts, identity documents).
- **Third parties:** Stripe, Chapa, Resend/SMTP, Telegram, OpenAI/Gemini/Anthropic, Google OAuth and embeds, Sentry, Supabase, Cloudflare R2, OpenStreetMap tiles, Upstash Redis. No analytics or advertising tags.
- **Architecture (as built):** Next.js 16 on Vercel → same-origin `/api` rewrite → Express 5 on Render (single free instance) with Socket.IO and in-process schedulers → Supabase Postgres (Real, optional separate Demo), Upstash Redis (optional), object storage.

## 4. Findings

Complete table with severity, kind, area, CVSS and effort: **`SUMMARY.md`**. Each finding file (`findings/F-NNN.json`) carries standard references, location, steps, expected, actual, evidence, impact, fix and effort.

Critical 0 · High 4 · Medium 18 · Low 21 · Info 1 · Positive 12 · Unverified 1.

| ID | Severity | Title |
|---|---|---|
| F-001 | High | Product photos cannot be uploaded: frontend calls a missing route |
| F-013 | High | Identity documents and selfies are stored at public, non-expiring URLs (CVSS 8.2) |
| F-030 | High | Production API did not respond for at least seven minutes |
| F-040 | High | Bookmarks page requests `/api/saves` in an endless loop |
| F-002, F-003 | Medium | AI description and delivery tracking call wrong routes |
| F-009 | Medium | No migration ledger |
| F-014, F-015 | Medium | Files survive account deletion; order tokens in logs/Sentry |
| F-016, F-017 | Medium | CSP allows inline scripts; no common-password check or MFA |
| F-031 | Medium | Tours open over every page; default contradicts docs (owner decision) |
| F-032 | Medium | Most journey tests never run in CI |
| F-034 | Medium | Malformed input returns 500 on 14 of 22 ID routes |
| F-041–F-043 | Medium | Contrast, skip link and landmarks, unnamed controls |
| F-045, F-046 | Medium | Slow mobile load; design tokens bypassed |
| F-048 | Medium | Service worker never installs (push/offline broken) |
| F-051 | Medium | Money-path test gaps |
| F-054 | Medium | Compliance doc over-claims; law number to confirm |

## 5. Compliance checklists

Legend: PASS · FAIL · PARTIAL · N/A · UNVERIFIED (with reason). Legal items are for counsel to confirm.

### 5.1 WCAG 2.2 Level A/AA (pages listed in `evidence/wave4/a11y-scan.json`)

| SC | Result | Note |
|---|---|---|
| 1.1.1 Non-text content | FAIL | Map image, feed SVGs (F-043) |
| 1.2.1–1.2.5 Media | N/A | Brand video is muted and decorative |
| 1.3.1 Info and relationships | FAIL | Missing main landmarks/headings, unnamed inputs (F-042, F-043) |
| 1.3.2 Meaningful sequence | PASS | Tab order follows reading order on tested pages |
| 1.3.4 Orientation | PARTIAL | Manifest sets `"orientation": "portrait"` for the installed app |
| 1.3.5 Identify input purpose | PARTIAL | Checkout and OTP use `autocomplete`; not checked everywhere |
| 1.4.1 Use of colour | UNVERIFIED | Not systematically checked |
| 1.4.2 Audio control | PASS | No autoplaying audio |
| 1.4.3 Contrast (minimum) | FAIL | 123 elements, light and dark (F-041) |
| 1.4.4 Resize text | PARTIAL | Reflow tested; 200% text-only zoom not tested |
| 1.4.10 Reflow | FAIL | 16 page states overflow by 3 px at 320 px (F-044) |
| 1.4.11 Non-text contrast | PARTIAL | Buttons lose boundary in forced colours (F-044) |
| 1.4.12 Text spacing · 1.4.13 Content on hover | UNVERIFIED | Not run |
| 2.1.1 Keyboard · 2.1.2 No trap | PASS (sampled) | Login, register, landing, dialogs |
| 2.2.1 Timing adjustable | UNVERIFIED | Session/OTP timeouts not reviewed |
| 2.2.2 Pause, stop, hide | PARTIAL | Ticker stops under reduced motion; explicit pause control not verified |
| 2.3.1 Three flashes | UNVERIFIED | — |
| 2.4.1 Bypass blocks | FAIL | Skip link target missing on every page (F-042) |
| 2.4.2 Page titled · 2.4.7 Focus visible | PASS | All scanned pages; focus indicator at every stop |
| 2.4.3 Focus order | PASS (sampled) | — |
| 2.4.4 Link purpose | FAIL | 12 unnamed links (F-043) |
| 2.4.6 Headings and labels | PARTIAL | Public showroom has no h1 (F-042) |
| 2.4.11 Focus not obscured | UNVERIFIED | Sticky header/bottom bar not tested |
| 2.5.1–2.5.4 Pointer | UNVERIFIED | — |
| 2.5.7 Dragging | UNVERIFIED | Drag library declared but unused (F-052) |
| 2.5.8 Target size | FAIL | 8 targets < 24 px (F-044) |
| 3.1.1 Language of page | PASS | `lang="en"` everywhere |
| 3.1.2 Language of parts | UNVERIFIED | Amharic content not marked up `lang="am"` — not checked |
| 3.2.1–3.2.4 Predictable | UNVERIFIED | — |
| 3.2.6 Consistent help | PASS | AI assistant and guide launcher in the same place on all pages |
| 3.3.1/3.3.3 Error identification/suggestion | PARTIAL | Login and checkout give clear errors; not exhaustive |
| 3.3.2 Labels | PARTIAL | Checkout and auth forms labelled; product-create inputs not (F-043) |
| 3.3.7 Redundant entry · 3.3.8 Accessible authentication | UNVERIFIED | Password managers / paste not tested |
| 4.1.2 Name, role, value | FAIL | 16 unnamed buttons, OTP input, prohibited ARIA (F-043, F-035) |
| 4.1.3 Status messages | UNVERIFIED | Live regions present ("Notifications alt+T"); announcements not tested |

### 5.2 OWASP Top 10:2025

| Category | Result | Findings |
|---|---|---|
| A01 Broken Access Control | PARTIAL | F-013 (High); F-019; strong object-level checks F-026 |
| A02 Security Misconfiguration | PARTIAL | F-016, F-022, F-023; backend headers strong (F-028) |
| A03 Software Supply Chain | PARTIAL | F-021, F-022, F-024, F-052 |
| A04 Cryptographic Failures | PARTIAL | Secrets hashed well (F-025); OTP salt optional (F-017); TLS unverified |
| A05 Injection | PASS | Parameterized SQL, validated input; dev-only sandbox issue F-020 |
| A06 Insecure Design | PARTIAL | Order logic sound (F-037); F-019, F-023 |
| A07 Authentication Failures | PARTIAL | F-017, F-018; F-025 positive |
| A08 Software/Data Integrity | PASS | Webhook signatures and idempotency (F-027) |
| A09 Logging & Alerting | PARTIAL | F-015; no external uptime alert (F-030) |
| A10 Exceptional Conditions | FAIL | F-034, F-040 |

### 5.3 OWASP ASVS 5.0 (Level 2; Level 3 for payment paths) — chapter summary

| Chapter | Result | Notes |
|---|---|---|
| V1 Encoding & sanitisation | PASS (sampled) | F-020 dev only |
| V2 Validation & business logic | PASS | F-037; F-019 legacy |
| V3 Web frontend security | PARTIAL | F-016 |
| V5 File handling | FAIL | F-013, F-014 |
| V6 Authentication | PARTIAL | F-017 (L2 needs MFA availability) |
| V7 Session management | PARTIAL | F-018 |
| V8 Authorization | PASS | F-026 |
| V11 Cryptography | PARTIAL | F-017 OTP salt |
| V13 Configuration / secrets | PARTIAL | F-024 |
| V14 Data protection | FAIL | F-013, F-015 |
| V15 Secure coding & architecture | PARTIAL | F-021, F-052 |
| V16 Logging & error handling | PARTIAL | F-015, F-034 |
| Payment paths (L3) | PARTIAL | Webhooks and order state PASS; test gaps F-051 |

### 5.4 Privacy (counsel to confirm applicability and articles)

| Requirement | GDPR / UK GDPR | Ethiopia data-protection proclamation (number to confirm, F-054) |
|---|---|---|
| No non-essential tracking before consent | PASS (local, F-028) | PASS |
| Data minimisation & security of processing | FAIL (F-013, F-015) | FAIL |
| Right of access / portability | PASS (F-039) | PASS |
| Right to erasure | PARTIAL (F-014) | PARTIAL |
| Records of processing, DPIA, sub-processors | PARTIAL — documents exist; accuracy not verified | PARTIAL |
| Breach notification readiness (72 h) | UNVERIFIED — documented, not exercised | UNVERIFIED |
| International transfers (US processors) | UNVERIFIED — counsel | UNVERIFIED |

### 5.5 Core Web Vitals (lab, mobile, local production build)

| Metric | Target | Result | Status |
|---|---|---|---|
| LCP | ≤ 2.5 s | 3.2–4.0 s | FAIL |
| INP (TBT as proxy) | ≤ 200 ms | TBT 160–430 ms | PARTIAL |
| CLS | ≤ 0.1 | 0–0.051 | PASS |
| Field data (CrUX/RUM) | — | none available | UNVERIFIED |

## 6. Journey scorecards

| Journey | Result | UX score (1–5) | Blockers / top fixes |
|---|---|---|---|
| Sign-up → OTP → onboarding | Works (OTP screen reached; repo spec passes except a brittle selector) | 3 | Auto-opening 9-step tour (F-031); unnamed code field (F-035) |
| Sign-in | Works; cookies HttpOnly; token never in JS | 3 | 6-step tour over the form (F-031); 1 MB looping logo video (F-045) |
| Create business → publish showroom | Works (repo specs pass) | 4 | Design-token and contrast issues (F-041, F-046) |
| Add product | **Broken for photos** | 1 | F-001 upload route; AI button 404 with developer text (F-002); unlabelled inputs (F-043) |
| Buy (member and guest) → report payment → seller confirms | 24/24 checks pass; double-click safe | 4 | Delivery tracking broken (F-003) |
| Messaging (two people) | 10/10 desktop + phone | 4 | WebKit unverified |
| Bookmarks | **Request loop** | 1 | F-040 |
| Export / delete account | 9/10 | 3 | Files remain public (F-014) |

## 7. Prioritised remediation roadmap

| When | Item | Findings | Suggested owner | Effort |
|---|---|---|---|---|
| **Before launch** | Make verification documents private (signed URLs), migrate existing files, delete files on erasure | F-013, F-014 | Backend lead | M |
| | Stop the Bookmarks request loop | F-040 | Frontend | S |
| | Restore product photo upload; fix the other 15 missing routes | F-001–F-006 | Full-stack | S–M |
| | Diagnose the API outage; move off the free plan; add external uptime alerting | F-030 | DevOps / owner | S |
| | Scrub tokens from logs and Sentry | F-015 | Backend | S |
| | Fix the service worker (push/offline) | F-048 | Frontend | S |
| | Fix contrast tokens, skip link, unnamed controls on core journeys | F-041–F-043, F-035 | Frontend / design | M |
| | Owner decision on tour default; counsel review of compliance claims and law number | F-031, F-054 | Owner, counsel | S |
| **First 30 days** | Run journey E2E (chromium) and the route-contract test in CI | F-032, starters §8 | QA | M |
| | Validate IDs/bodies to stop 500s; nonce-based CSP; common-password check; MFA for admins | F-034, F-016, F-017 | Backend | M |
| | Remove intro video from logos; splash once per session; Lighthouse budgets | F-045 | Frontend | M |
| | Money-path tests (expiry, wallet withdrawal, coupons) | F-051 | Backend | M |
| | Migration ledger | F-009 | Backend | M |
| **First 90 days** | Design-token migration and lint rule | F-046 | Design system | L |
| | Accessibility statement, LICENSE, OpenAPI, docs freshness | F-055 | Docs owner | M |
| | Remove wallet/payments marketing; unused packages; strict TypeScript by folder | F-047, F-052 | Product / eng | M |
| | Safari/iOS/Android and screen-reader pass; staging load and soak tests with production-size data | §2 unverified | QA | M |

## 8. Automated regression suite (starter code in `regression-starters/`)

| Starter | Guards | Status |
|---|---|---|
| `route-contract.test.ts` (Jest) | Frontend calls to non-existent routes | Trial-run on the local stack: fails listing exactly the 16 routes in F-001–F-006 — will pass once they are fixed |
| `request-budget.spec.ts` (Playwright) | API request loops; service-worker activation | Written against the behaviour reproduced in F-040, F-048 |
| `a11y.spec.ts` (Playwright + @axe-core/playwright) | Serious/critical WCAG 2.2 AA violations, skip link, 320 px reflow | Needs the dev dependency |
| `lighthouserc.json` (Lighthouse CI) | LCP 2.5 s, TBT 200 ms, CLS 0.1, JS 250 KB, media 200 KB, a11y ≥ 0.95 | Budgets from F-045 |
| `security-scans.yml` (GitHub Actions) | Secret scanning (gitleaks), passive ZAP baseline against a CI-started app | Pin actions to SHAs when adopting |

The audit's own scripts (`scripts/two-account-check.mjs`, `order-journey.mjs`, `account-lifecycle.mjs`) are ready to become CI tests as well.

## 9. Positive findings (keep these from regressing)

F-010 safe seed tooling · F-011 accurate API reference · F-025 OTP, reset-token and password handling · F-026 object-level authorization · F-027 webhooks, jobs, sandbox gates, guest tokens · F-028 no pre-consent tracking; strict backend headers · F-037 order journey 24/24 · F-038 messaging 10/10 · F-039 export and deletion · F-049 keyboard, motion and structure basics · F-050 error-free under local load · F-056 all quality gates green, sound schema.

## 10. Open questions for the team and counsel

1. **Guided tour default** — on (code) or off (FEATURE_FLAGS.md)? Should it auto-open on sign-in and sign-up pages? (F-031)
2. **Governing data-protection law** — Proclamation No. 1309/2024 (repo docs) or No. 1321/2024 (audit brief)? Obligations, DPO and registration requirements. (F-054)
3. **Legal entity and imprint** — which entity contracts with users and sellers; registered address and contact on every page. (F-055)
4. **Identity verification** — retention period for selfies and ID documents, and who may view them. (F-013, F-014)
5. **Hosting** — budget for an always-on backend plan and uptime monitoring. (F-030)
6. **Licence** — what licence (or proprietary notice) applies to the repository? (F-055)
7. **AI features** — disclosure wording for AI-generated text and assistant replies (EU AI Act transparency if serving EU users).
8. **Marketing claims** — remove "payments" and wallet visuals given the no-funds model? (F-047)
9. **Markets for launch** — EU/UK users trigger the European Accessibility Act and GDPR obligations above; confirm target countries.
