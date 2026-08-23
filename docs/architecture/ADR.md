# Nodbusiness — Architecture Decision Records (ADRs)

> ADRs document the *why* behind key architectural choices.
> Each record captures the context, the options considered, the decision made, and its consequences.
> When making a significant architectural decision, add a new ADR here.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| ADR | Architecture Decision Record — log of why each tech decision was made |
| API | Application Programming Interface |
| JWT | JSON Web Token — compact signed token for authentication |
| XSS | Cross-Site Scripting — injection attack via malicious scripts |
| CSP | Content Security Policy — HTTP header preventing XSS |
| CORS | Cross-Origin Resource Sharing — browser security policy for API access |
| ORM | Object-Relational Mapping — database abstraction layer (e.g., Prisma) |
| SQL | Structured Query Language |
| SPA | Single Page Application |
| SEO | Search Engine Optimization |
| CDN | Content Delivery Network |
| PWA | Progressive Web App |
| TTL | Time to Live — cache expiry duration |
| DDoS | Distributed Denial of Service — network flood attack |
| SSR | Server-Side Rendering |
| CI/CD | Continuous Integration / Continuous Delivery |
| LLM | Large Language Model — AI text generation model |
| HMAC | Hash-based Message Authentication Code |
| PII | Personally Identifiable Information |

---

## ADR-001: Next.js App Router as primary frontend

**Status:** Accepted | **Date:** July 2026

**Context:** Nodbusiness started with React + Vite. Public-facing pages (showrooms, product listings, public profiles) need SEO (Search Engine Optimization) and server-rendering. Server Components reduce client-side JavaScript bundle size.

**Options:** Keep Vite SPA · Hybrid (Next.js for public, Vite for app) · Full Next.js migration

**Decision:** Adopt Next.js 16 App Router as the single frontend (`frontend-next/`). The Vite app has been removed.

**Consequences:** `NEXT_PUBLIC_` env prefix required. `'use client'` directive needed for browser APIs. All new features go in `frontend-next/` only.

---

## ADR-002: Modular monolith over microservices

**Status:** Accepted | **Date:** July 2026

**Context:** 9+ feature domains. Microservices add significant operational overhead for a small team.

**Decision:** One deployable backend with domain-separated route modules. Extract to separate services only when a module needs independent scaling.

**Consequences:** Simpler deployment, easier debugging, lower cost. Module boundaries are already clean for future extraction.

---

## ADR-003: Raw parameterized SQL over ORM

**Status:** Accepted (revisit at TypeScript migration) | **Date:** July 2026

**Context:** Prisma/Drizzle add type safety but require a build step and schema maintenance. Speed of iteration matters more at MVP (Minimum Viable Product).

**Decision:** Raw SQL with `backend/utils/crud.ts` helpers. `ALLOWED_TABLES` Set prevents SQL injection via dynamic table names.

**Future:** Adopt Prisma when backend migrates to TypeScript.

---

## ADR-004: HttpOnly cookie for refresh token + short-lived access token

**Status:** Accepted | **Date:** August 2026 (supersedes original localStorage approach)

**Context:** HttpOnly cookies are immune to XSS — JavaScript cannot read them. Next.js middleware needs the JWT (JSON Web Token) for route protection.

**Decision:**
- Access token: 15-minute lifetime, stored in-memory only (never localStorage)
- Refresh token: 7-day lifetime, set as HttpOnly cookie by backend on every login
- 401 interceptor silently calls `POST /api/auth/refresh` once before redirecting to login
- `POST /api/auth/logout` revokes refresh token and clears cookie

**Consequences:** Eliminates XSS-based token theft risk. Adds one round-trip on token expiry. Backward-compatible with existing auth flow.

---

## ADR-005: Multi-origin CORS via comma-separated FRONTEND_URL

**Status:** Accepted | **Date:** July 2026

**Context:** The app uses a single Next.js frontend on port 3000, but deployments need multiple allowed origins (local dev, Vercel preview deployments, staging, production).

**Decision:** Parse `FRONTEND_URL` as a comma-separated list. In development, local frontend origins (`localhost:3000`, `localhost:5173`) are added automatically. Wildcard patterns supported (e.g., `https://*.vercel.app`).

**Consequences:** Single env var controls all allowed origins. Backward compatible (single URL without comma still works).

---

## ADR-006: AI provider abstraction layer

**Status:** Accepted | **Date:** July 2026

**Context:** AI provider pricing and capabilities change frequently. Vendor lock-in is risky.

**Decision:** All AI calls via `backend/lib/ai.js`. Switch provider by changing `AI_PROVIDER` env var — no code changes.

**Future:** Add fallback chain: OpenAI → Gemini → Anthropic → Local LLM (Large Language Model).

---

## ADR-007: Feature flags with percentage rollouts

**Status:** Accepted | **Date:** July 2026

**Context:** Releasing features to all users at once risks outages. Staged rollout catches issues early.

**Decision:** `backend/lib/featureFlags.ts` — env var override (instant) > Redis override (real-time) > hardcoded defaults. Percentage rollout uses deterministic user ID hash so the same user always gets the same experience.

**Consequences:** Any feature can be disabled instantly without a deploy. Rollout percentage is configurable via admin panel.

---

## ADR-008: BullMQ queue with synchronous fallback

**Status:** Accepted | **Date:** July 2026

**Context:** Background jobs require Redis. Redis is optional in development.

**Decision:** When `REDIS_URL` is not set, jobs run synchronously in-process. Same code path — no dev/prod divergence.

**Consequences:** Emails and notifications work in dev without Redis. In production, Redis enables true async processing and retries.

---

## ADR-009: Cloudflare R2 for file storage

**Status:** Accepted | **Date:** July 2026

**Context:** Local disk breaks with multiple instances. AWS S3 has egress fees that are expensive for media-heavy traffic.

**Decision:** Cloudflare R2 — S3-compatible API, zero egress fees, Cloudflare CDN (Content Delivery Network) built-in. Auto-detected in upload middleware.

**Consequences:** Files persist across deploys. Global CDN reduces latency for users worldwide. No egress cost when serving images.

---

## ADR-010: Socket.IO for real-time (self-hosted)

**Status:** Accepted | **Date:** July 2026

**Context:** Real-time chat needs WebSockets. Managed services (Ably, Pusher) cost money at scale.

**Decision:** Socket.IO inside the Express server. Redis Pub/Sub adapter enables scaling across multiple instances.

**Consequences:** Zero external service cost. Redis dependency for multi-instance scaling. Falls back to polling if WebSocket upgrade fails.

---

## ADR-011: PostgreSQL as the only database

**Status:** Accepted | **Date:** July 2026

**Context:** Multiple specialized databases increase operational complexity.

**Decision:** PostgreSQL for everything — relational data, JSONB documents, full-text search, array types. Add specialized databases only when PostgreSQL becomes a proven bottleneck for a specific use case.

**Consequences:** One backup strategy, one monitoring setup, one query language. JSONB enables document-style storage where needed without a separate NoSQL database.

---

## ADR-012: ALLOWED_TABLES allowlist in crud.ts

**Status:** Accepted | **Date:** July 2026

**Context:** Raw SQL with dynamic table names is a SQL injection vector if table names ever come from user input.

**Decision:** Add `ALLOWED_TABLES` Set to `crud.ts`. Every CRUD (Create, Read, Update, Delete) function validates the table name before executing SQL. Unknown tables throw `Error('Invalid table name: ...')` before any SQL executes.

**Consequences:** SQL injection via table name parameter is impossible. New tables added to CRUD operations must be consciously added to the allowlist.

---

## ADR-013: Error capture to DB via errorCollector.ts

**Status:** Accepted | **Date:** August 2026

**Context:** Sentry alone does not give engineers immediate visibility into errors within the DevOps panel. Engineers need to see, resolve, and convert errors to tickets without switching tools.

**Decision:** All backend errors (uncaught exceptions, unhandled rejections, route errors) are captured to `error_events` PostgreSQL table via `backend/lib/errorCollector.ts`. Frontend errors are captured via `GlobalErrorReporter.tsx` and reported to `POST /api/devops/errors/report`.

**Consequences:** DevOps panel shows real-time error feed. Errors can be resolved and converted to bug tickets from within the app. Sentry remains as secondary for external alerting. Errors are deduplicated by fingerprint — same error fires once, increments occurrence counter.

---

## ADR-014: Global platform targeting (not Ethiopia-only)

**Status:** Accepted | **Date:** August 2026

**Context:** Original platform was designed for Ethiopia. Platform vision is global — any business anywhere can use Nodbusiness.

**Decision:** All UI text, defaults, and documentation target global users. Ethiopian context (ETB currency, Chapa payment, Amharic language, Ethiopian examples) is preserved as a reference and example, not as the primary framing. Currency defaults to USD or user's local currency. Language defaults to English with Amharic as supported locale.

**Consequences:** Broader addressable market. Ethiopian users remain fully supported. All docs updated to use global framing with Ethiopian context as examples.

---

## How to Add New ADRs

```markdown
## ADR-NNN: [Short title]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Date:** Month Year

**Context:** [What problem are we solving? Why does this decision matter?]

**Options:** [List the alternatives you considered]

**Decision:** [What did you decide?]

**Consequences:** [What are the trade-offs? What gets better? What gets harder?]
```
