# Nodbusiness — Architecture Decision Records (ADRs)

ADRs document the *why* behind key architectural choices. Each record captures the context, the options considered, the decision made, and its consequences.

---

## ADR-001: Next.js App Router as primary frontend

**Status:** Accepted | **Date:** July 2026

**Context:** Empire X started with React + Vite. Public-facing pages (showrooms, product listings, public profiles) need SEO and server-rendering. Server Components reduce client-side JavaScript bundle size.

**Options:** Keep Vite SPA · Hybrid (Next.js for public, Vite for app) · Full Next.js migration

**Decision:** Adopt Next.js 16 App Router as the single frontend (`frontend-next/`). The Vite app has been removed.

**Consequences:** `NEXT_PUBLIC_` env prefix required. `'use client'` needed for browser APIs. All new features go in `frontend-next/` only.

---

## ADR-002: Modular monolith over microservices

**Status:** Accepted | **Date:** July 2026

**Context:** 9+ feature domains. Microservices add significant operational overhead for a small team.

**Decision:** One deployable backend with domain-separated route modules. Extract to separate services only when a module needs independent scaling.

**Consequences:** Simpler deployment, easier debugging, lower cost. Module boundaries are already clean for future extraction.

---

## ADR-003: Raw parameterized SQL over ORM

**Status:** Accepted (revisit at TypeScript migration) | **Date:** July 2026

**Context:** Prisma/Drizzle add type safety but require a build step and schema maintenance. Speed of iteration matters more at MVP.

**Decision:** Raw SQL with `backend/utils/crud.js` helpers. `ALLOWED_TABLES` Set prevents injection via dynamic table names.

**Future:** Adopt Prisma when backend migrates to TypeScript.

---

## ADR-004: JWT in localStorage with cookie sync

**Status:** Accepted (temporary) | **Date:** July 2026

**Context:** HttpOnly cookies are more secure against XSS. Next.js middleware needs the JWT server-side for route protection.

**Decision:** Store JWT in localStorage, sync to a regular cookie for middleware. Plan: HttpOnly refresh token before Phase 2.

**Risk:** XSS can read localStorage. Mitigated by DOMPurify and strict CSP.

---

## ADR-005: Multi-origin CORS via comma-separated FRONTEND_URL

**Status:** Accepted | **Date:** July 2026

**Context:** The app now uses a single active Next.js frontend on port 3000, but deployments may still need multiple allowed origins for local development, Vercel preview deployments, staging, and production domains.

**Decision:** Parse `FRONTEND_URL` as a comma-separated list. In development, local frontend origins are added automatically for compatibility with older local setups.

---

## ADR-006: AI provider abstraction layer

**Status:** Accepted | **Date:** July 2026

**Context:** AI provider pricing and capabilities change frequently. Vendor lock-in is risky.

**Decision:** All AI calls via `backend/lib/ai.js`. Switch provider by changing `AI_PROVIDER` env var — no code changes.

**Future:** Add fallback chain: OpenAI → Gemini → Anthropic → Local LLM.

---

## ADR-007: Feature flags with percentage rollouts

**Status:** Accepted | **Date:** July 2026

**Context:** Releasing features to all users at once risks outages. Staged rollout catches issues early.

**Decision:** `backend/lib/featureFlags.js` — env var override (instant) > Redis override (real-time) > hardcoded defaults. Percentage rollout uses deterministic user ID hash.

---

## ADR-008: BullMQ queue with synchronous fallback

**Status:** Accepted | **Date:** July 2026

**Context:** Background jobs require Redis. Redis is optional in development.

**Decision:** When `REDIS_URL` is not set, jobs run synchronously in-process. Same code path — no dev/prod divergence.

---

## ADR-009: Cloudflare R2 for file storage

**Status:** Accepted | **Date:** July 2026

**Context:** Local disk breaks with multiple instances. AWS S3 has egress fees expensive for media-heavy African traffic.

**Decision:** Cloudflare R2 — S3-compatible, zero egress fees, Cloudflare CDN built-in. Auto-detected in upload middleware.

---

## ADR-010: Socket.IO for real-time (self-hosted)

**Status:** Accepted | **Date:** July 2026

**Context:** Real-time chat needs WebSockets. Ably/Pusher costs money at scale.

**Decision:** Socket.IO inside the Express server. Redis Pub/Sub adapter enables scaling across multiple instances.

---

## ADR-011: PostgreSQL as the only database

**Status:** Accepted | **Date:** July 2026

**Context:** Multiple specialized databases increase operational complexity.

**Decision:** PostgreSQL for everything — relational data, JSONB, full-text search, array types. Add specialized databases only when PostgreSQL becomes a bottleneck for a specific use case.

---

## ADR-012: ALLOWED_TABLES allowlist in crud.js

**Status:** Accepted | **Date:** July 2026

**Context:** Raw SQL with dynamic table names is a SQL injection vector if table names ever come from user input.

**Decision:** Add `ALLOWED_TABLES` Set to `crud.js`. Every CRUD function validates the table name before executing SQL. Unknown tables throw `Error('Invalid table name: ...')`.

---

## ADR-013: Mewacho group money collection module

**Status:** Accepted | **Date:** September 2026

**Context:** Ethiopian users needed a way to pool money digitally for collective purposes (birthdays, weddings, trips, charity). The informal practice of group collection via WhatsApp had no transparency, audit trail, or payment integration.

**Options:** Build as a separate app · Integrate as a module in Nodbusiness · Third-party embed

**Decision:** Integrate as a first-class module (`/mewacho`) inside Nodbusiness. Reuses existing auth, Stripe integration, push notifications, Socket.IO, and the sidebar nav. New tables: `mewacho_groups`, `mewacho_members`, `mewacho_contributions`, `mewacho_withdrawals`, `mewacho_activity`.

**Consequences:** Fast to ship, reuses all infrastructure. Activity feed (mixed contributions + messages in one ordered stream) gives the WhatsApp-like UX. Stripe handles payments; webhooks confirm contributions and notify members. QR invite + PDF export built-in from day one.

---

## ADR-014: Auth logout loop fix — authChecked must not be set until refresh round-trip completes

**Status:** Accepted | **Date:** September 2026

**Context:** On page load with an expired access token, `AuthContext.checkUserAuth()` called `GET /api/auth/me`, got a 401, set `authChecked = true` in the `finally` block, then `AppLayout` saw `authChecked && !isAuthenticated` and redirected to `/login` — all before the axios interceptor had a chance to call `POST /api/auth/refresh` and retry `/me`.

**Decision:** Remove the early-return when `localStorage` token is missing (no token = definitely logged out, early return is correct). For the expired-token case: `authChecked` is only set to `true` inside the `finally` block of the `await client.get('/api/auth/me')` call, which now covers the full interceptor chain (original request + refresh + retry). The interceptor no longer force-redirects to `/login` — `AuthContext` and `AppLayout` handle that after `authChecked` is confirmed.

**Consequences:** Silent token refresh works correctly on page load. No more logout loop for users with a valid refresh cookie but an expired access token.

When making a significant architectural decision, add a new ADR here following this template:

```markdown
## ADR-NNN: [Short title]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Date:** Month Year

**Context:** [What problem are we solving? Why does this decision matter?]

**Options:** [List the alternatives you considered]

**Decision:** [What did you decide?]

**Consequences:** [What are the trade-offs? What gets better? What gets harder?]
```
