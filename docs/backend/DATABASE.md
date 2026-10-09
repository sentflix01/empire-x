# Nodbusiness — Database Reference

> Full ERD: `docs/architecture/ERD.md`
> Migration files: `backend/db/migrate*.js`
> Current migration count: **47**

---

## Running Migrations

```bash
# Run all migrations in order (fresh database)
cd backend && npm run migrate

# Run a specific migration
node db/migrate7.js

# Check migration status (no built-in tracker — each migration uses IF NOT EXISTS)
psql $DATABASE_URL -c "\dt"  # list all tables
```

---

## Migration Files

| File | Contents |
|---|---|
| `migrate.js` | Core tables: users, user_profiles, posts, businesses, showrooms, products, orders, tasks, conversations, messages, notifications, follows, likes, comments |
| `migrate2.js` | Stories, reviews, saves, reports, blocks, wallets, events, jobs, courses, loyalty points, push subscriptions, referrals, FTS indexes |
| `migrate3.js` | Hashtags, polls, coupons, Telegram columns, location (lat/lng), commission table |
| `migrate4.js` | Cart items, wishlists |
| `migrate5.js` | Product variants, return requests, delivery updates, price alerts, cart variant support |
| `migrate6.js` | Adds `poll` to posts post_type constraint |
| `migrate7.js` | Adds `ticker_type` column, sets default to `none`, backfills existing profiles |
| `migrate8.js` | 30+ performance indexes for queries, geo, FTS, notifications |
| `migrate9.js` | Chapa `tx_ref` column on orders |
| `migrate10.js` | External API integration tables: `external_data_sources`, `field_mappings`, `external_health_records` |
| `migrate11.js` | Composite indexes for performance |
| `migrate12.js` | `is_seed` column backfill, `dismissed_suggestions` table |
| `migrate13.js` | `verification_requests` table |
| `migrate14.js` | `edited` and `reply_to_id` columns on messages |
| `migrate15.js` | `last_seen` column on users |
| `migrate16.js` | Additional performance indexes |
| `migrate17.js` | Missing profile columns added |
| `migrate18.js` | Verification columns on user_profiles |
| `migrate19.js` | Cover position columns on user_profiles |
| `migrate20.js` | Stripe payments schema: orders/wallet_transactions CHECK extensions, Stripe columns, webhook_events table |
| `migrate21.js` | `devops_items` table + indexes |
| `migrate22.js` | Idempotent CHECK constraint repair for orders.status and wallet_transactions.type |
| `migrate23.js` | Friends / suggestions support |
| `migrate24.js` | `comment_count` recomputed on posts |
| `migrate25.js` | `full_name` backfilled for existing users |
| `migrate26.js` | **Mewacho tables**: `mewacho_groups`, `mewacho_members`, `mewacho_contributions`, `mewacho_withdrawals`, `mewacho_activity` |
| `migrate44.js` | Demo showroom expiry timestamp and index |
| `migrate45.js` | Profile-owner partnerships, eligible product snapshots, commission ledger, and partnership attribution columns on orders |
| `migrate46.js` | Canonical account ownership link for isolated Demo workspace identities |
| `migrate47.js` | Explicit eligible subtotal on orders, profile commission adjustment ledger, and manual payout history/items |

Mewacho and the other deferred areas are not mounted in the launch app. Their historical schemas and records are retained; see `docs/product/POST_LAUNCH_FEATURES.md` before considering data cleanup or a future rebuild.

---

## Adding a New Migration

When you need to add a new column, table, or index:

1. Create `backend/db/migrate9.js` (increment the number)
2. Follow the existing pattern:
```js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
  ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 9...');
    await client.query(schema);
    console.log('✅ Migration 9 complete.');
  } catch (err) {
    console.error('❌ Migration 9 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
```
3. Add `'migrate9.js'` to the array in `migrate-all.js`
4. Always use `IF NOT EXISTS` for idempotency (safe to run twice)
5. Write a backwards-compatible migration (don't drop columns — mark as deprecated)

---

## Database Standards

| Rule | Why |
|---|---|
| UUID primary keys | Unguessable, globally unique, no sequence contention |
| `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | All tables — audit trail |
| `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Mutable tables — change tracking |
| `ON DELETE CASCADE` | Child records follow parent deletion |
| `ON DELETE SET NULL` | Optional FK references become null |
| `IF NOT EXISTS` on all migrations | Idempotent — safe to re-run |
| No soft deletes | Hard delete; `reports` table handles abuse tracking |
| Parameterized queries only | SQL injection prevention |
| ALLOWED_TABLES allowlist | `crud.js` validates table names |

---

## Useful Queries

```sql
-- Check all table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Count rows in key tables
SELECT 'users' AS t, COUNT(*) FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'posts', COUNT(*) FROM posts;

-- Find slow queries (requires pg_stat_statements extension)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check indexes on a table
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'products';

-- Check active connections
SELECT count(*) FROM pg_stat_activity
WHERE state = 'active';
```

---

## Connection Pooling

Supabase uses Supavisor for connection pooling. Two connection strings are available:

```
# Pooler URL — for the live application (Render env var DATABASE_URL)
# Transaction mode, port 6543 — efficient connection reuse
postgresql://postgres.REF:[PASS]@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require

# Direct URL — for migrations, pg_dump, admin queries
# Port 5432 — required for DDL (ALTER TABLE, CREATE INDEX CONCURRENTLY)
postgresql://postgres.REF:[PASS]@db.REF.supabase.co:5432/postgres?sslmode=require&channel_binding=require
```

Both are available at: **Supabase → Project Settings → Database → Connection string**

**Rule:** Use the pooler URL (port 6543) for the backend application. Use the direct URL (port 5432) for all migration scripts and `pg_dump` backups — DDL statements do not work through the pooler.

Set `DB_POOL_MAX=5` in Render environment variables (Supabase free tier connection limit is ~20 direct connections; the Supavisor pooler handles multiplexing transparently).
