# Empire X — Database Reference

> Full ERD: `docs/architecture/ERD.md`
> Schema details are maintained here and in `docs/architecture/ERD.md`.
> Migration files: `backend/db/migrate*.js`

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
| `migrate6.js` | Adds 'poll' to posts post_type constraint |
| `migrate7.js` | Adds ticker_type column, sets default to 'none', backfills existing profiles |
| `migrate8.js` | 30+ performance indexes for queries, geo, FTS, notifications |

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

Neon uses PgBouncer for connection pooling automatically. The connection string uses a pooled endpoint:

```
postgresql://user:pass@ep-xxx-pooler.neon.tech/empirex?sslmode=require
```

For direct connections (migrations, admin queries), use the non-pooled endpoint. For the app, always use the pooled endpoint.

Max connections rule of thumb: set `connection_limit` in the URL to `10` per backend instance in production to avoid hitting Neon's connection limits.
