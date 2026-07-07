/**
 * migrate8.js — Performance indexes
 *
 * Adds strategic indexes to support:
 * - Feed queries (posts by author, sorted by created_at)
 * - Nearby map queries (geo distance filtering)
 * - Search (full-text on posts, products, businesses)
 * - Notification polling
 * - Order lookups by buyer/seller
 * - Message lookups by conversation
 *
 * Run: node db/migrate8.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
-- ── Posts ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_author_created    ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at        ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_like_count        ON posts(like_count DESC);

-- Full-text search on posts
CREATE INDEX IF NOT EXISTS idx_posts_content_fts
  ON posts USING gin(to_tsvector('english', coalesce(content, '')));

-- ── Products ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_seller_status  ON products(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_business_id    ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_price          ON products(price);

-- Geo index for nearby product queries
CREATE INDEX IF NOT EXISTS idx_products_geo
  ON products(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text search on products
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products USING gin(
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '')
    )
  );

-- ── Businesses ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_businesses_owner        ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category     ON businesses(business_category);

-- Geo index for nearby business queries
CREATE INDEX IF NOT EXISTS idx_businesses_geo
  ON businesses(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ── Showrooms ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_showrooms_owner         ON showrooms(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_showrooms_status        ON showrooms(status, view_count DESC);

-- ── Orders ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_buyer            ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller           ON orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);

-- ── Messages ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_conversation   ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_part      ON conversations USING gin(participant_ids);

-- ── Notifications ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

-- ── Follows ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_follows_follower        ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed        ON follows(followed_id);

-- ── Likes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_likes_target            ON likes(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_likes_user              ON likes(user_id);

-- ── Comments ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_post           ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author         ON comments(author_id);

-- ── Tasks ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_requester         ON tasks(requester_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status            ON tasks(status, created_at DESC);

-- Geo index for nearby task queries
CREATE INDEX IF NOT EXISTS idx_tasks_geo
  ON tasks(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ── User profiles ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_user_id        ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name   ON user_profiles(display_name);

-- Geo index for nearby user queries
CREATE INDEX IF NOT EXISTS idx_profiles_geo
  ON user_profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_fts
  ON user_profiles USING gin(
    to_tsvector('english',
      coalesce(display_name, '') || ' ' ||
      coalesce(bio, '') || ' ' ||
      coalesce(headline, '')
    )
  );

-- ── Stories ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stories_author_expires  ON stories(user_id, expires_at);

-- ── Reviews ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_product         ON reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer        ON reviews(reviewer_id);

-- ── Return requests ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_returns_buyer_status    ON return_requests(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_returns_seller_status   ON return_requests(seller_id, status);

-- ── Delivery updates ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_delivery_order_created  ON delivery_updates(order_id, created_at DESC);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 8 — performance indexes...');
    await client.query(schema);
    console.log('✅ Migration 8 complete — all indexes created.');
  } catch (err) {
    console.error('❌ Migration 8 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
