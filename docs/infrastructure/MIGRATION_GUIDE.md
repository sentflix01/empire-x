# Nodbusiness — Database Migration Guide

> How to safely create, run, and roll back database migrations.
> Every schema change goes through this process — no direct ALTER TABLE in production.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| DB | Database |
| SQL | Structured Query Language |
| DDL | Data Definition Language — SQL for schema changes (CREATE, ALTER, DROP) |
| DML | Data Manipulation Language — SQL for data changes (INSERT, UPDATE, DELETE) |
| PITR | Point-In-Time Recovery — restoring a database to an earlier state |
| CI/CD | Continuous Integration / Continuous Delivery |
| UUID | Universally Unique Identifier |
| PII | Personally Identifiable Information |
| ETB | Ethiopian Birr — reference market currency |
| API | Application Programming Interface |

---

## 1. Migration File Conventions

### File Naming
```
backend/db/migrate.js        ← Core schema (initial)
backend/db/migrate2.js       ← Second migration
backend/db/migrate3.js       ← Third migration
...
backend/db/migrate28.js      ← Current latest (September 2026)
backend/db/migrate-all.js    ← Runs all migrations in order
```

**Rule:** Always increment the number. Never reuse a number. Never edit a migration that has already been run in production.

**Important for Supabase:** Always use the direct connection URL (port 5432) when running migrations — never the Supavisor pooler (port 6543). The pooler's transaction mode blocks DDL statements like `ALTER TABLE` and `CREATE INDEX CONCURRENTLY`.

### File Template
```javascript
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
  -- Your SQL here
  -- Always use IF NOT EXISTS / IF EXISTS for idempotency
  ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
  CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Running migration N...');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('✅ Migration N complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration N failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
```

---

## 2. Idempotency Rules

Every migration MUST be safe to run more than once.

| Operation | Idempotent Form |
|-----------|----------------|
| Create table | `CREATE TABLE IF NOT EXISTS` |
| Add column | `ALTER TABLE t ADD COLUMN IF NOT EXISTS col TYPE` |
| Drop column | `ALTER TABLE t DROP COLUMN IF EXISTS col` |
| Create index | `CREATE INDEX IF NOT EXISTS idx_name ON t(col)` |
| Drop index | `DROP INDEX IF EXISTS idx_name` |
| Add constraint | Check `information_schema.table_constraints` first |
| Insert data | `INSERT ... ON CONFLICT DO NOTHING` |

**Why:** If a migration fails halfway and you run it again, it must not error out on the parts that already ran.

---

## 3. Running Migrations

### Development
```bash
cd backend

# Run all migrations in order (fresh database)
npm run migrate
# or
node db/migrate-all.js

# Run a specific migration only
node db/migrate30.js

# Check what tables exist
psql $DATABASE_URL -c "\dt"

# Check a specific table schema
psql $DATABASE_URL -c "\d table_name"
```

### Production (Coolify + Supabase)
```bash
# Option 1: Via GitHub Actions (automatic on every deploy to main)
# migrations run automatically in the 'migrate' job of deploy.yml
# Uses DATABASE_URL secret (direct connection, port 5432 — NOT the pooler)

# Option 2: Connect directly to Supabase via psql (direct connection)
psql "$DATABASE_DIRECT_URL" -f migration.sql
# Note: use the direct connection URL (port 5432), not the Supavisor pooler (port 6543)
# DDL statements (ALTER TABLE, CREATE INDEX) do not work through the pooler

# Option 3: Run from your local machine against production
DATABASE_URL="postgresql://postgres.REF:[PASS]@db.REF.supabase.co:5432/postgres?sslmode=require&channel_binding=require" \
  node backend/db/migrate30.js
```

---

## 4. Migration Checklist

Before running a migration in production:

```
Pre-migration:
□ Migration is idempotent (safe to run twice)
□ Migration tested locally on a fresh database
□ Supabase PITR backup confirmed (check Supabase console → Database → Backups)
□ Migration takes less than 30 seconds (else use zero-downtime pattern)
□ No breaking changes to active API endpoints
□ Code that depends on new columns is deployed AFTER migration runs
□ Using direct connection URL (port 5432), NOT the Supavisor pooler (port 6543)

During migration:
□ Monitor Coolify container logs for errors
□ Verify with psql that schema looks correct after

Post-migration:
□ Run smoke test on key endpoints
□ Check error rate in Sentry / DevOps Live Errors
□ Update DATABASE.md and ERD.md with new schema
```

---

## 5. Zero-Downtime Migration Patterns

For large tables (> 100,000 rows) or high-traffic columns, naïve ALTER TABLE can lock the table and cause downtime.

### Adding a Nullable Column (safe, no lock)
```sql
-- Always safe — no default value = no table rewrite
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
```

### Adding a Column with Default (can lock on large tables)
```sql
-- UNSAFE on large tables:
ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending';

-- SAFE approach (3-step):
-- Step 1: Add without default
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT;
-- Step 2: Backfill in batches
UPDATE orders SET status = 'pending' WHERE status IS NULL AND id IN (
  SELECT id FROM orders WHERE status IS NULL LIMIT 1000
);
-- Repeat step 2 until all rows updated
-- Step 3: Add constraint/default
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
```

### Adding an Index (non-blocking)
```sql
-- UNSAFE: CREATE INDEX locks the table for writes
CREATE INDEX idx_orders_status ON orders(status);

-- SAFE: CONCURRENTLY allows writes during index build
-- Note: Cannot be inside a transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status);
```

### Renaming a Column (requires 3-step deploy)
```
Step 1: Add new column (deploy)
Step 2: Write to both old and new column (deploy)
Step 3: Switch reads to new column (deploy)
Step 4: Remove old column (deploy)
```

---

## 6. Migration History

| Migration | Purpose | Key Tables/Changes |
|-----------|---------|-------------------|
| `migrate.js` | Core schema | users, user_profiles, posts, businesses, showrooms, products, orders, tasks, conversations, messages, notifications, follows, likes, comments |
| `migrate2.js` | Social + commerce | stories, reviews, saves, reports, blocks, wallets, events, jobs, courses, loyalty_points, push_subscriptions, referrals |
| `migrate3.js` | Features | hashtags, polls, coupons, Telegram columns, lat/lng location, commissions |
| `migrate4.js` | Shopping | cart_items, wishlists |
| `migrate5.js` | Advanced commerce | product_variants, return_requests, delivery_updates, price_alerts |
| `migrate6.js` | Post types | Adds 'poll' to posts post_type constraint |
| `migrate7.js` | Profile | ticker_type column, backfill |
| `migrate8.js` | Performance | 30+ indexes for queries, geo, FTS (Full-Text Search), notifications |
| `migrate9.js` | Payments | chapa_tx_ref column on orders |
| `migrate10.js` | Showroom API | external_data_sources, field_mappings, external_health_records |
| `migrate11.js`–`migrate29.js` | Various features | See individual files for details |
| `migrate30.js` | DevOps | error_events table for live error capture |

---

## 7. Rollback Procedures

Supabase supports Point-In-Time Recovery (PITR):

```
1. Open https://supabase.com → your project
2. Click Database → Backups → Point in time restore
3. Select: [timestamp before the migration ran]
4. Supabase creates a new branch/project with data restored to that point
5. Test the restored data to confirm it is intact
6. If good: update DATABASE_URL in Coolify env vars to point to the restored instance
7. Trigger Coolify redeploy
8. After verification: promote the branch to replace main
```

**Note:** Only schema changes need PITR rollback. Data migrations (backfills) should have a reverse script prepared before running.

---

*Owner: Engineering team*
*Update this file whenever a new migration is added*
