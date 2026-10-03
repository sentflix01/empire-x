require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `

-- ============================================================
-- PRODUCT VARIANTS (size, color, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,        -- e.g. "Size" or "Color"
  value      TEXT NOT NULL,        -- e.g. "XL" or "Red"
  price      NUMERIC(12,2),        -- override product price if set
  stock      INTEGER NOT NULL DEFAULT 0,
  sku        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);

-- ============================================================
-- RETURN REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS return_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  details     TEXT,
  images      TEXT,               -- JSON array of image URLs
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected','refunded')),
  refund_amount NUMERIC(12,2),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_buyer_id ON return_requests(buyer_id);

-- ============================================================
-- DELIVERY UPDATES (tracking timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_updates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,        -- e.g. "Packed", "Picked Up", "On the way", "Delivered"
  note       TEXT,
  location   TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_order_id ON delivery_updates(order_id);

-- ============================================================
-- PRICE DROP ALERTS (wishlist extension)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price NUMERIC(12,2) NOT NULL,
  is_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON price_alerts(product_id);

-- ============================================================
-- CART: add variant support
-- ============================================================
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 5...');
    await client.query(schema);
    console.log('? Migration 5 complete.');
  } catch (err) {
    console.error('? Migration 5 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
