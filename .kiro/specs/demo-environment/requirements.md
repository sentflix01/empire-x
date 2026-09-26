# Requirements: Demo Environment

_Last updated: 2026-09-25_
_Status: Revised — all contradictions from the original draft resolved. See §12 for the decision log._

---

## Introduction

New users who register on Nodbusiness land on a blank platform with no content, no businesses, and no context. This creates an activation problem — users don't know what to build or why it's worth their time.

The Demo Environment solves this by giving every new user a choice immediately after their first login: explore a fully populated sandbox of the platform, or jump straight into the real platform. The sandbox uses seed data from real Ethiopian businesses and shows the full range of what the platform can do.

### Two-track delivery model

The demo is built in two tracks driven by the current zero-cost constraint:

**Track 1 — Bridge (now, zero cost)**
Uses the existing single production database with its seeded demo accounts and faker content. Provides instant "Try Demo" access from the landing page, a first-login mode-choice screen, and a lightweight demo banner. Built to be forward-compatible so Track 2 slots in without rewriting the frontend or the first-login flow.

**Track 2 — Full sandbox (post-revenue)**
Introduces a dedicated `DEMO_DATABASE_URL` PostgreSQL database, a `demo_session` cookie signed with `DEMO_SESSION_SECRET`, per-request database routing, Stripe test-mode isolation, a 30-business curated seed dataset, and a full session cleanup lifecycle. This is the architecture described in `architecture.md`. It is not started until a second database can be provisioned without cost.

The distinction between tracks is **infrastructure only**. The frontend components, the `/choose-mode` flow, and the demo banner built in Track 1 do not need to be rewritten for Track 2 — they only need the backend session and routing layer added beneath them.

---

## User Stories

### Requirement 1: Landing Page — Try Demo, Theme, and Language

**User Story:** As a visitor on the landing page, I want to instantly try the platform without creating an account, and also be able to switch the theme and language, so that I can evaluate the product in my preferred language and visual style before committing.

#### Acceptance Criteria

1. The landing page navigation SHALL contain a "Try Demo" button alongside "Sign In" and "Create Account".
2. Clicking "Try Demo" SHALL log in as the built-in demo account (`test@nodbusiness.app`) and redirect to `/feed` — no form, no password entry.
3. While the demo login is in progress, the button SHALL show a loading state ("Loading demo…") and be disabled to prevent double-click.
4. If the demo login fails (backend down, quota exceeded), the button SHALL show an inline error and SHALL NOT redirect.
5. The landing page navigation SHALL contain a theme toggle button (dark/light) that uses `next-themes` and persists across sessions.
6. The landing page navigation SHALL contain a language toggle button (EN/አማ) that uses the existing `toggleLanguage()` from `lib/i18n.ts` and persists in `localStorage` under the key `empire_lang`.
7. The landing page theme and language toggles SHALL use the same underlying systems as the authenticated app — no separate implementation.
8. The "Try Demo" button, theme toggle, and language toggle SHALL be a `'use client'` component embedded in the otherwise server-rendered landing page, following Next.js App Router conventions.
9. On mobile, all three controls SHALL remain accessible — the theme and language toggles may collapse into a compact icon-only form below the `sm` breakpoint.

---

### Requirement 2: First-Login Mode Choice (`/choose-mode`)

**User Story:** As a new user who has just registered or logged in for the first time, I want to be shown a clear choice between exploring the platform in demo mode or jumping into the real platform, so that I can learn how it works before building my own presence.

#### Acceptance Criteria

1. After a user's first login where `onboarding_mode IS NULL` on their profile, the system SHALL redirect to `/choose-mode` before showing `/feed`.
2. The `/choose-mode` page SHALL present two options: **"Explore First"** (demo mode) and **"Jump In"** (real platform).
3. Selecting "Explore First" SHALL set `onboarding_mode = 'demo'` on the user's profile and:
   - **Track 1:** redirect to `/feed` with seed data visible (the existing `realMode = false` default). No separate database is used.
   - **Track 2:** create a demo session, issue the `demo_session` cookie, and redirect to `/feed` connected to the demo database.
4. Selecting "Jump In" SHALL set `onboarding_mode = 'real'` on the user's profile and redirect to `/feed` on the real platform.
5. Once `onboarding_mode` is set to either value, `/choose-mode` SHALL never be shown again to that user.
6. If a user navigates directly to `/choose-mode` after already choosing, the system SHALL redirect them to `/feed`.
7. The choice SHALL be persisted across sessions — a user who chose demo mode and logs out and back in SHALL remain in demo mode until they explicitly switch to real.
8. `onboarding_mode` is a **preference**, not the active security boundary. In Track 2, the active `demo_session` cookie is authoritative. In Track 1, `onboarding_mode` is the only signal because there is no separate session.
9. The `onboarding_mode` column SHALL be added to the `users` table via migration 40 before Track 1 is deployed. NULL means the user has not yet chosen; 'demo' or 'real' means they have.

---

### Requirement 3: Demo Banner

**User Story:** As a user exploring demo mode, I want a clear and persistent visual indicator that I am in the demo environment, so that I always know I'm not on the real platform.

#### Acceptance Criteria

1. When a user is in demo mode, a persistent banner SHALL be displayed at the top of every page below the main navigation.
2. **Track 1 banner text:** "You're exploring a demo account — sign up to keep your work." with a "Create Account →" button.
3. **Track 2 banner text:** "Demo sandbox — activity and payments use test data." with a "Switch to Real →" button.
4. The banner SHALL NOT be dismissible.
5. The banner SHALL use an amber/gold visual style that is visually distinct but does not interfere with normal UI elements.
6. **Track 1:** The banner is shown when the authenticated user's account has `is_demo = true` OR `onboarding_mode = 'demo'`.
7. **Track 2:** The banner is shown when a valid `demo_session` cookie is present and verified.
8. "Create Account →" (Track 1) SHALL navigate to `/register`.
9. "Switch to Real →" (Track 2) SHALL show a confirmation modal (see Requirement 8) before switching.
10. The banner SHALL be a component in `AppLayout` so it appears on all authenticated pages automatically.

---

### Requirement 4: Demo Mode Is a Full Sandbox (Track 2)

**User Story:** As a user or developer exploring demo mode, I want every feature of the platform to work exactly as in the real platform — including payments, AI, real-time chat, maps, and the showroom builder — so that the demo is a true test sandbox like Stripe's test mode.

#### Acceptance Criteria

1. Demo mode SHALL be functionally identical to the real platform. Every feature that works in real mode SHALL work in demo mode.
2. Payments in demo mode SHALL use `STRIPE_TEST_SECRET_KEY`. Users complete the full Stripe checkout with Stripe test card numbers. The webhook fires, orders update, wallet balances change.
3. Chapa payments in demo mode SHALL use the Chapa sandbox key (`CHASECK_TEST-...`).
4. AI features SHALL use the same AI provider and return real responses — no mocking. Per-session spend limits apply.
5. Real-time features (Socket.IO chat, presence, notifications) SHALL use the same server with demo-scoped rooms and namespaced Redis keys.
6. Maps and nearby features SHALL work with real coordinates.
7. Push notifications SHALL be clearly demo-labeled. Subscriptions SHALL be cleaned up on session end.
8. In demo mode, ALL subscription tier restrictions SHALL be removed — every demo user gets full Enterprise-tier access to show the platform's full capability. This is a presentation entitlement only; it does not grant production admin authority.
9. The ONLY infrastructure differences between demo and real mode SHALL be: (a) database connection, (b) Stripe key (test vs live), (c) session-scoped cleanup, (d) tier restrictions removed.
10. _Track 1 note:_ In Track 1, items 2, 3, 5 (room namespacing), and 9 are not yet enforced. Track 1 is a bridge, not a full sandbox. The banner copy reflects this ("demo account", not "sandbox").

---

### Requirement 5: Session-Scoped Demo Identity (Track 2)

**User Story:** As a user entering demo mode, I want a fresh temporary identity for each session so that I can build and create freely without my experiments persisting across sessions.

#### Acceptance Criteria

1. When a user enters demo mode in Track 2, the system SHALL create a temporary demo user record in the demo database with a unique ID (e.g., `demo_user_{uuid}`).
2. The demo session SHALL be valid for a maximum of 24 hours. After expiry, a new session is created on next demo entry.
3. All content created during a demo session (showrooms, products, posts, messages) SHALL be tied to the temporary demo user ID.
4. On demo session end (logout, switch to real, or 24-hour expiry), the user's temporary content SHALL be marked for asynchronous cleanup. Logical revocation is immediate; physical deletion may lag.
5. Curated seed businesses (marked `is_seed = TRUE`) SHALL never be cleaned up by the session cleanup process.
6. When a user returns to demo after their session expired, they SHALL get a completely fresh temporary identity with no previous content visible.
7. The user's real-platform account (in the production database) SHALL be unaffected by demo session creation, activity, or cleanup.
8. _Track 1 note:_ This requirement does not apply in Track 1. Track 1 uses the built-in `test@nodbusiness.app` account, which is persistent and shared. There is no per-user temporary identity in Track 1.

---

### Requirement 6: Demo Showroom Builder Experience

**User Story:** As a user in demo mode, I want to build and publish a complete showroom using the full builder — exactly as on the real platform.

#### Acceptance Criteria

1. The showroom builder in demo mode SHALL be fully functional — all section types, all templates, drag-and-drop, color customization, preview.
2. A demo user can publish their demo showroom and access it at a live URL during their session.
3. **Track 2:** The published demo showroom SHALL be accessible to anyone with the URL during the session. When the session ends, the URL SHALL return 404.
4. The builder SHALL show a subtle banner: "You're building in demo mode — switch to real to keep your showroom permanently."
5. Pro and Enterprise builder sections SHALL be accessible in demo mode without a subscription (presentation entitlement — see Requirement 4.8).
6. _Track 1 note:_ Track 1 uses the real database and real showroom storage. Showrooms created by the test account persist. The builder banner in Track 1 reads: "You're building as a demo account — create a real account to keep this showroom."

---

### Requirement 7: Switching from Demo to Real

**User Story:** As a user who has been exploring the demo and is ready to use the real platform, I want a clear and simple path to switch permanently.

#### Acceptance Criteria

1. The "Switch to Real" action SHALL be available from: the DemoBanner, the Settings page, and the end-of-tour CTA.
2. When switching, the system SHALL show a confirmation modal explaining: real platform, real data, demo session ends, they start with their real (empty) feed.
3. **Track 1 — After confirming:** set `onboarding_mode = 'real'` on the user's real-database profile, redirect to `/feed`.
4. **Track 2 — After confirming:** set `onboarding_mode = 'real'` on the real-database profile, mark the demo session revoked, clear the `demo_session` cookie, restore/revalidate the real session, redirect to `/feed` on the real database.
5. The user's real account SHALL already exist (created during registration). Switching to real simply stops using the demo session.
6. If a demo-only visitor (no real account) tries to switch to real, they SHALL be directed to `/register` to create a real account first. No sandbox data is automatically migrated.
7. After switching to real, the demo banner SHALL never appear again for that user unless they explicitly re-enter demo mode from Settings.

---

### Requirement 8: Switch-to-Real Confirmation Modal

**User Story:** As a user about to leave demo mode, I want a clear warning so I don't accidentally lose my demo session.

#### Acceptance Criteria

1. The modal SHALL appear before any switch action is executed.
2. Modal copy SHALL clearly state:
   - **Track 1:** "You'll leave the demo account and return to your own feed. Your real account starts empty."
   - **Track 2:** "Your demo session will end. Any content you created in demo mode will be removed within 24 hours. Your real account and its data are untouched."
3. The modal SHALL have two buttons: "Yes, switch to real" (primary) and "Stay in demo" (secondary/cancel).
4. "Stay in demo" SHALL close the modal with no action taken.
5. The modal SHALL be keyboard accessible with focus trapped while open.

---

### Requirement 9: Post-Login Mode Preference Persistence

**User Story:** As a returning user, I want the app to remember my mode preference so I don't have to choose every time I log in.

#### Acceptance Criteria

1. After setting `onboarding_mode`, the system SHALL apply it on every subsequent login without showing `/choose-mode` again.
2. A user whose `onboarding_mode = 'demo'` who logs in SHALL:
   - **Track 1:** land on `/feed` with seed data visible (no additional action needed).
   - **Track 2:** be issued a fresh `demo_session` if none exists or the previous one expired, then redirected to `/feed` on the demo database.
3. A user whose `onboarding_mode = 'real'` who logs in SHALL land on `/feed` on the real database with no demo session issued.
4. A user can change their preference at any time from Settings → "Switch environment". This triggers the confirmation modal (Requirement 8) before executing.
5. `onboarding_mode` is stored server-side in the `users` table and is not trusted from client-side cookies or request bodies.

---

### Requirement 10: Demo Seed Dataset (Track 2)

**User Story:** As the platform operator, I want a `seed-demo.js` script that creates 30 highly diverse and realistic Ethiopian businesses so that the demo database demonstrates the full range of what the platform can do.

#### Acceptance Criteria

1. **Phase 1 (MVP):** 30 businesses — 3 per sector across 10 sectors. Phase 2 expands to 150; Phase 2 is not built now.
2. Each business SHALL be in a distinctly different sub-type within its sector (e.g., the 3 "Transport" businesses are a ride-hailing app, a freight logistics company, and an airport shuttle service — not 3 taxi variants).
3. No two businesses SHALL share the same showroom template, brand colour, or content focus.
4. Tier distribution: 10 Free, 15 Pro, 5 Enterprise.
5. Free-tier businesses: max 5 showroom sections, 10–30 products.
6. Pro-tier businesses: up to 25 showroom sections, 100–500 products, inventory catalog, booking where relevant.
7. Enterprise-tier businesses: all sections including live GPS, webhook endpoints, API keys, 500+ products where applicable.
8. All prices SHALL be in ETB. All locations SHALL be real Addis Ababa neighbourhoods. All business names SHALL be realistic Ethiopian names.
9. Each business SHALL have: reviews (5–50), orders (2–30), feed posts, and at least one conversation.
10. The script SHALL target `DEMO_DATABASE_URL` exclusively. If `DEMO_DATABASE_URL` is not set, the script SHALL exit with an explicit error — it must never run against the production database.
11. The script SHALL be idempotent — running twice clears and reseeds cleanly.
12. Seed businesses SHALL have `is_seed = TRUE` to protect them from session cleanup.
13. **This script is NOT executed now.** It is designed for future execution once the demo database is provisioned.

---

### Requirement 11: First-Login Mode Selection Flow (Second Screen)

**User Story:** As a user who has chosen "Explore First", I want the option to either watch a guided video tutorial first or jump directly into the demo site.

_Note: This is a Track 2 / post-revenue enhancement. It is not part of Track 1. Track 1 goes directly from "Explore First" to `/feed`._

#### Acceptance Criteria

1. **Track 2 only:** After selecting "Explore First", the system SHALL optionally show a second screen with: "Watch Video Tour" and "Explore Demo Site".
2. "Watch Video Tour" SHALL navigate to `/tour/video`.
3. After the video ends or the user clicks "Skip to Demo", the system SHALL navigate to the demo feed.
4. "Explore Demo Site" SHALL navigate directly to the demo feed with the tour guide active.
5. Both paths SHALL result in the tour guide being active by default (skippable at any time).
6. The video player component and interactive tour are deferred to a later milestone after the data isolation proof is complete.

---

### Requirement 12: Interactive Tour Guide

_Deferred to post-revenue Track 2 milestone. Not part of Track 1._

The full 14-step interactive tour, video player with chapter navigation, and tour progress persistence are valuable but depend on the sandbox being provably safe first. Building a polished tour over an unsafe routing layer is not a releasable product. These are designed and spec'd here for reference but are not implemented until Phase 3 of Track 2 is complete and passing its acceptance gates.

---

## Non-Functional Requirements

1. **Performance:** The demo database connection pool (Track 2) SHALL initialize lazily — only on the first validated demo request. Real-only deployments have zero overhead.
2. **Isolation (Track 2):** A bug or data corruption in the demo database SHALL have zero impact on the production database. The two pools SHALL have separate credentials and SHALL NOT share connection state.
3. **Isolation (Track 1):** Track 1 shares the production database. Isolation is maintained only by `is_demo`/`is_seed` flags and the existing `X-Real-Only` filter. This is acknowledged as weaker isolation and is intentional for the zero-cost bridge phase.
4. **Reset capability (Track 2):** The demo database SHALL support being wiped and reseeded in under 5 minutes via `npm run seed:demo`.
5. **No code forks:** The same Next.js frontend and Express backend code serve both demo and real users. No separate deployment, no separate repo. The only branching is at the database pool selection and Stripe key selection level.
6. **Security (Track 2):** Demo session tokens SHALL use `DEMO_SESSION_SECRET`, separate from `JWT_SECRET`, so a demo token cannot be replayed against the real API.
7. **Forward compatibility:** Every component and endpoint built in Track 1 SHALL be designed so Track 2 can extend it without rewriting. The "Try Demo" button endpoint, `/choose-mode` page, and demo banner component are permanent interfaces.
8. **Parity:** When a new feature is added to the real platform, it SHALL automatically be available in the demo environment — no separate demo implementation required.
9. **Developer use case:** Developers and businesses can use demo mode to test integrations, webhooks, and API keys against the sandbox database before going live — exactly like Stripe's test mode. This is a supported, documented use case in Track 2.

---

## §12 — Resolved Contradictions from Original Draft

The following contradictions in the original `requirements.md` have been resolved:

| # | Original contradiction | Resolution |
|---|---|---|
| 1 | Introduction said "150 businesses immediately"; Requirement 8 said "30 for MVP, 150 later" | Introduction now says 30 for Phase 1, 150 is a later expansion |
| 2 | Requirement 1 said the choice is permanent and returning users stay in demo; Requirements 3 and 9 allowed switching to real | `onboarding_mode` is a preference, not a lock. The active session (Track 2) or the preference flag (Track 1) determines current environment. Switching is always possible |
| 3 | Requirement 2 said demo auth uses the demo database; Requirements 9–10 also required a real account to exist | Track 1 uses the production database for both real and demo users. Track 2 separates them. The bootstrap boundary (when a real user enters demo, what identity data is copied) is explicitly none — no real profile data enters the demo DB |
| 4 | Requirement 3 used "simulated content"; Requirement 7 correctly described a functioning sandbox | "Simulated" is replaced throughout. Track 1 uses "demo account". Track 2 uses "demo sandbox — activity and payments use test data" |
| 5 | Requirement 7 said only four things differ between demo and real, but email, AI spend, push, storage, webhooks, caching, and background jobs also differ | Requirement 4 now lists the complete difference surface. Non-infrastructure differences (AI spend caps, email sink, push cleanup, storage prefixes) are explicit in Track 2 |
| 6 | Requirement 6 included an admin preview that could grant demo users live admin access | The admin preview in the tour is sanitized read-only fixture data only. Demo accounts never receive production admin roles or privileged production capabilities |
| 7 | Requirement 11 said showroom links are shareable while active but did not define how visitors without the owner's demo cookie resolve the demo database | Track 2 specifies that demo showroom URLs resolve through a demo-scoped read path. After session end they return 404. Short-lived read-only capability tokens are a later enhancement |
| 8 | Requirements 4–6 (video and 14-step tour) were written as prerequisites | They are now explicitly deferred to post-revenue Track 2 milestones, after the data isolation proof is complete and passing its acceptance gates |
| 9 | Requirement 8.15 said the seed script is "not to be run or generated now" but the rest of the requirement implied it should be written | Requirement 10 now clearly separates design (now) from execution (future). The script is designed and documented but not run until a demo database is provisioned |
| 10 | No explicit zero-cost constraint was documented anywhere | The two-track delivery model is now the top-level frame of the entire spec, with Track 1 explicitly labeled as zero-cost bridge and Track 2 as post-revenue full implementation |
