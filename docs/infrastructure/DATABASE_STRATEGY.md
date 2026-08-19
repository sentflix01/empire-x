# Halehame — Database Strategy

> How the database evolves from a single instance to a globally distributed system.
> Last updated: August 2026

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
Single PostgreSQL instance (Neon)
├── All reads + writes on one node
├── 28 migrations applied
├── ~40+ tables
└── Connection pooling via PgBouncer (must enable in Neon console)
```

---

## Migration History

| Migration | What it adds | Why |
|---|---|---|
| migrate.js | Core tables (users, posts, products, orders, etc.) | Foundation |
| migrate2–6 | Additional features (stories, tasks, wallets, etc.) | Feature expansion |
| migrate7 | `ticker_type` column fix | Bug fix |
| migrate8 | Performance indexes (posts, products, messages) | Performance |
| migrate9–19 | Feature additions | Growth |
| migrate20 | `webhook_events`, `stripe_payment_intent_id`, `payment_failed` status | Stripe idempotency |
| migrate21–23 | More features | Growth |
| migrate24 | Repair `comment_count` on posts | Data integrity |
| migrate25 | Backfill `users.full_name` from profiles | Data sync |
| migrate26 | Chat performance indexes (GIN on conversations, messages) | Performance |
| migrate27 | `parent_id` on comments (threaded replies) | Feature |
| migrate28 | `is_banned`, `ban_reason`, `banned_at` on users | Admin |

---

## Stage 0–1: Single Node (Current)

```sql
-- All traffic on one connection string
DATABASE_URL=postgresql://user:pass@neon.tech/halehame

-- Enable connection pooling NOW (critical)
-- In Neon Console → Project → Settings → Connection Pooling
-- Use the pooler connection string for app
-- Direct connection string only for migrations
```

**Immediate optimizations:**
```sql
-- Check for missing indexes:
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('posts', 'products', 'orders', 'notifications', 'messages')
ORDER BY tablename, attname;

-- Check slow queries:
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

---

## Stage 2: Read Replicas (10,000–100,000 users)

**Trigger:** Database CPU > 60% sustained; OR read queries > 70% of total

```javascript
// backend/db/pool.js — add read pool

const { Pool } = require('pg');

// Write pool — for INSERT/UPDATE/DELETE
const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Read pool — for SELECT (cheaper, more instances)
const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Smart routing
async function query(text, params, { write = false } = {}) {
  const pool = write || isWriteQuery(text) ? writePool : readPool;
  return pool.query(text, params);
}

function isWriteQuery(sql) {
  const normalized = sql.trim().toUpperCase();
  return normalized.startsWith('INSERT') ||
         normalized.startsWith('UPDATE') ||
         normalized.startsWith('DELETE') ||
         normalized.startsWith('CREATE') ||
         normalized.startsWith('DROP') ||
         normalized.startsWith('ALTER');
}

module.exports = { query, writePool, readPool };
```

**Neon read replica setup:**
```
1. Neon Console → Branches → Create branch
2. Name: "read-replica"
3. Copy connection string → set as DATABASE_READ_URL
4. Neon syncs data continuously (< 100ms lag)
```

---

## Stage 3: Caching Layer (Reduces DB Load 60–80%)

**Already built — just needs REDIS_URL activated.**

```javascript
// backend/lib/redis.js — already integrated
// Caches: trending, feed, profiles, products

// Cache usage in routes:
const data = await cached('trending:global', 300, async () => {
  // Expensive query runs only once per 5 minutes
  return await pool.query('SELECT ... complex trending query ...');
});
```

**What to cache and for how long:**

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

**Trigger:** Search response time p95 > 500ms

PostgreSQL `ILIKE` doesn't scale past ~1M rows. Switch to **Meilisearch**.

```javascript
// backend/lib/search.js (new file)
const { MeiliSearch } = require('meilisearch');

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_KEY,
});

// Index setup (run once on startup)
async function setupIndexes() {
  const indexes = {
    products: { filterableAttributes: ['category', 'seller_id', 'status', 'price'], sortableAttributes: ['price', 'view_count', 'created_at'] },
    users: { filterableAttributes: ['is_verified', 'profile_type'], sortableAttributes: ['follower_count'] },
    showrooms: { filterableAttributes: ['category', 'status'], sortableAttributes: ['view_count'] },
    posts: { filterableAttributes: ['author_id', 'post_type'], sortableAttributes: ['like_count', 'created_at'] },
  };
  for (const [name, settings] of Object.entries(indexes)) {
    const index = client.index(name);
    await index.updateSettings(settings);
  }
}

// Search function
async function search(indexName, query, options = {}) {
  return client.index(indexName).search(query, {
    limit: options.limit || 20,
    offset: options.offset || 0,
    filter: options.filter,
    sort: options.sort,
  });
}
```

**Sync strategy (BullMQ job):**
```javascript
// On every product write → queue sync job
await queue.add('syncToSearch', {
  index: 'products',
  action: 'upsert', // or 'delete'
  document: { id, title, description, category, price, seller_id, status }
});
```

---

## Stage 5: Sharding (1,000,000+ users)

**Trigger:** Single PostgreSQL instance cannot handle write throughput

**Strategy:** Shard by `user_id` using consistent hashing

```
Shard 0 (users 0x0–0x3): user-data-db-0
Shard 1 (users 0x4–0x7): user-data-db-1
Shard 2 (users 0x8–0xb): user-data-db-2
Shard 3 (users 0xc–0xf): user-data-db-3
```

**What stays on primary (not sharded):**
- `orders` — cross-seller queries needed
- `products` — marketplace-wide search needed
- `notifications` — user-agnostic delivery

**Cross-shard queries (scatter-gather):**
```javascript
// Get posts from all users a person follows:
const followedShards = groupByShards(followedUserIds);
const results = await Promise.all(
  followedShards.map(({ shardId, userIds }) =>
    shards[shardId].query('SELECT * FROM posts WHERE author_id = ANY($1)', [userIds])
  )
);
const merged = results.flat().sort((a, b) => b.created_at - a.created_at);
```

**Important:** Don't shard until you genuinely need to. Sharding adds enormous complexity.
At 1M users with good indexing and caching, PostgreSQL can handle it on a single large instance.

---

## Database Backup Strategy

### Current (Neon Managed)
- Continuous WAL archiving
- Point-in-time recovery up to 7 days (free tier) / 30 days (paid)
- No action needed — Neon handles it

### Production Backup Plan

```bash
# Daily backup to Cloudflare R2 (run via BullMQ cron job)
# backend/scripts/backup-database.js

const { execSync } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql.gz`;
  
  // Dump and compress
  execSync(`pg_dump ${process.env.DATABASE_URL} | gzip > /tmp/${filename}`);
  
  // Upload to R2
  const client = new S3Client({ endpoint: process.env.R2_ENDPOINT });
  await client.send(new PutObjectCommand({
    Bucket: 'halehame-backups',
    Key: `database/${filename}`,
    Body: require('fs').readFileSync(`/tmp/${filename}`),
  }));
  
  console.log(`Backup completed: ${filename}`);
}
```

**Retention:** Keep daily backups for 30 days, weekly for 6 months, monthly for 2 years

---

## Performance Targets by Stage

| Stage | Users | Query p50 | Query p95 | Connection pool |
|---|---|---|---|---|
| 0 | < 1K | < 20ms | < 100ms | 10 connections |
| 1 | 1K–10K | < 15ms | < 80ms | 20 connections |
| 2 | 10K–100K | < 10ms | < 50ms | 50 connections |
| 3 | 100K–1M | < 5ms | < 20ms | 100 connections + replicas |
| 4 | 1M+ | < 3ms | < 10ms | Sharded, PgBouncer |

**Monitoring query:** Run weekly to catch regressions:
```sql
SELECT query, calls, round(mean_exec_time::numeric, 2) AS avg_ms,
       round(stddev_exec_time::numeric, 2) AS stddev_ms,
       round(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 30;
```
