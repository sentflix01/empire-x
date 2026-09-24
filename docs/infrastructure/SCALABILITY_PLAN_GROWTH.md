# Nodbusiness — Scalability Architecture

> How the system handles growth from 100 to 10 million users.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Upstash Redis · Cloudflare R2

---

## Current Architecture (0–10K users)

```
[User Browser / PWA]
        │
        ▼
[Cloudflare — DNS + CDN + DDoS (335+ PoPs)]
        │
   ┌────┴────┐
   │         │
   ▼         ▼
[CF Pages] [Oracle Cloud Johannesburg — ARM A1 2OCPU/12GB]
[Next.js  ]         │
[Static   ]   [Coolify v4 — container management]
[SPA      ]         │
                    ▼
         [Node.js + Express + Socket.IO]
         [BullMQ workers (in-process)  ]
         [Port 10000                   ]
                    │
          ┌─────────┼─────────┐
          │         │         │
          ▼         ▼         ▼
   [Supabase]  [Upstash]  [Cloudflare R2]
   [PostgreSQL] [Redis  ]  [File uploads ]
   [Free tier ] [500K/mo]  [10 GB free   ]
```

**What works at this scale:**
- Oracle VM 2 OCPU / 12 GB ARM handles ~500–2,000 DAU comfortably
- Coolify provides zero-downtime deploys via Docker HEALTHCHECK
- Cloudflare's Nairobi PoP serves static assets to Ethiopia in ~20ms
- Supabase free tier is sufficient for months at low user counts
- Upstash Redis activates BullMQ, rate limiting, caching, feature flags
- R2 zero-egress means file serving is free regardless of downloads

**Bottlenecks to watch:**
- Oracle VM single instance — no horizontal scaling yet
- Supabase 500 MB storage limit approaches at ~10K MAU
- Upstash 500K commands/month approached at ~300–500 DAU sustained

---

## Scale Plan: 10K–100K Users

### Step 1: Activate R2 Storage (Immediate — required before launch)

```bash
# Add to Coolify env vars:
R2_ACCOUNT_ID=your_id
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=nodbusiness-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

`@aws-sdk/client-s3` is already installed. The upload middleware detects R2 env vars automatically.

**Result:** Uploads persist across Coolify deploys. Images served from Cloudflare CDN globally including Nairobi PoP.

### Step 2: Activate Upstash Redis (Immediate — required before launch)

```bash
# Add to Coolify env vars:
REDIS_URL=rediss://default:token@host.upstash.io:6380
```

Redis is already integrated in `lib/redis.ts`. Adding `REDIS_URL` activates:
- BullMQ queues (email, notifications, webhook delivery, AI jobs, usage recalc)
- Redis-backed rate limiting (shared across restarts)
- Feed cache (5 min TTL)
- Trending cache (5 min TTL)
- Feature flag Redis overrides
- Chat presence tracking

**Result:** 60–80% reduction in DB queries for read-heavy endpoints. API response times drop significantly as email/push jobs move off the request path.

### Step 3: Add Second VM for Horizontal Scaling (Month 4–8)

**Trigger:** Oracle VM CPU > 60% sustained for 30 minutes

```bash
# Provision Hetzner CAX21 (€8/month — 4 vCPU ARM, 8 GB RAM)
# Install Coolify on Hetzner
# Deploy backend to Hetzner Coolify (same GitHub repo, same env vars)
```

**Required with multiple instances — Socket.IO Redis adapter:**

```javascript
// backend/socket.ts — add before io.listen():
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
// Uses Upstash — no additional service needed
```

**Add Cloudflare Load Balancer ($5/month):**
- Oracle VM Johannesburg (primary)
- Hetzner Falkenstein (secondary)
- Health check: `GET /health` every 30 seconds

**Result:** API throughput doubles. Socket.IO rooms work correctly across all instances. Automatic failover if one VM goes down.

---

## Scale Plan: 100K–1M Users

### Database Scaling

```
Supabase read replicas (Pro/Scale feature):
  Primary (writes):        INSERT/UPDATE/DELETE
  Replica 1 (reads):       feed, products, profiles
  Replica 2 (reads):       search, analytics

// backend/db/pool.ts — route appropriately:
const readPool = new Pool({ connectionString: process.env.DATABASE_READ_URL });
const writePool = new Pool({ connectionString: process.env.DATABASE_URL });
```

### Horizontal Backend Scaling

```
3–5 VM instances across Oracle Johannesburg + Hetzner (multiple locations)

Cloudflare Geographic Load Balancer:
  Africa traffic    → Oracle VM Johannesburg
  Europe traffic    → Hetzner Finland/Germany
  Default           → Oracle VM Johannesburg

All instances share:
  - Upstash Redis (queues, cache, pub/sub)
  - Supabase (all DB writes go to primary, reads to replica)
  - Cloudflare R2 (all file ops go to same bucket)
```

### CDN Strategy

| Asset type | CDN | Config |
|---|---|---|
| Static JS/CSS | Cloudflare Pages edge (automatic) | Already live |
| User uploads (images) | Cloudflare R2 + CDN | Active with R2 env vars |
| API responses (read) | Cloudflare Cache API | Add `Cache-Control` headers to read endpoints |
| Video (future) | Cloudflare Stream | When video posts feature flag enabled |

---

## Scale Plan: 1M–10M Users

### Microservices Migration (When Needed)

Current monolith is correct until ~500K users. At that point, extract high-load services:

```
nodbusiness-monolith (today)
├── feed-service (high read volume — extract first)
├── notification-service (high write volume, fan-out)
├── search-service (CPU-intensive — Meilisearch already external)
├── payment-service (critical path, isolated)
└── chat-service (stateful, WebSocket-heavy)
```

**Rule:** Never extract a service until it is causing measurable, specific problems. Premature microservices = premature complexity.

### Search at Scale

PostgreSQL `ILIKE` doesn't scale past ~1M rows in a high-traffic environment. Switch to Meilisearch (already self-hosted on Coolify when deployed):

```
Meilisearch advantages:
- Self-hosted on existing Hetzner VM via Coolify one-click — $0 extra cost
- Indexes: products, users, showrooms, tasks, posts
- BullMQ sync job after every write (already wired in lib/queue.ts)
- Response time: < 50ms vs 500ms+ PostgreSQL ILIKE at scale
```

### Infrastructure at 1M+ Users

```
Migrate from Coolify + Hetzner to AWS/GCP:
  - AWS ECS Fargate (auto-scaling containers)
  - AWS RDS Aurora PostgreSQL (multi-AZ, global replicas)
  - AWS ElastiCache Redis (Cluster mode)
  - Cloudflare Enterprise (WAF, custom SLA, 24/7 support)
  - ClickHouse (analytics database)
  - Full-time SRE team: 5–10 engineers
```

---

## Performance Benchmarks

| Metric | Target (Now) | Target (10K users) | Target (100K users) |
|---|---|---|---|
| API p50 response time | < 200ms | < 150ms | < 100ms |
| API p99 response time | < 1,000ms | < 500ms | < 300ms |
| Feed load time | < 1s | < 800ms | < 500ms |
| WebSocket connection time | < 300ms | < 200ms | < 150ms |
| Image upload time | < 3s | < 2s | < 1s |
| Search results | < 500ms | < 300ms | < 100ms (Meilisearch) |

**Target latency for Ethiopia specifically:**
- Static assets (CF Pages → Nairobi PoP): < 30ms
- API calls (Oracle VM Johannesburg): < 120ms
- WebSocket connect: < 200ms

---

## Load Testing Plan

```bash
# k6 load tests before each major milestone
k6 run --vus 100 --duration 5m scripts/load-test-feed.js
k6 run --vus 50 --duration 2m scripts/load-test-checkout.js
k6 run --vus 200 --duration 10m scripts/load-test-messages.js

# Thresholds:
# - Error rate < 0.5%
# - p95 response < 500ms
# - No DB connection pool exhaustion
# - Socket.IO maintains connections under load
```

---

## Disaster Recovery at Scale

| Scenario | RTO | RPO | Solution |
|---|---|---|---|
| Single container crash (Coolify restart) | < 2 min | 0 | Docker auto-restart + HEALTHCHECK |
| Oracle VM failure | < 30 min | 0 | Provision Hetzner + update Cloudflare DNS |
| Supabase outage | < 30 min | 0 (cache covers reads) | Wait for Supabase + cached data fallback |
| Full data corruption | < 4 hours | < 24 hours | Restore from daily pg_dump on R2 |
| Accidental large deletion | < 2 hours | < 6 hours | Supabase PITR (7-day window on free) |
