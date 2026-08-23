# Nodbusiness — Capacity Planning

> How much infrastructure we need at each user count, and when to add more.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| CPU | Central Processing Unit |
| RAM | Random Access Memory |
| DB | Database |
| CDN | Content Delivery Network |
| API | Application Programming Interface |
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
| RPS | Requests Per Second |
| QPS | Queries Per Second |
| P95 | 95th percentile response time |
| SLA | Service Level Agreement |
| GB | Gigabyte |
| TB | Terabyte |
| MB | Megabyte |

---
## How to Read This Document

Each section answers: "At X users, what does the infrastructure need to be?"
It gives specific numbers for: database size, API throughput, storage, and cost.

---

## Baseline Assumptions

| Metric | Value | Source |
|---|---|---|
| Average session length | 10 minutes | Industry benchmark for social apps |
| Pages/API calls per session | 50 requests | Measured via Railway logs |
| Daily Active Users (DAU) / MAU ratio | 30% | Target (industry: 20–40%) |
| Average product image size | 150 KB compressed | After sharp compression |
| Average post image size | 250 KB compressed | After sharp compression |
| Average messages per DAU per day | 20 messages | Social app benchmark |
| Average orders per seller per day | 2 orders | Conservative estimate |
| Database row growth rate | 100 rows/user/month | Posts, messages, notifications |

---

## 1,000 MAU (Month 1–3)

**DAU:** ~300 | **Peak concurrent users:** ~50

### API Server
```
Requests/day:    300 DAU × 50 req/session = 15,000/day
Requests/hour:   ~2,000 at peak (8–10 PM Addis time)
Requests/second: ~0.5 req/sec at peak

→ Single Railway Hobby instance (512 MB RAM, 0.25 vCPU) handles easily
→ CPU utilization: ~5% at peak
→ No scaling needed
```

### Database
```
Row counts (estimated):
  users:         1,000
  posts:         5,000  (5 posts/user average)
  products:      2,000  (2 products/seller, ~50 sellers)
  orders:        300    (10% of users placed 1 order)
  messages:      10,000 (10 messages/user average)
  notifications: 15,000

Total database size: ~50 MB
Neon free tier (3 GB): ✅ Fine for 18+ months at this rate
```

### Storage (Cloudflare R2)
```
Profile photos:   1,000 users × 50 KB = 50 MB
Product images:   2,000 products × 3 images × 150 KB = 900 MB
Post images:      1,000 posts × 250 KB = 250 MB
Total: ~1.2 GB

Cloudflare R2 free tier (10 GB): ✅ Fine
```

### Cost
```
Railway:    $5/month
Vercel:     $0
Neon:       $0
R2:         $0
Redis:      $0
Resend:     $0 (< 3K emails)
Total:      $5/month
```

---

## 10,000 MAU (Month 6–9)

**DAU:** ~3,000 | **Peak concurrent:** ~500

### API Server
```
Requests/day:    150,000/day
Requests/second: ~5 req/sec at peak
Memory needed:   ~300–400 MB active

→ Railway Starter ($20/month) 
→ 1 GB RAM, 1 vCPU
→ CPU utilization: ~30–40% at peak
→ Monitor: If CPU > 60% sustained → scale up
```

### Database
```
Row counts:
  users:         10,000
  posts:         100,000
  products:      20,000
  orders:        5,000
  messages:      200,000
  notifications: 300,000
  Total rows:    ~635,000

Database size: ~500 MB
Connection usage: ~15–20 concurrent connections (enable pooler!)
Neon free (3 GB): ✅ Fine, but upgrade soon
Neon Launch ($19/month): Plan ahead
```

### Storage
```
Profile photos:   10,000 × 50 KB = 500 MB
Product images:   20,000 × 3 × 150 KB = 9 GB
Post images:      50,000 × 250 KB = 12.5 GB
Total: ~22 GB

R2 free (10 GB): ❌ Exceeded
R2 paid: 22 GB × $0.015 = $0.33/month ← trivially cheap
```

### Redis Usage
```
Commands/day:
  - Feed cache: 3,000 DAU × 5 feed loads = 15,000 GET
  - Trending: 3,000 × 2 page views = 6,000 GET
  - Presence: 3,000 × 20 messages × 2 (set+get) = 120,000 operations
  
Total: ~150,000 commands/day

Upstash free (10,000/day): ❌ Exceeded
Upstash Pay-as-you-go ($0.2 per 100K commands): 150K × $0.002 = $0.30/day = $9/month
```

### Cost
```
Railway:    $20/month
Vercel:     $0 (upgrade to Pro at ~5K users: $20/month)
Neon:       $19/month (Launch)
Redis:      $9/month (Upstash PAYG)
R2:         $0.50/month
Resend:     $0 (< 3K emails, upgrade at ~2K users to $20/month)
Total:      ~$70/month

Revenue (assuming 1,000 orders/month × ETB 500 × 3%):
→ ETB 15,000/month commission = ~$120/month
→ Infrastructure is 58% of revenue → acceptable at launch; subscriptions/other revenue close the gap
```

---

## 50,000 MAU (Month 12)

**DAU:** ~15,000 | **Peak concurrent:** ~2,500

### API Server
```
Requests/second: ~25 req/sec at peak
Memory needed:   ~600–800 MB

→ Railway Team ($20/month base) + 2 instances
→ Each instance: 1 GB RAM, 1 vCPU
→ Socket.IO Redis adapter required (rooms shared across instances)
→ CPU per instance: ~40% at peak
→ Total Railway cost: ~$60–80/month
```

### Database
```
Row counts:
  Total rows: ~5,000,000

Database size: ~3–5 GB
Connections: 40–50 concurrent (pooler essential!)
Neon Scale ($69/month): Upgrade from Launch
Read replica: Evaluate — reads likely 70%+ of queries
Query performance: Add missing indexes (run pg_stat_statements weekly)
```

### BullMQ Background Jobs
```
Jobs/day:
  - Order confirmation emails: 500
  - Push notifications: 30,000 (20 per DAU)
  - Commission collection: 500
  - Feed cache warm: 288 (every 5 min)
  - Trending warm: 288

→ Deploy dedicated BullMQ worker on Railway ($15/month extra instance)
→ Reduces API latency by moving heavy work off request path
```

### Storage
```
Total uploads: ~120 GB
R2: 120 GB × $0.015 = $1.80/month
Egress: 50K users × 100 images/day × 50 KB = ~250 GB/day
R2 egress: $0 (zero egress fees — this is why we chose R2)
AWS S3 equivalent egress cost: $22.50/day = $675/month ← R2 saves this
```

### Cost
```
Railway (2 instances + worker): $80/month
Vercel Pro:                      $20/month
Neon Scale:                      $69/month
Redis (Upstash):                 $30/month
R2 storage:                      $2/month
Resend Growth:                   $89/month (50K emails)
Sentry Team:                     $26/month
Total:                           ~$316/month

Revenue (5,000 orders/month × ETB 800 × 3%):
→ ETB 120,000 commission ≈ $960/month
→ Infrastructure is 33% of revenue → acceptable; monitor as order value grows
```

---

## 200,000 MAU (Year 2)

**DAU:** ~60,000 | **Peak concurrent:** ~10,000

### API Server
```
Requests/second: ~100 req/sec at peak
→ Railway Team, 5 instances across 2 regions (US + EU)
→ Socket.IO Redis Cluster adapter
→ Each instance: 2 GB RAM, 2 vCPU
→ Cost: ~$200–400/month
```

### Database
```
Total rows: ~30,000,000
Database size: ~20–30 GB
Connections: 150–200 concurrent
→ Neon Scale (multiple compute units)
→ 1 primary (writes) + 2 read replicas (different regions)
→ Consider migration to AWS RDS for cost optimization
→ Cost: ~$200–500/month
```

### Search
```
PostgreSQL ILIKE becomes too slow at this scale
→ Deploy Meilisearch on Railway or Meilisearch Cloud
→ Index: products (20M rows), users (200K), showrooms (50K), posts (1M)
→ Search latency: < 50ms vs 500ms+ on PostgreSQL
→ Cost: $50–150/month
```

### Cost
```
Railway (5 instances + workers + EU):  $300/month
Vercel Pro:                             $20/month
Neon (multi-region):                    $400/month
Redis Cluster (Upstash):               $100/month
R2 storage (500 GB):                    $7.50/month
Email (SendGrid/AWS SES):              $200/month
Sentry Business:                        $80/month
Meilisearch:                            $100/month
Cloudflare Pro:                         $20/month
PagerDuty:                              $100/month
DataDog/Grafana:                        $200/month
Total:                                  ~$1,530/month

Revenue (20,000 orders/month × ETB 1,000 × 3% + 1,000 subscriptions × ETB 299):
→ ETB 600K commission + ETB 299K subs = ETB 0.9M/month ≈ $7,000/month
→ Infrastructure is 22% of revenue → Healthy
```

---

## 1,000,000 MAU (Year 3+)

**DAU:** ~300,000 | **Peak concurrent:** ~50,000

```
At this scale, move from Railway to AWS:
  - AWS ECS (Elastic Container Service): 10–20 containers, auto-scaling
  - AWS RDS Aurora PostgreSQL: Multi-AZ, read replicas, ~$2,000/month
  - AWS ElastiCache Redis: Cluster mode, ~$500/month
  - Cloudflare Enterprise: Custom SLA, dedicated support
  - Elasticsearch: Full-text search at billion-record scale
  - ClickHouse: Analytics database for business intelligence
  
Total cost: ~$20,000–50,000/month

Revenue (100,000 orders/month × ETB 1,500 × 3% + 10,000 subs × ETB 299):
→ ETB 4.5M commission + ETB 3M subs = ETB 7.5M/month ≈ $60,000/month
→ Infrastructure is 33–83% of revenue → Must optimize before this stage
```

---

## Capacity Planning Triggers

Set these alerts and act when triggered:

| Metric | Alert threshold | Action |
|---|---|---|
| Railway CPU | > 60% sustained for 30 min | Add another instance |
| Railway RAM | > 80% | Upgrade to larger instance size |
| DB connection pool | > 80% utilized | Enable/tune PgBouncer |
| Neon storage | > 80% of plan limit | Upgrade plan |
| Redis commands | > 80% of daily limit | Upgrade to paid tier |
| R2 storage | > 80% of 10GB free | Switch to paid (trivially cheap) |
| API p95 latency | > 1000ms | Performance audit |
| Error rate | > 1% | Engineering incident |
| Email send failure | > 5% | Check Resend limits |

---

## Load Testing Schedule

Before every major launch milestone:

```bash
# Install k6: https://k6.io/docs/get-started/installation/
npm install -g k6

# Test 1: Feed load (most common action)
k6 run --vus 100 --duration 5m scripts/load-test-feed.js

# Test 2: Concurrent checkout (payment critical path)
k6 run --vus 20 --duration 2m scripts/load-test-checkout.js

# Test 3: Message storm (WebSocket stress)
k6 run --vus 500 --duration 10m scripts/load-test-messages.js

# Acceptance criteria:
# - Error rate < 0.5%
# - p95 response time < 500ms
# - No database connection pool exhaustion
# - No memory leaks (RSS stays flat over 10 minutes)
```
