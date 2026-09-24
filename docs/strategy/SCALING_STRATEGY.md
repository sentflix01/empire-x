# Nodbusiness — Scaling Strategy (Zero to 1M+ Businesses)

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| MAU | Monthly Active Users |
| QPS | Queries Per Second |
| RPS | Requests Per Second |
| P95/P99 | 95th/99th Percentile Latency |
| CDN | Content Delivery Network |
| PgBouncer | PostgreSQL Connection Pooler |
| Vitess | Database clustering system for MySQL/PostgreSQL |
| CockroachDB | Distributed SQL database |
| YugabyteDB | Distributed PostgreSQL-compatible database |
| RUM | Real User Monitoring |
| APM | Application Performance Monitoring |
| SRE | Site Reliability Engineering |
| HPA | Horizontal Pod Autoscaler |
| VPA | Vertical Pod Autoscaler |

---

## 1. Scaling Philosophy

### The Core Principle: **Design for 100x, Build for 1x**

Every architectural decision must satisfy: *"Does this work at 100x current load without rewrite?"*

| Current (Launch) | 100x Target |
|------------------|-------------|
| 10K MAU | 1M MAU |
| 500 showrooms | 50K showrooms |
| 50 QPS | 5,000 QPS |
| 100 GB data | 10 TB data |
| 2 API workers | 200 API workers |
| Single region | 3 regions (active-active) |

---

## 2. Scaling Phases

### Phase 0: Foundation (0–3 months) — **COMPLETE**
| Component | Status | Capacity |
|-----------|--------|----------|
| API | Render (free tier) | 100 QPS |
| DB | Supabase (single) + Supavisor | 500 conn |
| Redis | Upstash (single) | 10K ops/s |
| FE | Vercel | Global |
| Socket | 1 worker + Redis adapter | 10K concurrent |
| Observability | Built-in DevOps console | Full |

**Gate to Phase 1:** 10K MAU, 500 paying businesses, $25K MRR

---

### Phase 1: Growth (3–18 months) — **TARGET: 100K MAU**

| Layer | Scaling Action | Trigger |
|-------|----------------|---------|
| **API** | Add Render Standard + Cloudflare Load Balancer | p99 > 300ms sustained |
| **DB** | Supabase Pro read replicas (2) for analytics/feed | CPU > 60% or p95 > 100ms |
| **Redis** | Upstash auto-tiering (pay-per-request) | Memory > 70% |
| **Socket** | 3 workers + Redis Cluster | 50K concurrent |
| **CDN** | Cloudflare R2 + Pages edge cache | Image bandwidth > 1TB/mo |
| **Search** | Add Meilisearch (self-hosted) | Filter latency > 200ms |
| **Workers** | Background job queue (BullMQ/Redis) | Webhook backlog > 1000 |

**Infrastructure Cost:** ~$2,000/mo

**Gate to Phase 2:** 100K MAU, 5K paying businesses, $100K MRR

---

### Phase 2: Scale (18–36 months) — **TARGET: 500K MAU**

| Layer | Scaling Action | Trigger |
|-------|----------------|---------|
| **API** | 20–30 workers (K8s / AWS ECS) | p99 > 300ms |
| **DB** | **Sharding by `showroom_id`** (tenant isolation) | Write QPS > 1,000 |
| **DB** | Multi-region (Supabase + read replicas) | Cross-region latency > 150ms |
| **Redis** | Redis Cluster (6 shards) | Ops > 100K/s |
| **Socket** | 10+ workers, sticky sessions | 200K concurrent |
| **Search** | Meilisearch cluster (3 nodes) | Index > 50M docs |
| **Object Store** | R2 + Cloudflare Images (auto-resize) | Transform CPU > 50% |
| **Workers** | Dedicated queue cluster (BullMQ) | Job latency > 30s |
| **Analytics** | ClickHouse / Apache Druid | Query latency > 5s |

**New Capabilities:**
- **Tenant isolation via sharding** — each showroom's data on its shard
- **Multi-region active-read** — writes to primary, reads local
- **Feature flag rollouts** — canary by shard/region
- **Chaos engineering** — monthly game days

**Infrastructure Cost:** ~$15,000/mo

**Gate to Phase 3:** 500K MAU, 25K paying businesses, $500K MRR

---

### Phase 3: Platform (36–60 months) — **TARGET: 1M+ MAU**

| Layer | Architecture |
|-------|--------------|
| **API** | 50+ workers, K8s (EKS/GKE), HPA + VPA, service mesh (Istio/Linkerd) |
| **DB** | **CockroachDB / YugabyteDB** — multi-region active-active, geo-partitioning by country |
| **Redis** | Redis Enterprise (active-active) or Dragonfly |
| **Socket** | 20+ workers, Redis Enterprise CRDT for presence |
| **Search** | Typesense Cloud (multi-region) or Elasticsearch |
| **Event Streaming** | Kafka (Confluent Cloud) — event sourcing for audit, analytics |
| **ML Platform** | Vertex AI / SageMaker — AI pricing, demand forecasting |
| **Developer Platform** | API Gateway (Kong/Envoy), GraphQL Federation, SDKs |
| **Compliance** | SOC2 Type II, ISO 27001, GDPR, PCI DSS SAQ-A |

**Infrastructure Cost:** ~$75,000/mo

---

## 3. Database Scaling Deep Dive

### 3.1 Current Schema — Sharding Ready

All core tables include `showroom_id` or `user_id` as natural partition keys:

```sql
-- Example: orders table ready for sharding by showroom_id
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID NOT NULL,  -- SHARD KEY
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  product_id UUID,
  total_price NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_showroom ON orders (showroom_id, created_at DESC);
```

### 3.2 Sharding Strategy (Phase 2)

| Shard Key | Tables | Rationale |
|-----------|--------|-----------|
| `showroom_id` | `showrooms`, `sections`, `products`, `orders`, `commissions`, `external_data_sources`, `field_mappings` | Tenant isolation — no cross-shard queries for core flows |
| `user_id` | `users`, `wallets`, `wallet_transactions`, `messages`, `conversations`, `notifications`, `audit_logs` | User-centric — wallet ops, chat, notifications |

### 3.3 Sharding Implementation Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Vitess** | MySQL/PostgreSQL, proven at scale (Slack, JD.com), Kubernetes-native | Learning curve, operational complexity | ✅ Best for PostgreSQL |
| **Citus** | PostgreSQL extension, transparent sharding, open source | Limited to distributed tables | Good alternative |
| **pg_shard / pg_partman** | Native PostgreSQL, simpler | Manual rebalancing | Simpler start |
| **CockroachDB** | Multi-region active-active, geo-partitioning | Different SQL dialect, cost | Phase 3 |
| **YugabyteDB** | PostgreSQL-compatible, distributed | Younger ecosystem | Phase 3 alternative |

**Decision:** Start with **Citus** (PostgreSQL-native, open source, Cloud-managed on Azure/AWS) at Phase 2. Migrate to **CockroachDB** at Phase 3 for true multi-region active-active.

---

## 4. Caching Strategy at Scale

### 4.1 Multi-Layer Cache Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ REQUEST                                                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: CDN (Cloudflare — 335+ PoPs)                          │
│ • Static assets: 1 year (content hash)                          │
│ • Images (R2): 30 days                                          │
│ • HTML (ISR): 60s (stale-while-revalidate: 300s)               │
│ • API (GET, cacheable): 60s + SWR                               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: REDIS (Upstash → Cluster)                              │
│ • API responses: 60–300s (key: hash(query+user+params))        │
│ • Session data: 7 days                                          │
│ • Rate limits: 60s sliding window                               │
│ • Feature flags: immediate (pub/sub invalidation)              │
│ • Presence: 30s TTL                                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: APPLICATION (TanStack Query)                           │
│ • Stale time: 5 min                                             │
│ • Cache time: 10 min                                            │
│ • Mutation invalidation: exact key + tag-based                  │
│ • Prefetch on hover / viewport                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: DATABASE (PostgreSQL)                                  │
│ • Query result cache: pg_stat_statements + pg_prewarm           │
│ • Materialized views: heavy aggregations (seller analytics)     │
│ • Partitioned tables: orders by month, audit_logs by week       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Cache Invalidation Strategy

| Event | Invalidation Method |
|-------|---------------------|
| **Product update** | Tag `product:{id}` + `seller:{sellerId}` → Redis DEL + TanStack invalidate |
| **Order placed** | Tag `orders:{buyerId}`, `orders:{sellerId}`, `wallet:{userId}` |
| **Showroom publish** | Tag `showroom:{id}`, `discovery:{category}`, `discovery:{region}` |
| **Feature flag change** | Redis pub/sub → all workers invalidate local cache instantly |
| **User profile update** | Tag `user:{id}`, `profile:{username}` |
| **Webhook received** | Invalidate affected entities only (targeted) |

### 4.3 Cache Key Design

```
Pattern: {domain}:{entity}:{id}:{version}:{params_hash}

Examples:
  api:products:list:v2:seller_123_cat_electronics_page_1_limit_20
  api:showroom:public:v1:showroom_abc_theme_dark
  api:feed:personal:v3:user_xyz_cursor_456
  session:user:user_123
  ratelimit:ip:192.168.1.1:api_orders_post
  flag:stripe_payments
  presence:user:user_456
```

---

## 5. Real-Time Scaling (Socket.IO)

### 5.1 Current Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Worker 1   │────▶│  Redis      │◀───▶│  Worker 2   │
│  (Socket)   │ Pub/Sub   │  Pub/Sub    │  (Socket)   │
└─────────────┘     (Adapter)     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client A   │     │  Client B   │     │  Client C   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 5.2 Scaling to 1M Concurrent

| Challenge | Solution |
|-----------|----------|
| **Connection state** | Redis adapter — all workers share room membership |
| **Presence** | Redis sorted sets (`presence:{room}`) with TTL + Lua scripts |
| **Message ordering** | Per-room sequence numbers in Redis |
| **Backpressure** | Client-side ack + server-side buffer (max 100 msg) |
| **Reconnection** | Exponential backoff + session resume (resume token in Redis) |
| **Multi-region** | Redis Enterprise CRDT or custom geo-routing (Phase 3) |

### 5.3 Socket Events at Scale

| Event | Frequency | Optimization |
|-------|-----------|--------------|
| `message` | High | Binary protocol (msgpack), compression |
| `typing` | Medium | Debounced (500ms), room-scoped |
| `presence` | Low | Heartbeat 30s, lazy sync |
| `notification` | Medium | Batch + priority queue |
| `order_update` | Low | Direct to user room (not broadcast) |

---

## 5. Frontend Scaling (Next.js)

### 5.1 Vercel Edge Scaling

| Feature | Configuration |
|---------|---------------|
| **ISR** | `revalidate: 60` for dynamic pages, `on-demand` for showrooms |
| **Edge Middleware** | Auth, i18n, geo-routing, bot detection |
| **Image Optimization** | `next/image` → Cloudflare R2 + `loader` for AVIF/WebP |
| **Bundle Splitting** | Automatic (App Router), dynamic imports for heavy features |
| **PWA** | Workbox (precache + runtime), offline fallback |

### 5.2 Client-Side Performance

| Metric | Target | Technique |
|--------|--------|-----------|
| **LCP** | <1.5s | `next/image` priority, font preload, critical CSS inline |
| **FID** | <50ms | Code splitting, `useTransition`, web workers for heavy calc |
| **CLS** | <0.1 | Aspect ratio boxes, font `size-adjust`, skeleton loading |
| **Bundle Size** | <200KB gz | Tree-shaking, dynamic imports, `next/dynamic` for heavy features |

### 5.3 RUM + Synthetic Monitoring

| Tool | Purpose |
|------|---------|
| **Cloudflare Analytics** | Core Web Vitals (RUM) |
| **Grafana k6** | Synthetic load testing (CI + scheduled) |
| **Lighthouse CI** | PR regression detection |
| **WebPageTest** | Deep-dive on critical pages |

---

## 6. Cost Optimization at Scale

### 6.1 Cost per 1K MAU (Projected)

| Phase | MAU | Monthly Infra | Cost/1K MAU |
|-------|-----|---------------|-------------|
| Launch | 10K | $460 | $46 |
| Phase 1 | 100K | $2,000 | $20 |
| Phase 2 | 500K | $15,000 | $30 |
| Phase 3 | 1M | $75,000 | $75 |

**Note:** Cost/MAU increases at Phase 2 due to multi-region + sharding overhead, then decreases at Phase 3 with volume discounts.

### 6.2 Cost Optimization Levers

| Lever | Savings | Effort |
|-------|---------|--------|
| **Reserved Instances** (Oracle/Supabase) | 30–40% | Low (commit 1yr) |
| **Spot/Preemptible** (workers) | 60–70% | Medium (graceful shutdown) |
| **R2 vs S3** | 80% egress savings | Done |
| **Upstash pay-per-request** | 50% vs provisioned | Done |
| **Vercel vs Lambda** | 10x cheaper for middleware | Done |
| **Image compression (AVIF)** | 50% bandwidth | Done |
| **Query optimization** | 30% DB CPU | Ongoing |
| **Cache hit rate >90%** | 50% DB load | Ongoing |

---

## 6. Capacity Planning Formulas

### 6.1 API Workers

```
workers = ceil( (peak_QPS * avg_latency_ms / 1000) / (cpu_cores * 0.7) )

Example: 5,000 QPS * 0.150s / (2 * 0.7) = 536 → 54 workers (2 CPU each)
```

### 6.2 PostgreSQL Connections

```
max_connections = workers * pool_size_per_worker + 50 (admin)

Example: 54 workers * 20 + 50 = 1,130 → PgBouncer pool_mode=transaction
```

### 6.3 Redis Memory

```
memory_GB = (active_sessions * 2KB) + (cache_entries * 1KB) + (rate_limit * 500B) + 2GB buffer

Example: 200K sessions * 2KB = 400MB + 10M cache * 1KB = 10GB + 2GB = 12.5GB
```

---

## 7. Chaos Engineering & Reliability

### 7.1 Monthly Game Days

| Experiment | Hypothesis | Blast Radius |
|------------|------------|--------------|
| Kill 1 API worker | Auto-recovery < 30s | 1/10 workers |
| Redis primary failover | <5s failover, 0 data loss | Cache miss spike |
| DB primary failover | Supabase auto-failover < 30s | 30s read errors |
| Region network partition | Cross-region reads work | Cross-region latency |
| Socket worker crash | Clients reconnect < 10s | 1/10 socket workers |
| Dependency outage (Stripe) | Graceful degradation, queue | Payment flow only |

### 7.2 Synthetic Monitoring

| Check | Frequency | Alert Threshold |
|-------|-----------|-----------------|
| API health (`/health`) | 10s | >500ms or 5xx |
| DB connectivity | 30s | >100ms or error |
| Redis connectivity | 30s | Error |
| Socket connectivity | 60s | >5s connect |
| Webhook processing | 60s | Queue > 100 |
| Backup success | Daily | Failed |
| Restore verification | Weekly | Failed |
| SSL cert expiry | Daily | <30 days |

---

## 7. Team Scaling (SRE)

| Phase | SRE Ratio | Team Structure |
|-------|-----------|----------------|
| Phase 0–1 | 0 (devs own ops) | 2 backend devs rotate on-call |
| Phase 2 | 1:10 (1 SRE per 10 devs) | 1 SRE + 2 backend devs on-call |
| Phase 3 | 1:8 | 2 SREs + platform team (3) |

---

## 8. Migration Checklists

### 8.1 DB Read Replicas (Phase 1)

- [ ] Enable Supabase read replica (Pro plan feature)
- [ ] Update `pool.ts` — `readPool` for SELECT, `writePool` for mutations
- [ ] Add `READ_REPLICA_URL` env
- [ ] Test failover (kill primary)
- [ ] Monitor replication lag (<1s)
- [ ] Route analytics/feed queries to read pool

### 8.2 Sharding (Phase 2)

- [ ] Add `shard_id` computed column to all sharded tables
- [ ] Implement Citus coordinator + workers
- [ ] Migrate data: `SELECT citus_move_shard_placement(...)`
- [ ] Update `pool.ts` — shard-aware query router
- [ ] Test cross-shard queries (avoid)
- [ ] Run shadow traffic (dual-write)
- [ ] Cutover with feature flag

### 8.3 Multi-Region (Phase 3)

- [ ] Provision CockroachDB cluster (3 regions)
- [ ] Configure geo-partitioning by `country_code`
- [ ] Implement region-aware routing (DNS + middleware)
- [ ] Test region failover (kill region)
- [ ] Verify data residency compliance

---

*This scaling strategy is a living document. Review quarterly. Update with every phase gate.*

---

*Confidential. For Nodbusiness Technologies internal use only.*