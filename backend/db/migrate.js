require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS (auth table)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,                        -- null for OAuth users
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  provider      TEXT DEFAULT 'local',        -- 'local' | 'google'
  provider_id   TEXT,                        -- Google sub ID
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code      TEXT,
  otp_expires   TIMESTAMPTZ,
  reset_token   TEXT,
  reset_expires TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name           TEXT NOT NULL,
  bio                    TEXT,
  avatar_url             TEXT,
  cover_url              TEXT,
  profile_type           TEXT NOT NULL DEFAULT 'personal' CHECK (profile_type IN ('personal','business')),
  headline               TEXT,
  location               TEXT,
  phone                  TEXT,
  is_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  follower_count         INTEGER NOT NULL DEFAULT 0,
  following_count        INTEGER NOT NULL DEFAULT 0,
  connection_count       INTEGER NOT NULL DEFAULT 0,
  has_business_profile   BOOLEAN NOT NULL DEFAULT FALSE,
  business_name          TEXT,
  business_category      TEXT,
  business_template      TEXT,
  business_description   TEXT,
  business_logo_url      TEXT,
  business_cover_url     TEXT,
  business_sections      TEXT,
  business_theme_color   TEXT DEFAULT '#D4AF37',
  business_contact_email TEXT,
  business_contact_phone TEXT,
  business_address       TEXT,
  business_hours         TEXT,
  skills                 TEXT,
  experience             TEXT,
  education              TEXT,
  ticker_text            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name   TEXT,
  author_avatar TEXT,
  content       TEXT NOT NULL,
  image_url     TEXT,
  post_type     TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text','image','product','task','event')),
  like_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name          TEXT NOT NULL,
  business_category      TEXT NOT NULL,
  business_template      TEXT,
  business_description   TEXT,
  business_logo_url      TEXT,
  business_cover_url     TEXT,
  business_sections      TEXT,
  business_theme_color   TEXT DEFAULT '#D4AF37',
  business_contact_email TEXT,
  business_contact_phone TEXT,
  business_address       TEXT,
  business_hours         TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);

-- ============================================================
-- SHOWROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS showrooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  slug        TEXT UNIQUE,
  category    TEXT NOT NULL,
  template    TEXT,
  sections    TEXT,
  cover_image TEXT,
  logo_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  view_count  INTEGER NOT NULL DEFAULT 0,
  theme_color TEXT DEFAULT '#D4AF37',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_showrooms_owner_id ON showrooms(owner_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  showroom_id UUID REFERENCES showrooms(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'ETB',
  stock       INTEGER NOT NULL DEFAULT 0,
  images      TEXT,
  category    TEXT,
  tags        TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold_out','draft')),
  view_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  product_title    TEXT NOT NULL,
  product_type     TEXT NOT NULL DEFAULT 'product',
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price       NUMERIC(12,2),
  total_price      NUMERIC(12,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'ETB',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','completed','cancelled')),
  notes            TEXT,
  buyer_name       TEXT,
  buyer_phone      TEXT,
  buyer_email      TEXT,
  delivery_address TEXT,
  stripe_session_id TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  task_type       TEXT NOT NULL DEFAULT 'other',
  title           TEXT NOT NULL,
  description     TEXT,
  location        TEXT,
  offered_payment NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'ETB',
  deadline        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_requester_id ON tasks(requester_id);

-- ============================================================
-- TASK BIDS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_bids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  bidder_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bidder_name TEXT,
  bid_amount  NUMERIC(12,2) NOT NULL,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_bids_task_id ON task_bids(task_id);
CREATE INDEX IF NOT EXISTS idx_task_bids_bidder_id ON task_bids(bidder_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids  TEXT NOT NULL,
  participant_names TEXT,
  last_message     TEXT,
  last_message_at  TIMESTAMPTZ,
  type             TEXT NOT NULL DEFAULT 'dm' CHECK (type IN ('dm','group','channel')),
  name             TEXT,
  description      TEXT,
  avatar_url       TEXT,
  admin_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name     TEXT,
  content         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','file')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, followed_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed_id ON follows(followed_id);

-- ============================================================
-- LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id   UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'post' CHECK (target_type IN ('post','product','showroom')),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_target_id ON likes(target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name   TEXT,
  author_avatar TEXT,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(schema);
    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
