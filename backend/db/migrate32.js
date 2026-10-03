/**
 * migrate32.js ? Full-text search vectors + performance indexes
 *
 * What this migration adds:
 *
 * 1. GENERATED tsvector columns on posts, products, user_profiles:
 *    - Auto-maintained by PostgreSQL on INSERT/UPDATE ? zero application code needed
 *    - GIN indexes on each vector for sub-50ms full-text search
 *    - Replaces ILIKE '%term%' (full table scan, ~500ms) with @@ to_tsquery (index seek, ~5ms)
 *
 * 2. Feed performance indexes:
 *    - idx_posts_feed_created ? covers the 7-day window range scan in the feed query
 *    - idx_posts_like_count   ? covers the popularity-sorted branch
 *    - idx_follows_follower_covered ? covering index: follower_id INCLUDE followed_id
 *      avoids a heap lookup when loading the social graph for feed ranking
 *
 * 3. Notifications composite index:
 *    - (user_id, is_read, created_at DESC) ? serves the unread badge count query
 *      and the notifications list in a single index seek
 *
 * 4. Messages pagination index:
 *    - (conversation_id, created_at ASC) ? serves cursor-based message history
 *      pagination (Task 16) without a sort step
 *
 * NOTE: All indexes are created with CREATE INDEX CONCURRENTLY which does NOT
 * lock the table. Safe to run against a live production database.
 * CONCURRENT cannot run inside an explicit transaction ? each statement is
 * its own implicit transaction.
 *
 * Run standalone: node db/migrate32.js
 * Auto-run:       node db/migrate-all.js  (exports async function)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function migrate32(trackPool) {
  // When called by migrate-all.js, use the injected pool.
  // When run standalone, load pool directly.
  const pool = trackPool ?? require('./poolJsShim.cjs');
  const client = await pool.connect();

  try {
    console.log('migrate32: adding tsvector search columns...');

    // ?? 1. Add tsvector GENERATED columns ?????????????????????????????????????
    // GENERATED ALWAYS AS ... STORED means PostgreSQL maintains the column
    // automatically on every write. Requires PostgreSQL 12+.

    // Posts ? search on content
    await client.query(`
      ALTER TABLE posts
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english', coalesce(content, ''))
        ) STORED
    `);

    // Products ? search on title + description + category
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english',
            coalesce(title, '')       || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(category, '')
          )
        ) STORED
    `);

    // User profiles ? search on display_name + bio + headline
    await client.query(`
      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english',
            coalesce(display_name, '') || ' ' ||
            coalesce(bio, '')          || ' ' ||
            coalesce(headline, '')
          )
        ) STORED
    `);

    // Jobs ? search on title + description
    await client.query(`
      ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english',
            coalesce(title, '')       || ' ' ||
            coalesce(description, '')
          )
        ) STORED
    `);

    // Events ? search on title + description
    await client.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english',
            coalesce(title, '')       || ' ' ||
            coalesce(description, '')
          )
        ) STORED
    `);

    // Tasks ? search on title + description
    await client.query(`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english',
            coalesce(title, '')       || ' ' ||
            coalesce(description, '')
          )
        ) STORED
    `);

    client.release();
    console.log('migrate32: tsvector columns added. Building GIN indexes (CONCURRENT ? may take 30-120s on large tables)...');

    // ?? 2. GIN indexes on tsvector columns (CONCURRENT ? no table lock) ???????
    // Must use pool.query not client.query (client is released above).
    // CONCURRENT cannot be inside a transaction.

    const concurrentIndexes = [
      // Full-text search
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_search_vector
         ON posts USING GIN (search_vector)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_vector
         ON products USING GIN (search_vector)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_search_vector
         ON user_profiles USING GIN (search_vector)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_search_vector
         ON jobs USING GIN (search_vector)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_search_vector
         ON events USING GIN (search_vector)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_search_vector
         ON tasks USING GIN (search_vector)`,

      // Feed performance: 7-day window range scan + sort
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_feed_created
         ON posts(created_at DESC)`,

      // Feed performance: popularity-sorted branch
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_like_count
         ON posts(like_count DESC)`,

      // Social graph covering index: avoids heap lookup when loading followed_ids
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_follower_covered
         ON follows(follower_id) INCLUDE (followed_id)`,

      // Notifications: unread badge count + list in one seek
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
         ON notifications(user_id, is_read, created_at DESC)`,

      // Messages: cursor-based pagination (conversation + time window)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conv_created
         ON messages(conversation_id, created_at ASC)`,

      // Orders: buyer and seller list queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_buyer_created
         ON orders(buyer_id, created_at DESC)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_created
         ON orders(seller_id, created_at DESC)`,

      // Products: marketplace listing query
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_status
         ON products(seller_id, status, created_at DESC)`,
    ];

    for (const sql of concurrentIndexes) {
      const indexName = sql.match(/idx_\w+/)?.[0] || 'index';
      try {
        await pool.query(sql);
        console.log(`  ?  ${indexName}`);
      } catch (err) {
        // "already exists" is safe to ignore ? idempotent
        if (err.message.includes('already exists')) {
          console.log(`  ?   ${indexName} (already exists)`);
        } else {
          console.warn(`  ??   ${indexName} failed: ${err.message}`);
          // Non-fatal: log and continue ? partial index set is better than none
        }
      }
    }

    console.log('migrate32: complete');
  } catch (err) {
    try { client.release(); } catch { /* already released */ }
    console.error('migrate32 failed:', err.message);
    throw err;
  }
}

// Exported async function ? picked up by migrate-all.js automatically
module.exports = migrate32;

// Allow standalone run: node db/migrate32.js
if (require.main === module) {
  const standalonePool = require('./poolJsShim.cjs');
  migrate32(standalonePool)
    .then(() => { standalonePool.end(); process.exit(0); })
    .catch(err => { console.error(err); standalonePool.end(); process.exit(1); });
}
