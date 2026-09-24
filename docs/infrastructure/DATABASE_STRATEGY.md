# Nodbusiness — Database Strategy

> How the database evolves from a single instance to a globally distributed system.
> **Last updated:** September 2026
> **Provider:** Supabase (PostgreSQL 16) — free tier with Supavisor pooler

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| DB | Database |
| SQL | Structured Query Language |
| PITR | Point-In-Time Recovery |
| WAL | Write-Ahead Log — PostgreSQL transaction log |
| RDS | Relational Database Service — AWS managed PostgreSQL |
| ORM | Object-Relational Mapping |
| JSONB | JSON Binary — PostgreSQL binary JSON type |
| FTS | Full-Text Search |
| UUID | Universally Unique Identifier |
| SLA | Service Level Agreement |
| API | Application Programming Interface |
| MAU | Monthly Active Users |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| GB | Gigabyte |
| TB | Terabyte |

---

## Current State

```
Single PostgreSQL 16 instance (Supabase)
├── All reads + writes on one node
├── 28+ migrations applied
├── 50+ tables
├── Supavisor connection pooler (built-in, free)
│   ├── App connection:       port 6543 (transaction mode)
│   └── Migrations / pg_dump: port 5432 (direct)
├── Free tier: 500 MB storage, 5 GB/month egress
└── Keep-alive: backend pings every 4 min + GitHub Actions cron every 5 days
```

---

## Connection URL Strategy (Critical)

Supabase provides two connection strings. Use the correct one for each context:

| Context | URL Type | Port | Notes |
|---|---|---|---|
| **Live application** (Coolify env var `DATABASE_URL`) | Supavisor pooler | **6543** | Transaction mode — efficient connection reuse |
| **Migrations** (`db/migrate-all.js`) | Direct connection | **5432** | DDL requires direct — pooler blocks schema changes |
| **pg_dump backups** (`scripts/backup-database.js`) | Direct connection | **5432** | Backup tools require direct connection |

Both URLs available at: **Supabase → Project Settings → Database → Connection string**

```bash
# Application (pooler) — add ?pgbouncer=true for prepared statements compatibility
DATABASE_URL=postgresql://postgres.REF:[PASS]@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require

# Migrations + backups (direct)
DATABASE_DIRECT_URL=postgresql://postgres.REF:[PASS]@db.REF.supabase.co:5432/postgres?sslmode=require&channel_binding=require
```

---

## Migration History

| Migration | What it adds |
|---|---|
| `migrate.js` | Core tables: users, user_profiles, posts, businesses, showrooms, products, orders, tasks, conversations, messages, notifications, follows, likes, comments |
| `migrate2.js` | Social + commerce: stories, reviews, saves, reports, blocks, wallets, events, jobs, courses, loyalty_points, push_subscriptions, referrals |
| `migrate3.js` | Features: hashtags, polls, coupons, Telegram columns, lat/lng location, commissions |
| `migrate4.js` | Shopping: cart_items, wishlists |
| `migrate5.js` | Advanced commerce: product_variants, return_requests, delivery_updates, price_alerts |
| `migrate6.js–11.js` | Post types, profile fixes, performance indexes, Chapa, showroom external APIs |
| `migrate12.js–19.js` | Feature additions |
| `migrate20.js` | Stripe: webhook_events, stripe_payment_intent_id, payment_failed status |
| `migrate21.js–23.js` | More features |
| `migrate24.js` | Repair comment_count on posts |
| `migrate25.js` | Backfill users.full_name from profiles |
| `migrate26.js` | Chat performance indexes (GIN on conversations, messages) |
| `migrate27.js` | parent_id on comments (threaded replies) |
| `migrate28.js` | is_banned, ban_reason, banned_at on users |
| Future | Subscription tiers, business webhooks, API keys, Mewacho tables |

---

## Stage 0–1: Single Node (Current)

```sql
-- All traffic on one connection string (Supavisor pooler for app)
-- DB_POOL_MAX=5 in Coolify env vars (safe for Supabase free tier)

-- Immediate optimizations:
-- Check for missing indexes:
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('posts', 'products', 'orders', 'notifications', 'messages')
ORDER BY tablename, attname;

-- Check slow queries (enable pg_stat_statements in Supabase):
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check table sizes:
SELECT relname AS table,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

**Supabase free tier capacity check (run weekly):**
```sql
-- Check current database size vs 500 MB limit
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
```

---

## Stage 2: Read Replicas (10,000–100,000 users)

**Trigger:** Database CPU > 60% sustained; OR read queries > 70% of total

Supabase Pro supports read replicas on paid plans.

```javascript
// backend/db/pool.ts — add read pool when ready

const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,   // Supavisor pooler port 6543
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

## Stage 3: Caching Layer (Reduces DB Load 60–80%)

**Already built — just needs `REDIS_URL` activated in Coolify.**

```javascript
// backend/lib/redis.ts — already integrated
// Caches: trending, feed, profiles, products

const data = await cached('trending:global', 300, async () => {
  return await pool.query('SELECT ... complex trending query ...');
});
```

**Cache TTL guidelines:**

| Data | Cache key | TTL | Reason |
|---|---|---|---|
| Trending posts | `trending:global` | 5 min | Expensive query, changes slowly |
| User profile | `profile:{userId}` | 60 sec | Frequently accessed, rarely changes |
| Product list | `products:list` | 90 sec | Category browsing |
| Showroom | `showroom:{id}` | 5 min | Published showrooms are stable |
| Session token | `session:{jti}` | Token TTL | Fast auth check |
| Presence | `presence:{userId}` | 15 min | Online/offline status |

---

## Stage 4: Full-Text Search Extraction (100,000+ users)

**Trigger:** Search response time p95 > 500ms consistently

PostgreSQL `ILIKE` doesn't scale past ~1M rows. Switch to **Meilisearch** (self-hosted on Oracle/Hetzner VM via Coolify one-click).

```javascript
// backend/lib/search.ts (new file when needed)
const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_KEY,
});
```

**Sync strategy:** BullMQ job after every product/showroom/user write.

---

## Stage 5: Sharding (1,000,000+ users)

**Trigger:** Single PostgreSQL instance cannot handle write throughput

By that stage, migrate from Supabase to self-managed PostgreSQL on AWS RDS Aurora or GCP Cloud SQL. Supabase will not be the right tool at 1M+ MAU.

**Don't plan for this now.** At 1M users with good indexing and caching, PostgreSQL can handle it on a single large instance.

---

## Database Backup Strategy

### Supabase Managed (Automatic)

- Continuous WAL archiving
- Point-in-time recovery: 7 days (free tier), 30 days (Pro)
- No action needed — Supabase handles it

### Application-Level Backups (via `backend/scripts/backup-database.js`)

Daily `pg_dump` → gzip → upload to Cloudflare R2 `backups/` prefix:
- Uses direct connection (port 5432, not pooler)
- Requires `postgresql-client` in the Docker image (already in `backend/Dockerfile`)
- Retention: `BACKUP_RETENTION_DAYS` env var (default 14 days)
- Records last backup timestamp to `app_settings`

```bash
# Manual run:
cd backend && npm run backup

# Verify a backup is restorable:
BACKUP_VERIFY_DATABASE_URL=postgresql://<scratch-db> npm run backup:verify
```

---

## Performance Targets by Stage

| Stage | Users | Query p50 | Query p95 | Connection pool |
|---|---|---|---|---|
| 0 | < 1K | < 20ms | < 100ms | 5 connections (Supabase free) |
| 1 | 1K–10K | < 15ms | < 80ms | 10 connections |
| 2 | 10K–100K | < 10ms | < 50ms | 20 connections + pooler |
| 3 | 100K–1M | < 5ms | < 20ms | 50 connections + read replicas |
| 4 | 1M+ | < 3ms | < 10ms | Sharded, dedicated PgBouncer |

**Monitoring query (run weekly):**
```sql
SELECT query, calls, round(mean_exec_time::numeric, 2) AS avg_ms,
       round(stddev_exec_time::numeric, 2) AS stddev_ms,
       round(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 30;
```
