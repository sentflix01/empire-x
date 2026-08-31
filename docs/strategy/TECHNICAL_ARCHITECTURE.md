# Nodbusiness — Technical Architecture (Deep Dive)

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| CSP | Content Security Policy |
| CDN | Content Delivery Network |
| DB | Database |
| DBaaS | Database as a Service |
| DNS | Domain Name System |
| DDoS | Distributed Denial of Service |
| DLQ | Dead Letter Queue |
| E2E | End-to-End |
| gRPC | Google Remote Procedure Call |
| HTTP | Hypertext Transfer Protocol |
| JWT | JSON Web Token |
| mTLS | Mutual TLS |
| PWA | Progressive Web App |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SLA | Service Level Agreement |
| SLO | Service Level Objective |
| SSRF | Server-Side Request Forgery |
| TLS | Transport Layer Security |
| TTL | Time To Live |
| WAF | Web Application Firewall |
| WebSocket | Full-duplex communication protocol over HTTP |
| WAF | Web Application Firewall |

---

## 1. System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                                    │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬───────────┤
│  Stripe     │   Chapa     │   M-Pesa    │  Telebirr   │  Firebase   │  SendGrid │
│  (Cards)    │  (ETB)      │  (KES)      │  (ETB)      │  (Push)     │  (Email)  │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴─────┬────┘
       │             │             │             │             │            │
       ▼             ▼             ▼             ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN (Cloudflare / Vercel Edge)                 │
│  • WAF + DDoS protection  • CSP headers  • Bot mitigation  • Geo-routing       │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          NEXT.JS FRONTEND (Vercel / Railway)                    │
│  • App Router (RSC + Client Components)  • Middleware (auth, i18n, CSP)        │
│  • TanStack Query (server state)  • Redux Toolkit (client state)               │
│  • Socket.IO client  • next/image (AVIF/WebP)  • PWA (Workbox)                 │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   EXPRESS API           │ │  SOCKET.IO      │ │  EXTERNAL       │
│  (Railway / K8s)        │ │  (Redis Adapter)│ │  DATA GATEWAY   │
│                         │ │                 │ │  (SSRF-Safe)    │
│  • REST + OpenAPI       │ │  • Real-time    │ │  • AES-256-GCM  │
│  • JWT (HttpOnly)       │ │  • Presence     │ │  • SSRF Block   │
│  • RBAC + Feature Flags │ │  • Typing ind.  │ │  • Quotas/Cache │
│  • Audit Logging        │ │  • Notifications│ │  • Health Tele. │
└───────────┬─────────────┘ └────────┬────────┘ └────────┬────────┘
            │                        │                   │
            ▼                        ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                          │
├──────────────────┬──────────────────┬──────────────────┬────────────────────────┤
│  PostgreSQL 17   │   Redis 7        │   Object Store   │   Search (Future)      │
│  (Primary)       │   (Cache/Socket) │   (R2 / S3)      │   (Meilisearch/Typesense)│
│                  │                  │                  │                        │
│  • Users         │  • Session       │  • Images        │  • Full-text           │
│  • Showrooms     │  • Pub/Sub       │  • Documents     │  • Faceted             │
│  • Products      │  • Rate Limit    │  • Backups       │  • Geo                 │
│  • Orders        │  • Cache         │  • Exports       │  • Autocomplete        │
│  • Wallet        │  • Socket State  │                  │                        │
│  • Audit Logs    │                  │                  │                        │
└──────────────────┴──────────────────┴──────────────────┴────────────────────────┘
```

---

## 2. Backend Architecture (Express + TypeScript)

### 2.1 Module Structure

```
backend/
├── index.ts                    # App entry, middleware chain, route registration
├── socket.ts                   # Socket.IO server, Redis adapter, namespaces
├── db/
│   ├── pool.ts                 # pg.Pool with Neon/pgbouncer config, SSL
│   ├── migrate*.js             # 36 migrations (schema + seed + indexes)
│   └── migrate-all.js          # Migration runner
├── routes/                     # 48 route files (~44 registered route groups)
│   ├── auth.ts                 # Auth: register, login, OTP, refresh, password reset
│   ├── wallet.ts               # Wallet: balance, topup (Stripe/Chapa), withdraw, debit, refund
│   ├── orders.ts               # Orders: CRUD, checkout (Chapa/Stripe/COD), webhooks
│   ├── products.ts             # Products: CRUD, variants, search, filters
│   ├── showrooms.ts            # Showrooms: CRUD, sections, templates, publish
│   ├── externalSources.ts      # PATENT 4: source registration, field mappings
│   ├── commission.ts           # Commission collection + quality-adjusted share
│   ├── devops.ts               # Health, telemetry, copilot, error feed, scorecard
│   ├── admin.ts                # Admin: users, flags, verification, platform metrics
│   └── ... (38 more)
├── lib/                        # Cross-cutting concerns
│   ├── auditLogger.ts          # Immutable financial audit trail
│   ├── copilot.ts              # Ops Copilot (11 intents)
│   ├── errorCollector.ts       # Global error capture + dedup
│   ├── featureFlags.ts         # 18 flags (env > Redis > defaults)
│   ├── rateLimiter.ts          # Redis fixed-window + fail-open
│   ├── scorecard.ts            # 11-dimension readiness grader
│   ├── showroomDoctor.ts       # Deterministic diagnosis engine (12 rules)
│   ├── telemetry.ts            # Event ledger (telemetry_events table)
│   └── ...
├── middleware/
│   ├── auth.ts                 # JWT verify, requireAuth, requireAdmin
│   ├── cache.ts                # Response caching headers
│   ├── httpLogger.ts           # Structured request logging
│   └── upload.ts               # Multer + magic-byte validation (no SVG)
├── services/
│   ├── credentialEncryption.ts # AES-256-GCM per-tenant key derivation (HKDF)
│   ├── proxyGateway.ts         # PATENT 4: SSRF-safe fetch, quota, cache, health
│   ├── ssrfValidator.ts        # DNS resolve + IPv4/IPv6 private blocklist
│   └── ...
├── test/                       # 24 suites / 299 tests
│   ├── integration/            # API contract tests
│   ├── __tests__/              # Unit tests (auditLogger, etc.)
│   └── helpers/                # Mock pools, test utilities
└── scripts/
    ├── backup-database.js      # Daily pg_dump → R2
    └── verify-backup.js        # Restore verification
```

### 2.2 Request Flow (Authenticated API Call)

```
Client Request
     │
     ▼
┌─────────────────────────────────────┐
│ Middleware Chain                    │
├─────────────────────────────────────┤
1. requestId()        ← UUID per req  │
2. httpLogger()       ← Structured log │
3. cache()            ← ETag/304      │
4. auth.requireAuth() ← JWT verify    │
     │  (HttpOnly cookie → memory)     │
     ▼
┌─────────────────────────────────────┐
│ Route Handler                       │
├─────────────────────────────────────┤
• Validate input (Zod/JSON schema)    │
• Feature flag check (isEnabled)      │
• RBAC check (role, ownership)        │
• Business logic                      │
• atomicWalletOp (SELECT FOR UPDATE)  │
• auditLog() fire-and-forget          │
• telemetry.recordEvent()             │
     │
     ▼
┌─────────────────────────────────────┐
│ Response                            │
├─────────────────────────────────────┤
• Standardized envelope (data/error)  │
• CSP headers                         │
• Rate-limit headers                  │
• Correlation ID                      │
└─────────────────────────────────────┘
```

### 2.3 Key Patterns

| Pattern | Implementation | Where |
|---------|---------------|-------|
| **Atomic Wallet Ops** | `SELECT FOR UPDATE` + single transaction | `wallet.ts::atomicWalletOp` |
| **Idempotent Webhooks** | `UPDATE ... WHERE type='pending' RETURNING` | `orders.ts` Stripe/Chapa verify |
| **Feature Flags** | Env → Redis → Defaults (20 flags) | `lib/featureFlags.ts` |
| **Rate Limiting** | Redis INCR fixed window, fail-open | `lib/rateLimiter.ts` |
| **Audit Logging** | Non-blocking INSERT, never throws | `lib/auditLogger.ts` |
| **Error Capture** | Console.error + onerror + unhandledrejection → backend | `GlobalErrorReporter` |
| **Health Telemetry** | Per-source circuit breaker + stale cache | `lib/proxyGateway.ts` |

---

## 3. Frontend Architecture (Next.js 16 App Router)

### 3.1 Route Structure

```
frontend-next/app/
├── (app)/                    # Authenticated routes
│   ├── layout.tsx            # AppLayout + Providers
│   ├── page.tsx              # Home feed
│   ├── explore/              # Discover (map, search, categories)
│   ├── marketplace/          # Product browsing
│   ├── wallet/               # Wallet dashboard + topup
│   ├── orders/               # Order history + details
│   ├── messages/             # Real-time chat
│   ├── showroom/             # Builder wizard + public view
│   ├── admin/                # Admin dashboard (devops, users, flags)
│   ├── devops/               # Live error feed, copilot, scorecard
│   └── ... (25 more)
├── (auth)/                   # Public auth routes
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
├── landing/                  # Marketing landing page
├── p/[username]/             # Public showroom (PWA)
├── choose-account/           # Role selection
├── globals.css               # Tailwind + CSS variables
├── layout.tsx                # Root layout (providers, fonts)
├── error.tsx                 # Root error boundary
├── global-error.tsx          # App-wide error boundary
├── robots.ts                 # SEO
└── sitemap.ts                # SEO
```

### 3.2 State Management

| Layer | Tool | Scope |
|-------|------|-------|
| **Server State** | TanStack Query v5 | API cache, mutations, invalidation |
| **Client State** | Redux Toolkit | Auth, cart, bookmarks, feed, notifications |
| **Real-time** | Socket.IO client | Presence, typing, messages, notifications |
| **Forms** | React Hook Form + Zod | Validation, submission |
| **i18n** | react-i18next | Amharic + English (RTL ready) |

### 3.3 Component Architecture

```
components/
├── ui/                       # 30+ primitives (Button, Input, Dialog, etc.)
├── layout/                   # AppLayout, Header, Sidebar, Footer
├── feed/                     # PostCard, CreatePostForm, TickerBar
├── marketplace/              # ProductCard, ProductGrid, Filters
├── product/                  # ProductDetail, PurchaseModal
├── checkout/                 # PurchaseModal, DeliveryForm
├── messaging/                # ChatRoom, ConversationList
├── showroom/                 # SectionRenderer, BuilderWizard, FieldMapper
├── devops/                   # OpsCopilot, LiveErrorFeed, Scorecard
├── profile/                  # ProfileEdit, VerificationRequest
├── tasks/                    # TaskCard, BidModal
├── analytics/                # Charts, MetricsCards
├── settings/                 # AccountSettings, Privacy
└── ui/                       # Reusable primitives (shadcn-based)
```

### 3.4 Data Fetching Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| **Server Components** | Initial page data, SEO | `app/(app)/page.tsx` |
| **Client Components + TanStack Query** | Interactive data, mutations | `views/Orders.tsx` |
| **Entities API** | Typed CRUD with keyset pagination | `api/entities.ts` |
| **Optimistic Updates** | Cart, bookmarks, likes | `store/cartSlice.ts` |
| **Real-time Sync** | Socket events → query invalidation | `lib/socket.ts` |

---

## 4. Data Layer

### 4.1 PostgreSQL Schema (Key Tables)

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | Core identity, roles, verification | `idx_users_email`, `idx_users_referral` |
| `wallets` | Balance per user | `idx_wallets_user` |
| `wallet_transactions` | Immutable ledger | `idx_wtx_wallet`, `idx_wtx_ref` |
| `audit_logs` | Financial audit trail | `idx_audit_actor`, `idx_audit_action`, `idx_audit_entity`, `idx_audit_time` |
| `showrooms` | Business sites | `idx_showrooms_owner`, `idx_showrooms_slug` |
| `sections` | Composable page sections | `idx_sections_showroom`, `idx_sections_type` |
| `field_mappings` | PATENT 4: source→display mappings | `idx_fm_source`, `idx_fm_section` |
| `external_data_sources` | PATENT 4: tenant-registered endpoints | `idx_eds_user`, `idx_eds_showroom` |
| `products` | Catalog items | `idx_products_seller`, `idx_products_status_cat` |
| `orders` | Commerce transactions | `idx_orders_buyer`, `idx_orders_seller`, `idx_orders_status` |
| `commissions` | Platform revenue | `idx_comm_seller`, `idx_comm_order` |
| `messages` | Real-time chat | `idx_msg_conv`, `idx_msg_user` |
| `conversations` | Chat threads | `idx_conv_user1`, `idx_conv_user2` |
| `notifications` | In-app + push | `idx_notif_user`, `idx_notif_read` |
| `telemetry_events` | DevOps event ledger | `idx_tel_type`, `idx_tel_time` |
| `external_health_records` | PATENT 4: gateway health | `idx_ehr_source`, `idx_ehr_time` |
| `feature_flags` | 18 runtime flags | `idx_ff_key` |

### 4.2 Redis Usage

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `session:{userId}` | 7d | Refresh token tracking |
| `ratelimit:{ip}:{route}` | 60s | API rate limiting |
| `socket:{userId}` | — | Socket.IO pub/sub |
| `cache:{queryHash}` | 60–300s | Response caching |
| `flag:{flagName}` | — | Feature flag overrides |
| `presence:{userId}` | 30s | Online/offline status |

---

## 5. Security Architecture

### 5.1 Defense in Depth

| Layer | Controls |
|-------|----------|
| **Network** | Private subnets, security groups, Cloudflare WAF, geo-blocking |
| **Transport** | TLS 1.3 everywhere, HSTS, mTLS for service-to-service |
| **Application** | CSP (strict), JWT in HttpOnly cookie, CSRF via SameSite, input validation (Zod) |
| **Data** | AES-256-GCM at rest (credentials), field-level encryption (PII), parameterized queries |
| **Runtime** | Non-root containers, read-only FS, dropped capabilities, seccomp profile |
| **Supply Chain** | Dependabot, npm audit, SBOM, signed images |

### 5.2 Auth Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LOGIN     │────▶│  ISSUE JWT  │────▶│  SET COOKIE │
│  (email/    │     │  (access:   │     │  (HttpOnly, │
│   password) │     │   15min)    │     │   Secure,   │
│             │     │  refresh:   │     │   SameSite) │
└─────────────┘     │  7d)        │     └─────────────┘
                    └─────────────┘
                           │
                           ▼
┌─────────────────────────────────────────┐
│  SUBSEQUENT REQUESTS                    │
├─────────────────────────────────────────┤
1. Cookie sent automatically              │
2. Middleware verifies JWT signature      │
3. Checks refresh token in DB (revoked?)  │
4. If access expired → silent refresh     │
5. Attach user to req.user                │
└─────────────────────────────────────────┘
```

### 5.3 PATENT 4 Security (External Data Gateway)

| Threat | Mitigation |
|--------|------------|
| SSRF | DNS resolve → IPv4/IPv6 private blocklist (RFC1918, loopback, link-local, unique-local) |
| Redirect attacks | `redirect: 'error'` in fetch options |
| Credential theft | AES-256-GCM per-tenant key (HKDF from master), never logged |
| Upstream abuse | Per-tenant-per-section quota (Redis INCR), 30s timeout |
| Cache poisoning | Cache key includes tenant+section+source; TTL per source |
| Observability gaps | Every attempt → health record (success/failure, latency, error class) |
| Degradation | Circuit breaker (5 failures → 5min cooldown) + stale cache fallback |

---

## 6. Observability & Reliability

### 6.1 The Three Pillars

| Pillar | Implementation |
|--------|----------------|
| **Metrics** | Prometheus-format `/metrics` (custom + Node.js), Grafana dashboards |
| **Logs** | Structured JSON (Pino), correlation IDs, Loki aggregation |
| **Traces** | OpenTelemetry (Node.js auto-instrumentation), Jaeger |

### 6.2 DevOps Console (Built-In)

| Feature | Endpoint | Purpose |
|---------|----------|---------|
| Health Summary | `GET /api/devops/health-summary` | System status + component health |
| Live Error Feed | `GET /api/devops/telemetry` | Real-time error stream (deduped) |
| Ops Copilot | `POST /api/devops/copilot` | 11-intent natural language ops |
| Readiness Scorecard | `GET /api/devops/scorecard` | 11-dimension graded audit |
| Task Log | `GET /api/devops/task-log` | Auto-generated implementation log |
| Alerting | `lib/alerts.ts` + Telegram | SEV1 paging, threshold-based |

### 6.3 SLOs

| Service | SLO | Measurement |
|---------|-----|-------------|
| API p99 latency | <200ms | Histogram (Prometheus) |
| API error rate | <0.1% | Counter (5xx / total) |
| Socket delivery | >99.9% | Acknowledged / sent |
| Webhook processing | <5s p99 | Histogram |
| DB query p95 | <50ms | pg_stat_statements |
| Backup success | 100% daily | `backup_status` in app_settings |
| Restore verification | Weekly | `scripts/verify-backup.js` |

---

## 7. Deployment Architecture

### 7.1 Environments

| Env | Purpose | Infra | Data |
|-----|---------|-------|------|
| **Local** | Development | Docker Compose | Local PG 17, Redis |
| **Staging** | Integration testing | Railway (preview) | Neon branch DB |
| **Production** | Live traffic | Railway (primary) + Vercel (FE) | Neon PG + Upstash Redis + R2 |

### 7.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS                                             │
├─────────────────────────────────────────────────────────────┤
│  1. LINT + TYPECHECK (blocking)                             │
│     • npx tsc --noEmit (FE + BE)                            │
│     • npx eslint (FE)                                       │
│     • npx jest --runInBand (BE)                             │
│     • npx vitest run (FE)                                   │
│                                                             │
│  2. BUILD (blocking)                                        │
│     • next build (FE)                                       │
│     • tsc (BE)                                              │
│                                                             │
│  3. E2E TESTS (blocking)                                    │
│     • npx playwright test (9 specs)                         │
│                                                             │
│  4. DEPLOY (workflow_run, only after green CI)              │
│     • Railway deploy (BE)                                   │
│     • Vercel deploy (FE)                                    │
│     • Health check + Telegram alert on failure              │
│                                                             │
│  5. DOCS SYNC (scheduled + on deploy)                       │
│     • Production encyclopedia → docs/Production             │
│     • API reference (OpenAPI)                               │
│     • Implementation log (git history)                      │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Rollback Strategy

| Trigger | Action |
|---------|--------|
| Health check fails post-deploy | Auto-rollback (Railway/Vercel) |
| Error rate > 1% for 5min | Alert → manual rollback |
| Database migration failure | `migrate-down` + deploy previous |
| Critical security issue | Immediate revert + patch |

---

## 8. Scaling Strategy

### 8.1 Horizontal Scaling Targets

| Component | Current | Year 1 | Year 3 | Scaling Approach |
|-----------|---------|--------|--------|------------------|
| API Workers | 2 | 6 | 20+ | Stateless, Railway horizontal |
| Socket.IO | 1 (Redis adapter) | 3 | 10+ | Redis pub/sub + sticky sessions |
| PostgreSQL | Single (Neon) | Read replicas | Multi-region + read replicas | Neon autoscaling + PgBouncer |
| Redis | Single (Upstash) | Cluster | Cluster + replicas | Upstash auto-tiering |
| Object Storage | R2 | R2 | R2 + multi-region | Cloudflare R2 global |

### 8.2 Database Scaling

| Phase | Strategy |
|-------|----------|
| **0–10K MAU** | Single Neon instance, PgBouncer, connection pooling |
| **10K–100K MAU** | Read replicas for analytics/feed queries, write primary |
| **100K–1M MAU** | Sharding by `showroom_id` (tenant isolation), Vitess/pg_shard |
| **1M+ MAU** | Multi-region active-active (CockroachDB/Yugabyte) or Neon multi-region |

### 8.3 Caching Strategy

| Layer | What | TTL | Invalidation |
|-------|------|-----|--------------|
| **CDN** | Static assets, images | 1y / 30d | Content hash / deploy |
| **Edge (Vercel)** | HTML (ISR) | 60s | `revalidate` tag |
| **Redis** | API responses, sessions | 60–300s | Event-driven (pub/sub) |
| **Application** | TanStack Query | 5min stale | Mutation invalidation |

---

## 9. Disaster Recovery

| Scenario | RPO | RTO | Procedure |
|----------|-----|-----|-----------|
| **DB primary failure** | <1s (sync replica) | <30s | Neon auto-failover |
| **Region outage** | <5min (async replica) | <15min | DNS failover → secondary region |
| **Ransomware / corruption** | 24h (daily backup) | <4h | `pg_restore` from R2 → verify → cutover |
| **Accidental `DROP TABLE`** | 0 (point-in-time) | <30min | Neon PITR (point-in-time recovery) |
| **Credential leak** | 0 | <15min | Rotate master key → re-encrypt all vault entries |

---

## 10. Cost Architecture (Projected)

| Component | Year 1 (10K MAU) | Year 3 (200K MAU) | Notes |
|-----------|------------------|-------------------|-------|
| Compute (Railway) | $200/mo | $2,000/mo | Horizontal scaling |
| Database (Neon) | $100/mo | $800/mo | Autoscaling + read replicas |
| Redis (Upstash) | $50/mo | $300/mo | Pay-per-request |
| CDN/Edge (Vercel) | $20/mo | $200/mo | Bandwidth + ISR |
| Object Storage (R2) | $10/mo | $150/mo | Images + backups |
| Email (SendGrid) | $30/mo | $200/mo | Transactional + marketing |
| Push (Firebase) | Free | $50/mo | FCM |
| Monitoring | $50/mo | $300/mo | Grafana Cloud / Datadog |
| **Total** | **~$460/mo** | **~$4,000/mo** | <5% of revenue at scale |

---

## 11. Technical Debt Register (Living)

| ID | Item | Severity | Target |
|----|------|----------|--------|
| TD-008 | Prisma ORM migration | Low | Post-Series A |
| — | API versioning (v1 → v2) | Medium | Pre-public API |
| — | GraphQL gateway (optional) | Low | Developer platform v2 |
| — | Multi-region active-active DB | High | 100K MAU |
| — | Event sourcing for audit trail | Medium | Compliance req |
| — | ML pipeline for AI pricing | High | Patent 1 launch |

---

*This architecture document is the source of truth for all technical decisions. Review monthly. Update with every major release.*

---

*Confidential. For Nodbusiness Technologies internal use only.*