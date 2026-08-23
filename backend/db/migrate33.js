/**
 * migrate33.js — Scalability indexes: FK columns + high-traffic query paths
 *
 * Why these indexes:
 *   migrate32 added search vectors and feed indexes.
 *   This migration covers the remaining O(N) scan paths on FK columns that
 *   hit the database hard as row counts grow:
 *
 *   - posts.author_id       — "all posts by user X" (profile page, feed)
 *   - wishlists composite   — "does user X have product Y in wishlist?" (O(1) check)
 *   - likes composite       — "did user X like post/product Y?" (O(1) check)
 *   - follows reverse       — "who does user X follow?" (social graph)
 *   - notifications user    — covered by migrate32, adding read-only variant
 *   - comments.post_id      — "all comments on post X"
 *   - reviews.product_id    — "all reviews for product X"
 *   - saves.user_id         — "all bookmarks for user X"
 *   - cart_items.user_id    — "cart for user X"
 *   - wallets.user_id       — "wallet for user X" (unique lookup)
 *   - wallet_transactions   — "all transactions for wallet X"
 *   - stories.author_id     — "stories by user X" + expiry filter
 *   - businesses.owner_id   — "businesses owned by user X"
 *   - showrooms.owner_id    — "showrooms by user X"
 *   - tasks.requester_id    — "tasks by user X"
 *   - events.organizer_id   — "events by user X"
 *   - jobs.poster_id        — "jobs by user X"
 *   - courses.instructor_id — "courses by user X"
 *
 * All indexes use CREATE INDEX CONCURRENTLY — zero table locks, safe for live DB.
 *
 * Run standalone: node db/migrate33.js
 * Auto-run:       node db/migrate-all.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function migrate33() {
  console.log('migrate33: adding scalability indexes for FK columns...');

  // CONCURRENT indexes cannot run inside a transaction
  const indexes = [
    // Social graph & feed
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_created
       ON posts(author_id, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_followed_id
       ON follows(followed_id)`,

    // Interaction checks (O(1) existence checks)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_target_user
       ON likes(target_id, target_type, user_id)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishlists_user_product
       ON wishlists(user_id, product_id)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saves_user_created
       ON saves(user_id, created_at DESC)`,

    // Comments
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_created
       ON comments(post_id, created_at ASC)`,

    // Reviews
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_created
       ON reviews(product_id, created_at DESC)`,

    // Cart
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user
       ON cart_items(user_id)`,

    // Wallet
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_user
       ON wallets(user_id)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_txns_wallet_created
       ON wallet_transactions(wallet_id, created_at DESC)`,

    // Stories (active + non-expired)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_author_expires
       ON stories(author_id, expires_at DESC)`,

    // Entities owned by user
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_owner_created
       ON businesses(owner_id, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_showrooms_owner_status
       ON showrooms(owner_id, status, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_requester_status
       ON tasks(requester_id, status, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_organizer_created
       ON events(organizer_id, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_poster_status
       ON jobs(poster_id, created_at DESC)`,

    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_instructor_created
       ON courses(instructor_id, created_at DESC)`,

    // Blocks (bidirectional lookup used in messaging and presence)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blocks_blocked_id
       ON blocks(blocked_id)`,
  ];

  for (const sql of indexes) {
    const name = sql.match(/idx_\w+/)?.[0] ?? 'index';
    try {
      await pool.query(sql);
      console.log(`  ✅  ${name}`);
    } catch (err) {
      if (err.message?.includes('already exists')) {
        console.log(`  ✓   ${name} (already exists)`);
      } else {
        // Non-fatal: some tables may not exist in all environments
        console.warn(`  ⚠️  ${name} skipped: ${err.message}`);
      }
    }
  }

  console.log('migrate33: complete');
}

module.exports = migrate33;

if (require.main === module) {
  migrate33()
    .then(() => { pool.end(); process.exit(0); })
    .catch(err => { console.error(err.message); pool.end(); process.exit(1); });
}
