# Nodbusiness — Database Reference

> Full ERD: `docs/architecture/ERD.md`
> Schema details are maintained here and in `docs/architecture/ERD.md`.
> Migration files: `backend/db/migrate*.js`
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| DB | Database |
| SQL | Structured Query Language |
| DDL | Data Definition Language — CREATE, ALTER, DROP |
| DML | Data Manipulation Language — INSERT, UPDATE, DELETE |
| UUID | Universally Unique Identifier |
| FTS | Full-Text Search |
| JSONB | JSON Binary — PostgreSQL binary JSON storage |
| PITR | Point-In-Time Recovery |
| ORM | Object-Relational Mapping |
| PK | Primary Key |
| FK | Foreign Key |
| ETB | Ethiopian Birr — reference market currency |

---

## Running Migrations

```bash
# Run all pending migrations in order (tracked, idempotent)
cd backend && npm run migrate

# Check what is applied / pending
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY applied_at"

# List all tables
psql $DATABASE_URL -c "\dt"
```

`db/migrate-all.js` auto-discovers `migrate*.js` files and records each applied migration in the
**`schema_migrations`** tracking table (name, checksum, applied_at). Re-running is safe: already
applied migrations are skipped. Legacy scripts are spawned as subprocesses; newer ones export a
function.

---

## Migration Files (complete registry — 34 files)

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
| `migrate9.js` | Chapa support: `orders.chapa_tx_ref` column |
| `migrate10.js` | Showroom External API: external_data_sources, external_health_records, field_mappings |
| `migrate11.js` | Composite indexes (notifications unread count, feed, chat) |
| `migrate12.js` | `users.is_seed` flag + dismissed_suggestions table |
| `migrate13.js` | verification_requests table (selfie + ID document review) — ⚠️ see TECHNICAL_DEBT: routes/verification.ts writes columns that don't exist here yet |
| `migrate14.js` | messages: edited + reply_to_id columns |
| `migrate15.js` | users.last_seen (presence) |
| `migrate16.js` | Missing performance indexes on hot query paths |
| `migrate17.js` | user_profiles social/website/phone/languages/certifications columns (ProfileEdit) |
| `migrate18.js` | user_profiles verification_type / verified_at / verification_note |
| `migrate19.js` | user_profiles cover position columns (drag-to-position editor) |
| `migrate20.js` | Stripe schema support; orders.status CHECK extended with payment_failed/refunded |
| `migrate21.js` | devops_items table (admin Developer Ops board) |
| `migrate22.js` | Repair of migrate20's broad constraint drops on orders |
| `migrate23.js` | Data cleanup/repair pass |
| `migrate24.js` | Repair posts.comment_count drift from seed data |
| `migrate25.js` | Backfill users.full_name from profile display_name |
| `migrate26.js` | Performance indexes for messages/conversations |
| `migrate27.js` | comments.parent_id for threaded replies |
| `migrate28.js` | users.is_banned + ban_reason (moderation) |
| `migrate29.js` | app_settings key-value store (version board, feature toggles) |
| `migrate30.js` | error_events table (DevOps live error feed, fingerprint dedupe) |
| `migrate31.js` | conversation_participants junction table (replaces JSON-array-only lookup) |
| `migrate32.js` | Full-text search tsvector columns (posts/products/profiles) + indexes |
| `migrate33.js` | Scalability indexes: FK columns + high-traffic query paths |

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
| ALLOWED_TABLES allowlist | `crud.ts` validates table names |

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

This app is provider-agnostic and works with PostgreSQL providers such as Supabase and Neon.

For Supabase, use the standard Postgres connection string with SSL enabled:

```
postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres?sslmode=require
```

For Neon, the project may use a pooled endpoint if needed:

```
postgresql://user:pass@ep-xxx-pooler.neon.tech/nodbusiness?sslmode=require
```

The app already detects Neon-specific pooling and keeps the existing behavior for Neon. For Supabase, no extra pooling flag is required.

Max connections rule of thumb: keep `DB_POOL_MAX` low in production and use provider-specific connection limits; for free-tier providers, keep it to around 5–10 per app instance.
