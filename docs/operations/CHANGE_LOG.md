# Nodbusiness — Platform Changelog

> Every significant deployment and milestone recorded here.
> Used by: DevOps panel, team, investors, and support.
> Format: newest first. One entry per deploy or milestone.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| UI | User Interface |
| UX | User Experience |
| DB | Database |
| CI/CD | Continuous Integration / Continuous Delivery |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| PWA | Progressive Web App |
| SEO | Search Engine Optimization |
| RTL | Right-to-Left text direction |
| CORS | Cross-Origin Resource Sharing |
| AML | Anti-Money Laundering |
| KYC | Know Your Customer |

---

## How to Add a Changelog Entry

When you deploy, add an entry at the top of the DEPLOYED section:

```markdown
### vX.Y.Z — Month Day, Year
**Type:** feat | fix | perf | security | infra | docs
**Impact:** What users notice
- Brief bullet of what changed
- Another bullet
```

---

## Deployed

---

### v1.0.0 — August 2026
**Type:** security + fix + docs
**Impact:** Major security hardening pass; TypeScript backend complete; test suite restored to 257 green

**Security**
- Access-token type enforcement: refresh tokens no longer work as Bearer credentials (`middleware/auth.ts`, Socket.IO handshake — with revocation + ban checks)
- OTPs now generated with CSPRNG (`crypto.randomBytes`); null-safe verification
- Password-reset tokens stored hashed (SHA-256), not plaintext
- SQL injection closed: `sanitizeColumn()` in crud helpers + field allowlists on orders/devops; `resolved_at` set-bug fixed in devops
- Mass-assignment protection on order create/update (role-scoped status transitions, money/ownership fields stripped)
- Wallet Chapa top-up verify made concurrency-safe (transactional claim, underpayment rejection); sandbox pages 404 in production
- SSRF hardening: redirects rejected on proxy fetch; IPv6 ULA/link-local/multicast/NAT64 blocked; proxy rate-limit key uses validated `req.ip`
- Stripe webhook idempotency made atomic (claim + release-on-failure)
- Feed cache isolated per user (was serving one user's personalized feed to another); personalized responses now `Cache-Control: private`
- 5xx error messages no longer leak internals; single crash-handler owner; safe ROLLBACKs

**Fixes / infra**
- Jest configured for TypeScript (ts-jest) — all 17 suites, 257 tests passing (were 14 broken suites)
- Frontend: client-error reporter env var fixed (reports were going nowhere); root + global error boundaries added; `useAuth` guard made real; lint errors cleared; production build verified

**Docs**
- Documentation audit completed across all 170+ files: canonical severity matrix, money model, postmortem template created; fictional endpoints/commands removed; commission/currency/age policies reconciled

---

### v0.9.5 — August 2026
**Type:** feat + security + docs
**Impact:** DevOps live error feed; full docs reorganization; frontend errors auto-reported

- Added `error_events` table (migrate30.js) for real-time error capture
- Added `backend/lib/errorCollector.ts` — all server errors auto-captured to DB
- Added `GlobalErrorReporter.tsx` — frontend JS errors reported to DevOps
- ErrorBoundary updated to also report React render errors
- DevOps panel: new "Live Errors" tab with auto-poll every 15 seconds
- Errors can be resolved or converted to bug tickets from DevOps panel
- Added `GET /api/docs/library` — full docs/ folder browser in DevOps
- Added `GET /api/docs/search` — full-text search across all 90+ docs files
- DevOps Knowledge Base: new "Docs Library" tab with folder browser + search
- Docs reorganization: new `docs/decisions/` folder for engineering decisions
- Merged NORTH_STAR.md + NORTH_STAR_METRICS.md into single file
- Added `docs/operations/ON_CALL.md`, `docs/product/FEATURE_FLAGS.md`

---

### v0.9.4 — August 2026
**Type:** feat + docs
**Impact:** Complete documentation suite for global operations

- Added `docs/compliance/` — AML/KYC policy, data governance, regulatory map
- Added `docs/trust-safety/` — fraud prevention, content moderation, community standards
- Added `docs/support/` — customer support framework, crisis communication
- Added `docs/finance/` — financial model, controls, tax structure
- Added `docs/brand/` — brand book, voice & tone, PR strategy
- Added `docs/people/` — org chart, hiring plan, culture, compensation, remote work
- Added `docs/investor/` — fundraising, pitch materials, legal docs, cap table
- Added `docs/patent/` — patent strategy, competitive analysis, provisional filings

---

### v0.9.3 — August 2026
**Type:** feat
**Impact:** DevOps Knowledge Base reads all strategy/spec docs in-panel

- Added `GET /api/docs/strategy/versions` — reads docs/strategy versions
- Added `GET /api/docs/implementation` — reads implementation plan specs
- Added `GET /api/docs/progress` — aggregates task completion %
- Added `GET /api/docs/file` — reads any doc file safely
- DevOps panel: Knowledge Base section with strategy, specs, and notes tabs

---

### v0.9.2 — August 2026
**Type:** feat
**Impact:** Admin panel rebuilt; DevOps upgraded

- Admin panel: 8 tabs (Overview, Users, Content, Orders, Reports, Verification, Feature Flags, Platform)
- Feature Flags tab: live toggle for all platform flags
- Revenue charts using Recharts
- DevOps: 5 sections (System Health, Strategy Board, Kanban, Changelog, Project Summary)
- System Health: live `/health` polling every 30 seconds
- Strategy Board: version tracker synced to DB

---

### v0.9.1 — August 2026
**Type:** feat + infra
**Impact:** Platform renamed to Nodbusiness; global positioning

- Brand rename from Empire X → Nodbusiness across 124+ files
- Domain updated to nodbusiness.vercel.app
- Removed all Ethiopia-specific UI text and phone formats from non-locale strings
- Seed script updated for global structure
- Removed faker-generated test data from production DB (150 businesses, 50 users)

---

### v0.9.0 — August 2026
**Type:** security
**Impact:** Improved session security

- HttpOnly refresh token (TD-001): 15-min access token + 7-day HttpOnly cookie
- Added `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/logout-all`
- JWT revocation blocklist via Redis (TD-005): `jti` claim + `revoke_before` per-user timestamp
- Removed all `@ts-nocheck` directives (TD-006): zero TypeScript errors in source files
- Wallet topup requires admin role in production (TD-002)

---

### v0.8.0 — July 2026
**Type:** feat
**Impact:** Full-stack platform launch

- Social feed (posts, images, likes, comments, stories)
- Marketplace (products, variants, cart, orders)
- Stripe payment integration (checkout session + webhook)
- Chapa payment integration (ETB — reference market)
- Showroom Studio (27 templates)
- Real-time chat (Socket.IO — DMs + group conversations)
- Task marketplace (post, bid, accept, complete)
- Nearby map (Leaflet — products, businesses, tasks)
- Push notifications (Web Push API + VAPID)
- Wallet (balance, topup, withdraw)
- Jobs board
- Events ticketing
- Courses marketplace
- Admin panel (v1)
- AI product description generator
- Google OAuth
- Referral program
- Delivery tracking
- Return requests
- Product variants
- Coupons
- Hashtags + polls
- Wishlists + price alerts
- Commission system (3% on orders)

---

## Planned (Next Release)

### v1.0.0 — Target: Q4 2026
**Type:** feat
**Focus:** Production readiness + global launch

- [ ] Activate Redis (Upstash) — queues, presence, caching
- [ ] Activate Cloudflare R2 — persistent file storage
- [ ] Full frontend Sentry integration
- [ ] Playwright E2E test suite for critical flows
- [ ] Backend TypeScript migration (incremental)
- [ ] Multi-currency display (ETB + USD + KES)
- [ ] Amharic language pack complete
- [ ] Mobile PWA optimizations (offline mode, install prompt)
- [ ] Escrow payment hold (requires payment license)
- [ ] B2B bulk ordering

---

*Maintained by: Engineering team. Update on every deploy.*
*Format: Keep newest first. Be specific about what changed and who it affects.*
