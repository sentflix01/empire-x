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

---

## ADR-015: Infrastructure migration — Oracle Cloud Johannesburg + Coolify v4 + Cloudflare Pages

**Status:** Accepted | **Date:** September 2026

**Context:** The previous stack (Railway backend + Vercel Hobby frontend + Neon database) had four critical problems:
1. **Render/Railway free tier sleeps** after 15 minutes of inactivity — breaks Socket.IO (chat disconnects), BullMQ (queued jobs stop), and causes 30–60s cold starts.
2. **Vercel Hobby prohibits commercial use** — Nodbusiness has Stripe payments, Chapa payments, and subscription billing. Using Vercel Hobby was a ToS violation that could result in immediate project termination.
3. **Neon was not actually in use** — The database was already Supabase per `.env.production.example` and `DEPLOYMENT_VARIABLES.md`, yet all infrastructure docs referenced Neon. Documentation was inconsistent with reality.
4. **No monitoring** — Zero uptime alerting. Downtime was discovered from user complaints, not automated detection.

Additionally, Oracle Cloud **silently halved** the Always Free ARM allocation (4 OCPU/24GB → 2 OCPU/12GB) in June 2026, enforced August 18, 2026, with no public announcement — a trust issue worth acknowledging but not a blocker.

**Options considered:**

| Option | Cost | Sleep? | Commercial OK? | Latency to ET |
|---|---|---|---|---|
| Railway (current) | $5/mo | No (paid) | Yes | ~300ms |
| Render free | $0 | Yes (15 min) | Yes | ~300ms |
| Oracle + Coolify | $0 | **Never** | Yes | **~80ms** |
| Fly.io | $5+/mo | Limited free | Yes | ~80ms |
| Google Cloud Run | PAYG | Scales to zero | Yes | PAYG |

**Decision:** Migrate to **Oracle Cloud Johannesburg (Always Free ARM A1) + Coolify v4** for the backend, and **Cloudflare Pages** for the frontend.

Specific choices:
- **Oracle Cloud Johannesburg** — only always-free compute option with adequate RAM (12 GB) in a region close to Ethiopia (~80–120ms latency vs ~300ms from US regions)
- **Coolify v4** — stable release (April 2026), open source (Apache 2.0), zero-downtime deploys via Docker HEALTHCHECK, zero features behind paywall, webhook API integrates cleanly with existing GitHub Actions pipeline
- **Cloudflare Pages** — no commercial use restriction (unlike Vercel Hobby), 335+ PoPs with Nairobi PoP nearest to Ethiopia, unlimited bandwidth, auto-deploys via GitHub integration (no CI step or token needed)
- **Supabase** (confirmed, not changed) — already in use, free tier is sufficient for early stage, Supavisor pooler is free and built-in
- **Upstash Redis** (updated) — free tier updated March 2026 from 10K commands/day to 500K commands/month, making it viable for early-stage BullMQ + caching
- **Uptime Kuma** (self-hosted) — replaces UptimeRobot (which updated ToS in December 2024 to prohibit commercial use on free plan), 1-minute checks, runs free on the same Oracle VM

**Consequences:**
- Monthly cost drops from $5–6/month to ~$1.50/month (domain only) at Stage 0
- Socket.IO chat is always-on — no disconnections from sleep
- BullMQ workers process jobs continuously — no job loss from sleep
- Cloudflare Pages with Nairobi PoP gives Ethiopian users ~20ms static asset latency vs ~80ms from Vercel Johannesburg PoP
- Oracle VM IP is hidden behind Cloudflare proxy — DDoS protection is always-on
- Supabase pause risk is eliminated by two layers: backend keep-alive ping every 4 minutes + `supabase-keepalive.yml` GitHub Actions cron every 5 days
- GitHub Actions pipeline changes are minimal: Render CLI (~40 lines) replaced with a 5-line Coolify webhook curl; Vercel job replaced with an informational log (CF Pages auto-deploys via GitHub integration)
- Contingency: if Oracle cuts the free tier again, Hetzner CAX11 (€4.29/month ARM, Germany) is the fallback — migration takes ~2 hours with zero data loss (all data is external: Supabase, R2, Upstash)

---

## ADR-016: Development stack migration — Render (backend) + Vercel (frontend)

**Status:** Accepted | **Date:** September 2026

**Context:** ADR-015 decided on Oracle Cloud Johannesburg + Coolify v4 + Cloudflare Pages. That stack required a credit card for Oracle identity verification. The developer has a Grey virtual card with $0.00 balance and no way to add funds from Ethiopia through local banking at this stage. The project is in active development — not yet launched with real users or real payments.

**Problem:** Cannot provision Oracle Cloud VM without a valid card for identity verification. All alternatives that require a card (Koyeb, Fly.io) are also blocked. The project needs a working deployment to demo features and test Google OAuth with a real public URL.

**Options considered:**

| Option | Card needed? | Always-on? | Verdict |
|---|---|---|---|
| Oracle + Coolify | ✅ Yes ($1 hold) | Yes | ❌ Blocked |
| Koyeb free | ✅ Yes ($29 hold) | Yes | ❌ Blocked |
| Railway trial | ❌ No | Yes ($1/mo after 30 days) | ⚠️ Limited |
| **Render free** | **❌ No** | **No (15min sleep)** | **✅ Chosen** |
| **Vercel Hobby** | **❌ No** | **N/A (frontend)** | **✅ Chosen** |

**Decision:** Use **Render free tier** for the backend and **Vercel Hobby** for the frontend during the development/demo phase.

**Rationale:**

- **Render:** No card, no credit required. GitHub login only. Render free tier sleeps after 15 minutes of inactivity — acceptable for demos and testing. The backend already has a self-ping in `index.ts` (every 10 min) which keeps it awake during active use. Deploy hooks integrate cleanly with the existing GitHub Actions pipeline.
- **Vercel:** Already working at `nodbusiness.vercel.app`. No card. The app was deployed here before and the configuration is intact. The Hobby ToS (non-commercial only) is acceptable at zero-revenue development stage — upgrade to Pro ($20/mo) before real payments go live.

**Consequences:**
- Monthly cost: $0
- No credit card required for either service
- Render free tier will sleep after idle periods — acceptable for dev/demo, not for production
- Google OAuth works with `nodbusiness.vercel.app` as the authorized redirect URI
- GitHub Actions pipeline: `deploy-backend` fires Render deploy hook, `deploy-frontend` uses Vercel CLI
- When developer gets $1 on Grey card: upgrade to Oracle + Coolify (ADR-015) for always-on production
- All data (Supabase, R2, Upstash) is external — zero migration effort when upgrading compute
