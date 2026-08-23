# Nodbusiness — Scalability Architecture

> How the system handles growth from 100 to 10 million users.
> **Last updated:** August 2026

---

## Current Architecture (0–10K users)

```
[User Browser / PWA]
        │
        ▼
[Vercel Edge — Next.js 16]
        │ REST + WebSocket
        ▼
[Railway — Express + Socket.IO]
        │
     ┌──┴──┐
     │     │
[Neon DB] [Local disk uploads]
     │
  [Redis] (optional, not yet configured)
```

**Bottlenecks at this scale:**
- Single Railway instance — no horizontal scaling
- Local disk for uploads — lost on redeploy
- No CDN — static assets served from Vercel edge only
- No Redis — every feed request hits PostgreSQL

---

## Scale Plan: 10K–100K Users

### Step 1: File Storage → Cloudflare R2 (Immediate)

```bash
# Add to backend/.env
R2_ACCOUNT_ID=your_id
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=nodbusiness-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

`@aws-sdk/client-s3` is already installed. The upload middleware already checks for R2 config.

**Result:** Uploads persist across deploys. Images served from Cloudflare's global CDN (300+ PoPs).

### Step 2: Redis Caching → Upstash (Immediate)

```bash
# Add to backend/.env  
REDIS_URL=rediss://default:token@host.upstash.io:6380
```

Redis is already integrated. Adding `REDIS_URL` activates:
- Feed cache (5 min TTL)
- Trending cache (5 min TTL)
- Presence cache (15 min TTL)
- User profile cache (60 sec TTL)

**Result:** 80%+ reduction in DB queries for read-heavy endpoints.

### Step 3: BullMQ Background Jobs (Month 2)

Move these off the request path to background workers:
- Email delivery (`sendOrderConfirmation`, OTP emails)
- Push notification fan-out (sending to 1000+ subscribers)
- Commission collection
- Trending score recalculation

```javascript
// backend/lib/queue.ts already has BullMQ set up
// Just add workers for each job type
```

**Result:** API response times drop. Emails don't block order creation.

---

## Scale Plan: 100K–1M Users

### Database Scaling

#### Read Replicas (Neon supports this)
```
Primary DB (writes)
├── Read Replica 1 (feed, products, profiles)
└── Read Replica 2 (search, analytics)
```

Route read-heavy queries to replicas:
```javascript
const readPool = new Pool({ connectionString: process.env.DATABASE_READ_URL });
const writePool = new Pool({ connectionString: process.env.DATABASE_URL });
```

#### Connection Pooling
- Current: `pool.js` with `max: 20` connections
- At scale: PgBouncer (transaction pooling) in front of PostgreSQL
- Neon has built-in connection pooling — enable it in the dashboard

#### Index Strategy (Already Implemented)
- All foreign keys have indexes ✅
- Feed query uses CTE with `feed_rank` ✅
- GIN index on `conversations(participant_ids)` ✅
- Composite indexes on notifications, messages, orders ✅

### Horizontal Scaling (Railway)

```yaml
# railway.toml — enable auto-scaling
[deploy]
  numReplicas = 3
  healthcheckPath = "/health"
  healthcheckTimeout = 30
```

**Problem with Socket.IO and multiple instances:**
Socket.IO rooms don't work across instances by default. Solution: Redis adapter.

```javascript
// backend/socket.ts
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

This allows any instance to emit to any socket room.

### CDN Strategy

| Asset type | CDN | Config |
|---|---|---|
| Static JS/CSS | Vercel Edge (automatic) | Already live |
| User uploads (images) | Cloudflare R2 | Enable with R2 env vars |
| API responses (read) | Cloudflare Cache API | Add `Cache-Control` headers |
| Video (future) | Cloudflare Stream | When video posts are built |

---

## Scale Plan: 1M–10M Users

### Microservices Migration (When Needed)

Current monolith is fine until ~500K users. At that point, extract high-load services:

```
nodbusiness-monolith (today)
├── feed-service (high read volume)
├── notification-service (high write volume, fan-out)
├── search-service (CPU-intensive)
├── payment-service (critical path, isolated)
└── chat-service (stateful, WebSocket-heavy)
```

**Rule:** Don't extract until a service is causing measurable problems. Premature microservices = premature complexity.

### Search at Scale

Current search: PostgreSQL `ILIKE` + Haversine formula.

At 1M+ products: replace with **Elasticsearch** or **Meilisearch**.

```
Meilisearch (recommended — open source, fast, simple)
- Self-host on Railway
- Index: products, users, showrooms, tasks, posts
- Sync via BullMQ job after write operations
```

### Database Sharding (1M+ users)

Shard by `user_id` using consistent hashing:
- Shard 0: user_id starts with 0–3
- Shard 1: user_id starts with 4–7
- Shard 2: user_id starts with 8–f

**Cross-shard queries** (feed from followed users): handle at application layer via scatter-gather.

---

## Performance Benchmarks

| Metric | Target (Now) | Target (10K users) | Target (100K users) |
|---|---|---|---|
| API p50 response time | < 200ms | < 150ms | < 100ms |
| API p99 response time | < 1000ms | < 500ms | < 300ms |
| Feed load time | < 1s | < 800ms | < 500ms |
| WebSocket connection time | < 300ms | < 200ms | < 150ms |
| Image upload time | < 3s | < 2s | < 1s |
| Search results | < 500ms | < 300ms | < 100ms |

---

## Load Testing Plan

Before each major launch milestone:

```bash
# k6 load test (install: brew install k6)
k6 run --vus 100 --duration 5m scripts/load-test-feed.js
k6 run --vus 50 --duration 2m scripts/load-test-checkout.js
k6 run --vus 200 --duration 10m scripts/load-test-messages.js
```

**Thresholds:**
- Error rate < 1%
- p95 response time < 500ms
- No connection pool exhaustion

---

## Disaster Recovery

| Scenario | RTO | RPO | Solution |
|---|---|---|---|
| Single instance crash | < 1 min | 0 | Railway auto-restart |
| Database corruption | < 4 hours | < 24 hours | Neon point-in-time recovery |
| Full region outage | < 30 min | < 1 hour | Neon multi-region (paid) |
| Accidental data deletion | < 2 hours | < 6 hours | Daily backup restore |

**RTO** = Recovery Time Objective (how long to restore service)  
**RPO** = Recovery Point Objective (how much data we can afford to lose)
