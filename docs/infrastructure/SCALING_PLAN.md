# Nodbusiness — Infrastructure Scaling Plan

> Exactly what changes to infrastructure at each user milestone.
> Each stage builds on the previous — don't skip stages.
> **Last updated:** September 2026
> **Stack:** Render (backend) · Vercel (frontend) · Supabase · Upstash Redis · Cloudflare R2
>
> **Note:** This scaling plan was originally written for Oracle Cloud + Coolify. The current stack is Render + Vercel. References to Oracle VM, Coolify, and Hetzner in later stages describe future migration paths when Render's capacity is exceeded — not the current setup.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
| RPS | Requests Per Second |
| CDN | Content Delivery Network |
| R2 | Cloudflare R2 — object storage |
| DB | Database |
| API | Application Programming Interface |
| CPU | Central Processing Unit |
| RAM | Random Access Memory |
| Redis | Remote Dictionary Server — in-memory cache/queue |
| BullMQ | Bull Message Queue — background job processing |
| PITR | Point-In-Time Recovery |
| SLA | Service Level Agreement |
| GB | Gigabyte |
| TB | Terabyte |
| PoP | Point of Presence — CDN edge location |
| VM | Virtual Machine |
| PaaS | Platform as a Service |

---

## Stage 0 → Stage 1: Launch Ready (0 → 1,000 users)

**Trigger:** Preparing for public launch

### Must do before first real user

```
Priority: 🔴 CRITICAL

[ ] 1. Activate Cloudflare R2 file storage
        Set in Render env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
        Time: 1 hour | Cost: Free (10GB free tier)

[ ] 2. Register Stripe live keys + webhook
        Set: STRIPE_SECRET_KEY=sk_live_...
        Register webhook: dashboard.stripe.com → Webhooks → /api/orders/webhook
        Set: STRIPE_WEBHOOK_SECRET=whsec_...
        Time: 1 hour | Cost: 2.9% + $0.30/txn

[ ] 3. Set VAPID keys for push notifications
        Run: cd backend && node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();console.log(JSON.stringify(k))"
        Set in Render: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
        Set in CF Pages: NEXT_PUBLIC_VAPID_PUBLIC_KEY
        Time: 30 minutes | Cost: Free

[ ] 4. Configure Sentry error tracking
        Create project at sentry.io → Node.js + Next.js
        Set: SENTRY_DSN (Render) and NEXT_PUBLIC_SENTRY_DSN (Vercel)
        Time: 30 minutes | Cost: Free (5K errors/month)

[ ] 5. Register domain + configure Cloudflare DNS
        Register: nodbusiness.app (Cloudflare Registrar ~$12/year)
        Configure: A @ → Oracle VM IP (proxied), CNAME api → Oracle VM IP (proxied)
        Connect CF Pages custom domain: nodbusiness.app
        Configure Oracle VM security group: allow 443/80 from Cloudflare IPs only
        Time: 2 hours | Cost: ~$12/year

[ ] 6. Confirm Render deploy hook is set in GitHub Secrets
        RENDER_DEPLOY_HOOK_URL in GitHub → Settings → Secrets
        Time: 15 minutes | Cost: Free
```

### Should do before first 1,000 users

```
Priority: 🟡 HIGH

[ ] 7. Enable Upstash Redis
        Create at upstash.com → copy rediss:// URL
        Set: REDIS_URL in Render environment variables
        Activates: BullMQ queues, feed cache, rate-limit store, feature flags
        Time: 20 minutes | Cost: Free (500K cmd/month)

[ ] 8. Enable Supabase Supavisor pooling
        Switch app DATABASE_URL to pooler URL (port 6543)
        Keep direct URL (port 5432) only in GitHub Secrets for migrations
        Time: 15 minutes | Cost: Included in Supabase

[ ] 9. Set up Uptime Kuma monitoring
        Set up uptime monitoring (BetterStack free tier or Uptime Kuma)
        Add monitors: /health, frontend, Supabase status
        Add alert: Telegram notification on downtime (1-minute checks)
        Time: 20 minutes | Cost: Free (self-hosted)

[ ] 10. Configure Chapa live key
        Register business at dashboard.chapa.co
        Set: CHAPA_SECRET_KEY=CHASECK_live_...
        Register webhook: /api/mewacho/webhook
        Time: 1–2 hours (may need business documents)
        Cost: 1.5–2% per transaction

[ ] 11. Verify Supabase keep-alive workflow is enabled
        GitHub → Actions → Supabase Keep-Alive → confirm enabled
        Run manually once to verify it works
        Time: 5 minutes | Cost: Free
```

---

## Stage 1 → Stage 2: Early Growth (1,000 → 10,000 users)

**Trigger:** Supabase approaching 400 MB storage OR Upstash approaching 400K cmd/month

### Database

```
[ ] Upgrade Supabase to Pro ($25/month) when:
    - Database size > 400 MB (approaching 500 MB free limit)
    - Egress > 4 GB/month (approaching 5 GB free limit)
    - Need longer PITR window (Pro = 30 days vs free = 7 days)
    - Need read replicas or higher compute

[ ] Run EXPLAIN ANALYZE on slow queries weekly:
    SELECT query, calls, mean_exec_time
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC LIMIT 20;

[ ] Add missing indexes (check for seq scans):
    SELECT relname, seq_scan, idx_scan
    FROM pg_stat_user_tables
    WHERE seq_scan > idx_scan
    ORDER BY seq_scan DESC;
```

### Backend (Oracle VM)

```
[ ] Monitor Render service memory and CPU
    Threshold: p95 response > 500ms sustained → upgrade Render plan

[ ] Confirm BullMQ workers running correctly
    Check Render logs for: "BullMQ workers started"
    If Redis is configured and workers are not starting, check REDIS_URL TLS format

[ ] Tune rate limiting if legitimate users are being blocked
    Current: 500 req/15min general, 20 req/15min auth
    Monitor: Render logs for HTTP 429 responses
```

### Upstash Redis

```
[ ] Monitor Upstash command count (Upstash dashboard → Daily usage)
    Threshold: > 400K/month → upgrade to Pay-As-You-Go ($0.20/100K)
    The code falls back to no-op stub gracefully when limit hit —
    but BullMQ queues won't persist new jobs during the no-op period

[ ] If upgrading: switch to Upstash PAYG
    Same connection string — just remove the free tier limit
    Cost: ~$0.20/100K over the 500K free baseline
```

### Frontend (Cloudflare Pages)

```
[ ] No action needed — Cloudflare Pages scales automatically
    Unlimited bandwidth, 335+ PoPs, Nairobi PoP for Ethiopia
    
[ ] Add Cloudflare Web Analytics (free)
    Cloudflare → Analytics → Web Analytics → Add site
    No JavaScript performance impact (edge-based analytics)
```

---

## Stage 2 → Stage 3: Growth (10,000 → 100,000 users)

**Trigger:** Oracle VM CPU > 60% sustained OR Supabase approaching compute limits

### Backend — Adding a Second Instance

```
[ ] Provision Hetzner CAX21 (€8/month, 4 vCPU ARM, 8 GB RAM) — for scale beyond Render
    Deploy backend to Hetzner (same GitHub repo, same env vars)

[ ] Configure Socket.IO Redis adapter (REQUIRED before running 2+ instances)
    backend/socket.ts — already has the commented pattern:

    const { createAdapter } = require('@socket.io/redis-adapter');
    const { createClient } = require('redis');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    Uses Upstash Redis — no additional service needed

[ ] Set up Cloudflare Load Balancer ($5/month)
    Routes: api.nodbusiness.app → Oracle VM (primary) + Hetzner (secondary)
    Health check: GET /health every 30 seconds
    Failover: automatic if primary returns non-200 3× in a row
```

### Database (Supabase → Read Replicas)

```
[ ] Enable Supabase read replicas (Pro plan feature)
    Primary: writes (INSERT/UPDATE/DELETE)
    Replica: reads (SELECT for feed, products, profiles)
    
    // backend/db/pool.ts — add read pool:
    const readPool = new Pool({
      connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
      max: 20,
    });

[ ] Upgrade Supabase to Scale tier if needed ($599/month)
    Trigger: Pro compute (2× nano) is fully saturated
```

### Search

```
[ ] Evaluate replacing PostgreSQL ILIKE with Meilisearch
    Trigger: Search p95 > 500ms

    Deploy via Hetzner VM (self-hosted):
    Image: getmeili/meilisearch:latest
    Env: MEILI_MASTER_KEY=your_key
    Cost: $0 (self-hosted on existing Hetzner VM)

    Sync data via BullMQ job after every write
```

### Redis (Upstash → Paid)

```
[ ] Switch to Upstash Pay-As-You-Go when command count consistently > 450K/month
    Same connection URL — just billing changes
    Cost: ~$9–30/month depending on volume

[ ] Alternatively: switch to Upstash Fixed plan ($10/month)
    Better for consistent high traffic
```

---

## Stage 3 → Stage 4: Scale (100,000 → 1,000,000 users)

**Trigger:** Monthly infrastructure costs > $500; DB approaching capacity; latency complaints

### Multi-Region Consideration

```
[ ] Add Hetzner CAX31 in Helsinki (EU) for diaspora users
    Ethiopian diaspora in Europe: Germany, Sweden, UK, Norway
    Add to Cloudflare Load Balancer with geo-routing rules

[ ] Add Cloudflare Load Balancer Geographic Routing ($5/month)
    Africa region → Oracle VM Johannesburg
    Europe region → Hetzner Helsinki
    Default → Oracle VM Johannesburg
    
[ ] Supabase: add EU read replica for European instances
```

### Database Evolution

```
[ ] If Supabase Pro/Scale is insufficient or too costly:
    Consider migrating to self-hosted PostgreSQL on a dedicated VM
    Or: AWS RDS at this scale (more control, better pricing at volume)
    
[ ] Implement database sharding by user_id if needed (1M+ users only)
    See DATABASE_STRATEGY.md for detailed sharding plan
```

### Observability Upgrade

```
[ ] Add Grafana Cloud (free tier: 10K series, 50GB logs, 14-day retention)
    Or: self-host Prometheus + Grafana stack on Hetzner
    
[ ] Implement OpenTelemetry distributed tracing
    Trace each request across frontend → backend → DB → Redis
```

---

## Stage 4+: Enterprise (1,000,000+ users)

**Hire dedicated SRE team. Key changes:**

```
Infrastructure team (5–10 engineers):
├── Migrate backend from Render to AWS ECS (Fargate)
│   Better pricing at volume, SLA guarantees, VPC networking
│
├── Database: AWS RDS Aurora PostgreSQL (multi-AZ, read replicas)
│   Much cheaper than Supabase at this scale
│
├── Kubernetes if microservices are needed
│   Extract: feed-service, notification-service, search-service, payment-service
│
├── Global presence
│   AWS af-south-1 (Cape Town) + AWS Nairobi (when available)
│   Sub-50ms API latency for Ethiopian users
│
└── Compliance
    SOC 2 Type II audit ($30–100K)
    Data residency in Ethiopia when AWS Nairobi opens
```

---

## Infrastructure Decision Timeline

| Decision | Trigger | Timeframe |
|---|---|---|
| Activate R2 storage | Before launch | Week 0 |
| Go live with Stripe | Before first user | Week 0 |
| Enable Upstash Redis | Before 1,000 users | Week 0–1 |
| BullMQ workers (auto with Redis) | On Redis activation | Week 0–1 |
| Upgrade Supabase to Pro | DB > 400 MB OR egress > 4 GB | Month 2–4 |
| Upstash PAYG | Commands > 400K/month | Month 2–4 |
| Add Hetzner instance + Socket.IO Redis adapter | CPU > 60% sustained | Month 4–8 |
| Meilisearch (search at scale) | Search p95 > 500ms | Month 6–12 |
| External security audit | Before 50K users | Month 8–12 |
| Multi-region deploy | Users complaining in EU/Middle East | Month 12–18 |
| AWS migration | Render cost > $1,000/month | Month 18–24 |
| SOC 2 Type II | Enterprise clients | Month 24+ |
| React Native mobile app | 50K+ active users | Month 18–24 |
