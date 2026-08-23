# Nodbusiness — Infrastructure Scaling Plan

> Exactly what changes to infrastructure at each user milestone.
> Each stage builds on the previous — don't skip stages.
> Last updated: August 2026

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

---
---

## Stage 0 → Stage 1: Launch Ready (0 → 1,000 users)

**Trigger:** Preparing for public launch

### Must do before first real user

```
Priority: 🔴 CRITICAL — do these before any user pays real money

[ ] 1. Activate Cloudflare R2 file storage
        Set: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
             R2_BUCKET_NAME, R2_PUBLIC_URL
        Time: 2 hours
        Cost: Free (10GB free tier)

[ ] 2. Register Stripe live keys
        Set: STRIPE_SECRET_KEY=sk_live_...
        Register webhook at: dashboard.stripe.com → Webhooks → /api/orders/webhook
        Set: STRIPE_WEBHOOK_SECRET=whsec_...
        Time: 1 hour
        Cost: 2.9% + $0.30 per transaction (no monthly fee)

[ ] 3. Set VAPID keys for push notifications
        Run: node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();console.log(JSON.stringify(k))"
        Set: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
        Mirror in frontend: NEXT_PUBLIC_VAPID_PUBLIC_KEY
        Time: 30 minutes
        Cost: Free

[ ] 4. Configure Sentry error tracking
        Create project at sentry.io
        Set: SENTRY_DSN (backend), NEXT_PUBLIC_SENTRY_DSN (frontend)
        Time: 30 minutes
        Cost: Free (5K errors/month)

[ ] 5. Register domain + configure DNS
        Register: nodbusiness.vercel.app (or equivalent)
        Configure: Cloudflare DNS → Railway + Vercel
        SSL: Cloudflare handles automatically (free)
        Time: 2 hours
        Cost: ~$12/year
```

### Should do before first 1,000 users

```
Priority: 🟡 HIGH

[ ] 6. Enable Redis via Upstash
        Create account at upstash.com → Create Redis database → Copy URL
        Set: REDIS_URL=rediss://...
        Activates: feed cache, trending cache, presence cache
        Time: 30 minutes
        Cost: Free (10K commands/day)

[ ] 7. Enable Neon connection pooling
        Neon Console → Project → Settings → Connection Pooling → Enable
        Update DATABASE_URL to use pooler endpoint
        Time: 15 minutes
        Cost: Included in Neon plan

[ ] 8. Set up UptimeRobot monitoring
        Create account at uptimerobot.com
        Add monitors: /health endpoint (every 5 minutes)
        Add: Telegram/email alert when down
        Time: 30 minutes
        Cost: Free (50 monitors)

[ ] 9. Configure Chapa live key
        Register business at dashboard.chapa.co
        Set: CHAPA_SECRET_KEY=CHASECK_live_...
        Register webhook: /api/orders/chapa/webhook
        Time: 1–2 hours (may need business documents)
        Cost: 1.5–2% per transaction
```

---

## Stage 1 → Stage 2: Early Growth (1,000 → 10,000 users)

**Trigger:** Traffic starting to spike; response times > 200ms p95

### Database
```
[ ] Enable Neon autoscaling
    Neon Console → Compute → Enable Autoscale
    Set min: 0.25 CU, max: 2 CU
    Cost: Pay-per-second scaling
    
[ ] Upgrade Neon plan if > 3GB data
    Free → Launch ($19/month) → Scale ($69/month)
    
[ ] Run EXPLAIN ANALYZE on slow queries
    SELECT query, calls, mean_exec_time
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC LIMIT 20;
    
[ ] Add missing indexes (check pg_stat_user_tables for seq scans)
    SELECT relname, seq_scan, idx_scan
    FROM pg_stat_user_tables
    WHERE seq_scan > idx_scan
    ORDER BY seq_scan DESC;
```

### Backend
```
[ ] Upgrade Railway to Starter plan ($10 credit/month)
    Add: Memory limit alert at 80% usage
    
[ ] Configure BullMQ workers
    Move email delivery, push notifications, commission collection
    to background jobs (already built — just needs REDIS_URL active)
    
[ ] Add rate limiting tuning
    Current: 500 req/15min general, 20 req/15min auth
    Monitor: Railway logs for 429 responses
    Adjust if legitimate users are being blocked
```

### Frontend
```
[ ] Upgrade Vercel to Pro ($20/month)
    Gets: Analytics, 1TB bandwidth, custom domains
    
[ ] Configure Image Optimization
    next/image already handles this
    Ensure all product/profile images use next/image
    
[ ] Enable Vercel Speed Insights
    Add <SpeedInsights /> to app layout
    Monitor Core Web Vitals weekly
```

### Monitoring
```
[ ] Upgrade Sentry to Team ($26/month)
    When hitting 5K error limit
    
[ ] Set up Sentry performance monitoring
    Track API response times, slow DB queries
    Set alert: p95 > 1000ms
    
[ ] Create basic dashboard
    Railway metrics + Neon metrics + Sentry → weekly review
```

---

## Stage 2 → Stage 3: Growth (10,000 → 100,000 users)

**Trigger:** Single Railway instance CPU > 60% sustained; DB connections maxing out

### Database
```
[ ] Add Neon read replica
    Neon Console → Branches → Create branch for reads
    Route read-heavy queries (feed, products, profiles) to read replica
    
    // In pool.js:
    const readPool = new Pool({ connectionString: process.env.DATABASE_READ_URL });
    const writePool = new Pool({ connectionString: process.env.DATABASE_URL });
    
[ ] Upgrade to Neon Scale plan ($69–199/month)
    Gets: More compute units, larger storage, better pooling
    
[ ] Consider PgBouncer in transaction mode
    Reduces connection overhead for high-concurrency workloads
```

### Backend — Horizontal Scaling
```
[ ] Deploy multiple Railway instances
    railway.toml:
      [deploy]
        numReplicas = 2
    
[ ] Configure Socket.IO Redis adapter
    Allows WebSocket rooms to work across multiple instances:
    
    // backend/socket.ts
    const { createAdapter } = require('@socket.io/redis-adapter');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    
    Cost: Upstash handles the pub/sub — no extra service
    
[ ] Deploy BullMQ worker as separate Railway service
    Isolates background job load from API serving
    Cost: ~$10–20/month additional Railway instance
```

### Search
```
[ ] Evaluate replacing PostgreSQL ILIKE with Meilisearch
    Trigger: Search p95 > 500ms
    
    Deploy Meilisearch on Railway:
    Image: getmeili/meilisearch:latest
    Env: MEILI_MASTER_KEY=your_key
    
    Sync data via BullMQ job after every write
    
    Cost: $30–100/month (Meilisearch Cloud) or ~$20/month self-hosted
```

### Redis
```
[ ] Upgrade Upstash to Pay-as-you-go
    Monitor: Commands per day
    Alert: If > 8,000 commands/day (near free tier limit)
    
[ ] Implement cache warming on startup
    Already built in index.ts — ensure it fires correctly
    
[ ] Add cache for: user profiles, business listings, showrooms
    TTL: 60–300 seconds
```

### CDN
```
[ ] Enable Cloudflare for the API domain
    Route: api.nodbusiness.app → Railway via Cloudflare
    Cache: Static assets, product images
    DDoS: Cloudflare free tier provides basic DDoS protection
    
[ ] Configure Cache-Control headers on read endpoints
    Add to trending, product list, showroom list endpoints:
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
```

---

## Stage 3 → Stage 4: Scale (100,000 → 1,000,000 users)

**Trigger:** Monthly costs > $1,000; single database approaching capacity; global latency complaints

### Multi-Region Deployment
```
[ ] Add Railway US-East instance
    Currently: US-West only
    Add: US-East (closer to Neon, lower DB latency)
    
[ ] Add Railway EU-West instance
    For: Ethiopian diaspora in Europe
    Configure: Neon EU read replica
    
[ ] Configure Cloudflare Load Balancing ($5/month)
    Routes users to nearest Railway region
    Health checks: automatic failover
```

### Database Evolution
```
[ ] Migrate to Neon Enterprise or AWS RDS
    Neon Enterprise: Custom pricing, SLA guarantees
    AWS RDS PostgreSQL: More control, less managed
    
[ ] Implement database sharding (if needed)
    Shard by: user_id hash (for user data)
    Keep: orders, products, posts on primary
    
[ ] Add dedicated analytics database
    PostgreSQL replica → read-only analytics queries
    Or: Use ClickHouse for time-series analytics
```

### Search at Scale
```
[ ] Move to Elasticsearch or Meilisearch Cloud
    Elasticsearch: More features, higher cost ($100+/month)
    Meilisearch Cloud: Simpler, cheaper ($30–300/month)
    
[ ] Implement search index sync via BullMQ
    Every product/profile/showroom write → index update job
    Delay: < 1 minute from write to searchable
```

### Observability Upgrade
```
[ ] Add DataDog or Grafana Cloud
    Full APM (Application Performance Monitoring)
    Distributed tracing across all services
    Custom dashboards for business metrics
    Cost: $100–500/month depending on volume
    
[ ] Implement OpenTelemetry tracing
    Trace every request from frontend → backend → database
    Identify bottlenecks automatically
    
[ ] Add synthetic monitoring
    Simulate real user flows every 5 minutes from multiple locations
    Alert if any step fails
```

### Security Hardening
```
[ ] Implement WAF (Web Application Firewall)
    Cloudflare WAF ($20/month) blocks:
    - SQL injection attempts
    - XSS attacks
    - Bot traffic
    - Rate limit by country
    
[ ] Add DDoS protection
    Cloudflare Business ($200/month) or Pro ($20/month)
    Enterprise ($5,000+/month) if government/competitor attacks
    
[ ] Security audit
    Hire penetration testing firm: $5,000–20,000 one-time
    Or: Use HackerOne bug bounty programme
```

---

## Stage 4+: Enterprise (1,000,000+ users)

**At this scale, hire a dedicated SRE team. Key changes:**

```
Infrastructure team (5–10 engineers):
├── Move from Railway to AWS/GCP direct
│   - Better pricing at volume (60–70% cheaper than Railway)
│   - More control over networking, security groups
│   - SLA guarantees for uptime
│
├── Kubernetes for container orchestration
│   - Replace Railway's managed containers
│   - Full control over scaling, deployment strategies
│   - Tools: Helm, ArgoCD for GitOps
│
├── Dedicated data platform
│   - ClickHouse for analytics (billion-row queries in seconds)
│   - Data warehouse (Snowflake or BigQuery)
│   - ETL pipeline from PostgreSQL → warehouse
│
├── Global presence
│   - Regions: US, EU, Africa (AWS Cape Town + Nairobi when available)
│   - Global load balancing with Cloudflare
│   - Edge caching for static content
│
└── Compliance infrastructure
    - SOC 2 Type II audit ($30–100K)
    - ISO 27001 certification
    - Data residency requirements (Ethiopian data in Ethiopia)
```
