/**
 * migrate16.js ? Add missing performance indexes on hot query paths
 *
 * Covers:
 *  - notifications(user_id, created_at DESC)  ? notification list query
 *  - posts(author_id, created_at DESC)         ? profile posts query
 *  - likes(target_id, user_id)                ? like check + count
 *  - comments(post_id, created_at)            ? comment thread
 *  - follows(follower_id, followed_id)        ? follow check
 *  - follows(followed_id)                     ? follower list
 *  - conversations(updated_at DESC)           ? messages list sort
 *  - messages(conversation_id, created_at)    ? already exists, ensure
 *
 * Run: node db/migrate16.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `
-- Notifications: list by user sorted by newest first
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- Posts: profile page lists posts by author
CREATE INDEX IF NOT EXISTS idx_posts_author_created
  ON posts(author_id, created_at DESC);

-- Posts: trending sort
CREATE INDEX IF NOT EXISTS idx_posts_like_count
  ON posts(like_count DESC);

-- Likes: check if user liked a post (used on every like toggle)
CREATE INDEX IF NOT EXISTS idx_likes_target_user
  ON likes(target_id, user_id);

-- Comments: thread for a post
CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON comments(post_id, created_at ASC);

-- Follows: check if A follows B + list who A follows
CREATE INDEX IF NOT EXISTS idx_follows_follower_followed
  ON follows(follower_id, followed_id);

-- Follows: list followers of B
CREATE INDEX IF NOT EXISTS idx_follows_followed
  ON follows(followed_id);

-- Conversations: messages list sorted by most recent
CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON conversations(updated_at DESC);

-- Users: last_seen for presence (safe if column doesn't exist yet)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='last_seen'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC)';
  END IF;
END $$;
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('Running migration 16 ? performance indexes...');
    await client.query(schema);
    console.log('? Migration 16 complete.');
  } catch (err) {
    console.error('? Migration 16 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
