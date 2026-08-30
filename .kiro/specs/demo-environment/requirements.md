# Requirements: Demo Environment

## Introduction

New users who register on Nodbusiness land on a blank platform with no content, no businesses, and no context. This creates an activation problem — users don't know what to build or why it's worth their time.

The Demo Environment solves this by giving every new user a choice immediately after login: explore a fully populated demo of the platform (identical to the real app but connected to a separate demo database filled with 150 realistic Ethiopian businesses), or jump straight into the real platform. The demo includes a step-by-step interactive tour guide that walks the user through every major feature.

The demo database is completely separate from the production database. The frontend and backend codebase is identical — only the database connection differs. This means the demo always shows exactly what the real platform looks like when populated, using real Ethiopian businesses, products, prices, and content.

---

## User Stories

### Requirement 1: Post-Login Mode Selection

**User Story:** As a new user who has just registered or logged in for the first time, I want to be shown a clear choice between exploring the platform in demo mode or jumping into the real platform, so that I can learn how the platform works before committing to building my own presence.

#### Acceptance Criteria

1. After a user's first login (where `onboarding_mode` is NULL on their profile), the system SHALL redirect them to a `/choose-mode` page before showing the main feed.
2. The `/choose-mode` page SHALL present two options: "Explore First" (demo mode) and "Jump In" (real platform).
3. When the user selects "Explore First", the system SHALL record `onboarding_mode = 'demo'` on their user profile and enter demo mode.
4. When the user selects "Jump In", the system SHALL record `onboarding_mode = 'real'` on their user profile and redirect to the real platform feed.
5. Once `onboarding_mode` is set to either value, the `/choose-mode` page SHALL never be shown again to that user.
6. If a user navigates directly to `/choose-mode` after already choosing, the system SHALL redirect them to their feed.
7. The choice SHALL be persisted across sessions — if a user who chose demo mode logs out and back in, they SHALL still be in demo mode until they explicitly switch to real.

---

### Requirement 2: Demo Mode — Separate Database

**User Story:** As the platform operator, I want the demo environment to use a completely separate database from the production environment, so that demo data never mixes with real user data, and the demo can be reset or reseeded without affecting any real users.

#### Acceptance Criteria

1. The system SHALL support a `DEMO_DATABASE_URL` environment variable pointing to a separate PostgreSQL database (e.g., a Neon branch).
2. When a user is in demo mode, ALL database queries (reads and writes) SHALL use the demo database connection, not the production database.
3. The demo database connection SHALL be selected per-request based on a `demo_session` cookie, not per-server (both connections are available simultaneously on the same running server).
4. User authentication in demo mode SHALL use the demo database — demo users are stored in the demo database, not in production.
5. The demo and real environments SHALL use the same Express backend codebase with no branching logic except the database pool selection at the middleware level.
6. The system SHALL include a `DEMO_SESSION_SECRET` environment variable, separate from `JWT_SECRET`, for signing demo session tokens.
7. The production database SHALL never be queried during a demo session.

---

### Requirement 3: Demo Mode — Persistent Banner

**User Story:** As a user exploring demo mode, I want a clear and persistent visual indicator that I am in the demo environment, so that I always know I'm not on the real platform and understand that my actions are simulated.

#### Acceptance Criteria

1. When a user is in demo mode, a persistent banner SHALL be displayed at the top of every page below the main navigation header.
2. The banner SHALL display: "You're exploring the demo — this is simulated content." and a "Switch to Real →" button.
3. The banner SHALL NOT be dismissible — it stays visible throughout the entire demo session.
4. The banner SHALL use a visually distinct style (amber/gold) that does not interfere with normal UI elements.
5. When the user clicks "Switch to Real", the system SHALL show a brief confirmation modal, then set `onboarding_mode = 'real'`, clear the demo session cookie, and redirect to the real platform feed.
6. After switching to real, the banner SHALL never appear again for that user.

---

### Requirement 4: Demo Path — Two Sub-Choices

**User Story:** As a user who has chosen to explore the demo, I want the option to either watch a guided video tutorial first or jump directly into the demo site, so that I can choose the learning style that works best for me.

#### Acceptance Criteria

1. After selecting "Explore First", the system SHALL show a second screen with two options: "Watch Video Tour" and "Explore Demo Site".
2. The "Watch Video Tour" option SHALL navigate to a `/tour/video` page with an embedded video player.
3. After the video ends (or the user clicks "Skip to Demo"), the system SHALL navigate to the demo site feed.
4. The "Explore Demo Site" option SHALL navigate directly to the demo site feed with the tour guide active.
5. Both paths SHALL result in the tour guide being active by default (user can skip the tour at any time).

---

### Requirement 5: Video Player Component

**User Story:** As a user who chose to watch the video tour, I want a video player with chapter navigation, so that I can jump to specific parts of the tutorial that interest me without watching the entire video linearly.

#### Acceptance Criteria

1. The video player SHALL accept a `src` prop (URL to video file — MP4, YouTube embed, or Loom URL) and a `chapters` prop (array of `{ time: number, label: string }`).
2. The player SHALL display a chapter list beside or below the video with each chapter as a clickable button.
3. Clicking a chapter button SHALL seek the video to that timestamp.
4. The currently playing chapter SHALL be visually highlighted in the chapter list.
5. When the video ends, an overlay SHALL appear with a CTA button: "Enter the Platform →" that navigates to the demo feed.
6. A "Skip Video →" button SHALL be visible at all times, navigating to the demo feed without watching.
7. Video progress SHALL be saved in localStorage so refreshing the page resumes from where the user left off.
8. If `src` is not provided, the player SHALL show a placeholder with "Video coming soon" and a direct "Explore Demo →" button.

---

### Requirement 6: Interactive Tour Guide

**User Story:** As a user exploring the demo for the first time, I want a step-by-step interactive tour that highlights key features and explains what I'm looking at, so that I understand all the capabilities of the platform before deciding to build my own presence.

#### Acceptance Criteria

1. The tour guide SHALL be an overlay system that highlights a target element with a spotlight effect and shows a tooltip with title, description, and navigation buttons.
2. The tour SHALL consist of at least 14 steps covering: welcome, social feed, post interaction, marketplace, product detail, add to cart, showroom view, showroom builder, messaging, nearby map, wallet, business dashboard, admin preview, and exit CTA.
3. Each step SHALL have: target CSS selector, title, description, position (top/bottom/left/right), and advance trigger (click target, click Next, or auto-advance).
4. Steps with `action: 'click'` SHALL automatically advance when the user clicks the highlighted element.
5. Steps with `action: 'next'` SHALL show a "Next →" button the user must click to advance.
6. A progress indicator SHALL show "Step X of 14" at all times.
7. A "Skip Tour" button SHALL be visible at all times and exits the tour without advancing to the next step.
8. Tour progress SHALL be saved in localStorage — if the user refreshes, the tour resumes from where they left off.
9. When the user reaches the final step, the CTA SHALL be "Start Building for Free →" which navigates to the real platform onboarding.
10. The tour SHALL be triggerable again from Settings → "Restart Demo Tour".

---

### Requirement 7: Demo Mode Is a Full Sandbox — Not a Simulation

**User Story:** As a user or developer exploring demo mode, I want every feature of the platform to work exactly as in the real platform — including payments, AI, real-time chat, maps, and the showroom builder — so that the demo environment is a true test sandbox like Stripe's test mode, not a limited preview.

#### Acceptance Criteria

1. Demo mode SHALL be functionally identical to the real platform. Every feature that works in real mode SHALL work in demo mode. The word "simulated" is replaced by "sandbox" — nothing is faked.
2. Payments in demo mode SHALL use Stripe test-mode keys (`STRIPE_TEST_SECRET_KEY` env var). Users complete the full Stripe checkout with Stripe's test card numbers. The webhook fires, orders update, wallet balances change — everything behaves exactly as in production.
3. Chapa payments in demo mode SHALL use the Chapa sandbox key (`CHASECK_TEST-...`). Already configured in the existing `.env`.
4. AI features (product descriptions, AI assistant) SHALL use the same AI provider and return real responses — no mocking.
5. Real-time features (Socket.IO chat, presence, notifications) SHALL use the same server — no separate demo socket server.
6. Maps and nearby features SHALL work with real coordinates — no mocking.
7. Push notifications SHALL work in demo mode — browser push subscriptions fire normally.
8. In demo mode, ALL subscription tier restrictions SHALL be removed — every user gets full Enterprise-tier access to all builder sections and features. This is intentional: the demo should show the platform's full capability.
9. The ONLY differences between demo and real mode SHALL be: (a) database connection, (b) Stripe key (test vs live), (c) session-scoped data cleanup, (d) tier restrictions removed.
10. A subtle banner SHALL indicate demo mode at all times, but it SHALL NOT restrict any functionality.

---

### Requirement 7b: Sandbox Payments in Demo Mode

#### Acceptance Criteria

1. The system SHALL support a `STRIPE_TEST_SECRET_KEY` environment variable used exclusively in demo mode sessions.
2. In demo mode, all Stripe API calls SHALL use `STRIPE_TEST_SECRET_KEY` instead of `STRIPE_SECRET_KEY`.
3. The Stripe webhook endpoint SHALL accept events from both test and live Stripe (distinguishable by the event `livemode` field), routing to the correct database based on `livemode: false` → demo DB, `livemode: true` → real DB.
4. Demo mode users SHALL be instructed to use Stripe test card `4242 4242 4242 4242` for payments — a tooltip on the payment form SHALL show this in demo mode.
5. Completed test payments SHALL update orders, wallet balances, and commissions in the demo database exactly as real payments do in production.

---

### Requirement 10: Session-Scoped Demo Identity

**User Story:** As a user entering demo mode, I want a fresh temporary identity for each session so that I can build and create freely without my demo experiments persisting across sessions, giving me a clean slate every time I return.

#### Acceptance Criteria

1. When a user enters demo mode, the system SHALL create a temporary demo user record in the demo database with a unique ID (e.g., `demo_user_{uuid}`).
2. The demo session SHALL be valid for 24 hours. After expiry, the user gets a new session on next demo entry.
3. All content created by the user during their demo session (showrooms, products, posts, messages) SHALL be tied to their temporary demo user ID.
4. On demo session end (logout, switch to real, or 24-hour expiry), the user's temporary content SHALL be marked for cleanup. The cleanup process removes demo user records older than 24 hours on a schedule.
5. The 150 seed businesses in the demo database SHALL be permanent — they are never cleaned up by the session cleanup process.
6. The seed businesses SHALL be identifiable by `is_seed = TRUE` so the cleanup process knows to skip them.
7. When a user returns to demo mode after their session expired, they SHALL get a completely fresh blank slate — new temp user, no previous content visible.
8. The user's real-platform account (in the production database) SHALL be unaffected by demo session creation, use, or cleanup.

---

### Requirement 11: Demo Showroom Builder Experience

**User Story:** As a user in demo mode, I want to be able to build and publish a complete showroom using the full builder, exactly as I would on the real platform, so that I can experience the full power of the tool before committing to the real platform.

#### Acceptance Criteria

1. The showroom builder in demo mode SHALL be fully functional — all 25 section types, all templates, drag-and-drop, color customization, preview — identical to the real platform.
2. A user can publish their demo showroom and access it at a live URL (e.g., `/showroom/my-demo-shop`) during their session.
3. The published demo showroom SHALL be accessible to anyone with the URL during the session — the user can share it and show it to others.
4. When the demo session ends, the published showroom URL SHALL return 404.
5. The builder SHALL show a subtle banner: "You're building in demo mode — switch to real to keep your showroom permanently."
6. The "Publish" button in demo mode SHALL work exactly as in the real platform but additionally show a tooltip: "Live in demo — permanent on real platform."
7. Pro and Enterprise builder sections (inventory_catalog, live_location_tracking, etc.) SHALL be accessible in demo mode without requiring a subscription — this is intentional, as demo mode is meant to show the full range of capabilities.

---

### Requirement 8: Demo Seed Script Structure — 30 Businesses (MVP)

**User Story:** As the platform operator, I want a `seed-demo.js` script that creates 30 highly diverse and realistic Ethiopian businesses (3 per sector), each with unique content, tier-appropriate showroom data, and no two businesses feeling similar, so that when the demo database is populated it demonstrates the full range of what the platform can do.

#### Acceptance Criteria

1. Phase 1 (MVP) SHALL create 30 businesses — 3 per sector across 10 sectors.
2. Phase 2 SHALL expand to 150 businesses — but Phase 2 is not built now.
3. Each business SHALL be in a distinctly different sub-type, even within the same sector. Example: the 3 "Transport" businesses are a ride-hailing app, a freight logistics company, and an airport shuttle service — not 3 variations of taxis.
4. No two businesses SHALL share the same showroom template, brand color, or content focus.
5. 90% of the 30 businesses SHALL be in completely different sectors/sub-sectors.
6. Tier distribution: 10 Free, 15 Pro, 5 Enterprise.
7. Free-tier businesses: max 5 showroom sections, 10–30 products.
8. Pro-tier businesses: up to 25 showroom sections, 100–500 products, inventory catalog, booking where relevant.
9. Enterprise-tier businesses: all sections including live GPS, webhook endpoints, API keys, 500+ products where applicable.
10. All prices SHALL be in ETB, all locations SHALL be real Addis Ababa neighborhoods, all business names SHALL be realistic Ethiopian names.
11. Each business SHALL have: reviews (5–50), orders (2–30), posts in the feed, and at least one conversation.
12. The script SHALL target `DEMO_DATABASE_URL` exclusively. If not set, it SHALL exit with error.
13. The script SHALL be idempotent — running twice clears and reseeds.
14. Seed businesses SHALL have `is_seed = TRUE` to protect them from session cleanup.
15. The script SHALL NOT be run or generated now — it is designed for future execution.

---

### Requirement 9: Switching from Demo to Real

**User Story:** As a user who has been exploring the demo and is ready to use the real platform, I want a clear and simple path to switch permanently, so that I can start building my real presence without losing my account.

#### Acceptance Criteria

1. The "Switch to Real" action SHALL be available from: the DemoBanner, the Settings page, and the end-of-tour CTA.
2. When switching, the system SHALL show a confirmation modal explaining: what will happen (real platform, real data), that the demo session will end, and that they'll start with their real (empty) feed.
3. After confirming, the system SHALL: set `onboarding_mode = 'real'` on the user's real-database profile, clear the `demo_session` cookie, and redirect to the real platform feed.
4. The user's account in the real database SHALL already exist (it was created during registration, before the mode choice) — switching to real simply stops using the demo DB session.
5. If the user registered during demo mode and their real account doesn't exist yet, the system SHALL create it automatically during the switch.

---

## Non-Functional Requirements

1. **Performance:** The demo database connection pool SHALL initialize lazily — only created on first demo session request, not at server startup, so real-only deployments have no overhead.
2. **Isolation:** A bug or data corruption in the demo database SHALL have zero impact on the production database.
3. **Reset capability:** The demo database SHALL support being completely wiped and reseeded in under 5 minutes via `npm run seed:demo`.
4. **No code forks:** The same Next.js frontend code serves both demo and real users. No separate deployment, no separate repo. The only branching is at the database pool selection and Stripe key selection level.
5. **Security:** Demo session tokens SHALL use a separate secret (`DEMO_SESSION_SECRET`) so a demo token cannot be replayed against the real API. Demo Stripe webhooks are distinguishable by `livemode: false`.
6. **Parity:** When a new feature is added to the real platform, it SHALL automatically be available in the demo environment — no separate demo implementation required. The sandbox/real split is infrastructure only.
7. **Developer-friendly:** Developers and businesses can use demo mode to test integrations, webhooks, and API keys against the sandbox database before going live — exactly like Stripe's test mode. This is a documented, supported use case.
