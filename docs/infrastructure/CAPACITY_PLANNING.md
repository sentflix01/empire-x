# Nodbusiness — Capacity Planning

> How much infrastructure we need at each user count, and when to add more.
> **Last updated:** September 2026
> **Stack:** Render (backend) · Vercel (frontend) · Supabase · Upstash Redis · Cloudflare R2

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
| VM | Virtual Machine |

---

## Baseline Assumptions

| Metric | Value | Source |
|---|---|---|
| Average session length | 10 minutes | Industry benchmark for social apps |
| Pages/API calls per session | 50 requests | Measured via backend logs |
| Daily Active Users (DAU) / MAU ratio | 30% | Target (industry: 20–40%) |
| Average product image size | 150 KB (after sharp compression) | Upload middleware |
| Average post image size | 250 KB (after sharp compression) | Upload middleware |
| Average messages per DAU per day | 20 messages | Social app benchmark |
| Average orders per seller per day | 2 orders | Conservative estimate |
| Database row growth rate | 100 rows/user/month | Posts, messages, notifications |

---

## Render Free Tier Capacity (Current)

```
Memory: 512 MB RAM
CPU: 0.1 CPU (shared)
Network: Unlimited inbound, limited outbound

At 500 DAU (peak ~5 req/sec):  well within limits
At 2,000 DAU (peak ~20 req/sec): upgrade to Starter ($7/month) or Standard ($25/month)
At 5,000 DAU: upgrade to Standard ($25/month) for dedicated CPU

Scale-up trigger: p95 response time > 500ms sustained → upgrade Render plan
```

---

## 1,000 MAU (Month 1–3)

**DAU:** ~300 | **Peak concurrent users:** ~50

### API Server (Render)

```
Requests/day:    300 × 50 = 15,000/day
Requests/second: ~0.5 req/sec at peak
Memory used:     ~250 MB backend process

→ Render free tier (512 MB RAM) handles this trivially
→ No scaling needed
```

### Database (Supabase)

```
Row counts (estimated):
  users:         1,000
  posts:         5,000
  products:      2,000
  orders:        300
  messages:      10,000
  notifications: 15,000

Database size: ~30–50 MB
Supabase free tier (500 MB): ✅ Fine for 6+ months at this rate
Egress: ~500 MB/month — well within 5 GB free
```

### Storage (Cloudflare R2)

```
Profile photos:   1,000 × 50 KB = 50 MB
Product images:   2,000 × 3 × 150 KB = 900 MB
Post images:      1,000 × 250 KB = 250 MB
Total: ~1.2 GB

R2 free tier (10 GB): ✅ Fine
```

### Upstash Redis

```
Commands/day:
  BullMQ (email/notif/webhook):  ~500 jobs × 10 cmds = 5,000
  Rate limit checks:             ~15,000 req × 2 = 30,000
  Cache gets/sets:               ~5,000
  Feature flag reads:            ~2,000
  Total: ~42,000 commands/day = ~1.3M/month

⚠️  Exceeds 500K free limit if sustained at this rate.
    In practice, most commands are lightweight and the pattern
    varies heavily. Monitor Upstash dashboard.
    At true 1K MAU with 300 DAU: ~40K commands/day = 1.2M/month
    → Switch to Upstash PAYG ($0.20/100K) at ~$0.50/month overage
```

### Cost

```
Oracle VM:    $0 → replaced by Render free tier
Render:       $0 (free tier)
CF Pages:     $0 → replaced by Vercel free tier
Vercel:       $0 (free tier)
Supabase:     $0
Upstash:      $0–1 (possible slight overage)
R2:           $0
Resend:       $0 (< 3K emails)
Sentry:       $0
Domain:       ~$1.50
Total:        ~$1.50–2.50/month
```

---

## 10,000 MAU (Month 6–9)

**DAU:** ~3,000 | **Peak concurrent:** ~500

### API Server

```
Requests/day:    150,000/day
Requests/second: ~5 req/sec at peak
Memory used:     ~350–450 MB backend process

→ Render Starter ($7/month) or Standard ($25/month) recommended at this scale
→ Monitor: if p95 > 500ms → upgrade plan
```

### Database (Supabase)

```
Row counts:
  Total rows: ~635,000
Database size: ~400–480 MB  ← approaching 500 MB free limit
Egress: ~3–5 GB/month       ← approaching 5 GB free limit

→ Plan to upgrade Supabase to Pro ($25/month) at this stage
   Trigger: size > 400 MB OR egress > 4 GB/month
```

### Storage

```
Total uploads: ~22 GB
R2 paid: 22 GB × $0.015 = $0.33/month (trivial)
Egress: FREE on R2 (zero egress fees)
```

### Upstash Redis

```
Commands/month: ~10–15M
Upstash PAYG:  ~$20–30/month at $0.20/100K
Or: Upstash Fixed $10/month plan
```

### Cost

```
Oracle VM:          $0 → Render
Render:             $7–25
CF Pages:           $0 → Vercel
Vercel:             $0
Supabase Pro:       $25
Upstash PAYG:       $20–30
R2 storage:         $0.50
Resend Starter:     $20 (if email volume requires)
Sentry:             $0
Domain:             $1.50
Total:              ~$75–100/month
```

---

## 50,000 MAU (Month 12)

**DAU:** ~15,000 | **Peak concurrent:** ~2,500

### API Server

```
Requests/second: ~25 req/sec at peak
Memory needed:   ~500–700 MB

→ Upgrade Render to Standard ($25/month) or Pro ($85/month)
→ Consider multiple Render instances or a Hetzner VM for the backend
→ Socket.IO Redis adapter REQUIRED (Upstash pub/sub for shared rooms)
```

### Background Jobs (BullMQ)

```
Jobs/day:
  Order confirmation emails:    500
  Push notifications:           30,000
  Commission collection:        500
  Cache warm:                   288
  Webhook deliveries:           1,000

→ Workers run in-process (same Render instance) — sufficient at this scale
→ Consider dedicated Render worker service if API latency suffers
→ Cost: included in Render plan
```

### Storage

```
Total uploads: ~120 GB
R2: 120 × $0.015 = $1.80/month
Egress: $0 (R2 zero egress) vs AWS S3 equivalent: ~$675/month
```

### Cost

```
Oracle VM:              $0 → replaced by Render
Render Standard:        $25
CF Load Balancer:       $5 (optional, if multiple instances)
CF Pages:               $0 → replaced by Vercel
Vercel:                 $0
Supabase Pro:           $25–50
Upstash PAYG/Fixed:     $30
R2 storage:             $2
Resend Growth:          $89 (50K emails)
Sentry Team:            $26
Domain + misc:          $2
Total:                  ~$205–235/month
```

---

## 200,000 MAU (Year 2)

**DAU:** ~60,000 | **Peak concurrent:** ~10,000

### API Server

```
Requests/second: ~100 req/sec at peak
→ Multiple Render instances (Pro plan) or migrate to a dedicated VPS (Hetzner CAX21 €8/month each)
→ Socket.IO Redis adapter (Upstash handles pub/sub)
→ Each instance: ~40% CPU at peak
→ Cost: ~$35–50/month for compute
```

### Database

```
Total rows: ~30,000,000
Database size: ~20–30 GB
Connections: ~150–200 concurrent

→ Supabase Scale tier ($599/month) or evaluate self-hosted PostgreSQL
→ Enable read replicas for feed/products/profiles queries
→ Consider migration to AWS RDS for cost optimization
```

### Search

```
PostgreSQL ILIKE too slow at this scale for product search
→ Deploy Meilisearch on a Hetzner VM
→ BullMQ job syncs writes → index updates < 1 minute
→ Cost: $0 (on existing Hetzner VM)
```

### Cost

```
Render (multiple instances): $50–100
CF Load Balancer:       $5
Vercel:                 $0
Supabase Scale:         $599
Upstash Fixed:          $50
R2 storage (500 GB):    $7.50
Email (Resend Business): $249
Sentry Business:         $80
Cloudflare Pro:          $20
Meilisearch:             $0 (self-hosted)
Total:                   ~$1,060–1,110/month
```

---

## 1,000,000 MAU (Year 3+)

**DAU:** ~300,000 | **Peak concurrent:** ~50,000

```
At this scale, migrate from Render to AWS:
  - AWS ECS (Fargate): 10–20 containers, auto-scaling — ~$1,500/month
  - AWS RDS Aurora PostgreSQL: multi-AZ, read replicas — ~$2,000/month
  - AWS ElastiCache Redis: Cluster mode — ~$500/month
  - Cloudflare Enterprise: custom SLA — negotiated pricing
  - Elasticsearch: full-text search at billion-record scale — ~$300/month
  - ClickHouse: analytics database — ~$200/month

Total cost: ~$15,000–40,000/month

Revenue (100K orders/month × ETB 1,500 × 3% + 10K subs × ETB 299):
→ ETB 4.5M + ETB 3M = ETB 7.5M/month ≈ $60,000/month
→ Infrastructure is ~25–65% of revenue — must optimize before this stage
```

---

## Capacity Alerts to Configure

| Metric | Alert threshold | Action |
|---|---|---|
| Render p95 latency | > 500ms sustained | Upgrade Render plan or add instances |
| Render memory | > 80% of plan limit | Upgrade Render plan |
| Supabase DB size | > 400 MB | Plan upgrade to Pro |
| Supabase egress | > 4 GB/month | Plan upgrade to Pro |
| Upstash commands | > 400K/month | Switch to PAYG or Fixed plan |
| R2 storage | > 8 GB free | Confirm storage costs (trivial: $0.015/GB) |
| API p95 latency | > 1,000ms | Performance audit |
| Backend error rate | > 1% | Engineering incident |
| Resend daily emails | > 80/day | Monitor daily cap (100/day) |

---

## Load Testing Schedule

Before every major launch milestone:

```bash
# Install k6: https://k6.io/docs/get-started/installation/

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
# - Socket.IO maintains connections during load
```
