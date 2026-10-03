require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `

-- ============================================================
-- HASHTAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS hashtags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);

-- ============================================================
-- POLLS
-- ============================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_options TEXT; -- JSON array of {id, text, vote_count}
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS poll_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON poll_votes(post_id);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL,
  min_order      NUMERIC(12,2) DEFAULT 0,
  usage_limit    INTEGER,
  usage_count    INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id, code)
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ============================================================
-- TELEGRAM BOT
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_notifications BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- LOCATION (for Maps)
-- ============================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

ALTER TABLE products ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE products ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- ============================================================
-- COMMISSION
-- ============================================================
CREATE TABLE IF NOT EXISTS commissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gross       NUMERIC(12,2) NOT NULL,
  rate        NUMERIC(5,4) NOT NULL DEFAULT 0.03,
  amount      NUMERIC(12,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','collected','refunded')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commissions_order_id ON commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_seller_id ON commissions(seller_id);

`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 3...');
    await client.query(schema);
    console.log('? Migration 3 complete.');
  } catch (err) {
    console.error('? Migration 3 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
