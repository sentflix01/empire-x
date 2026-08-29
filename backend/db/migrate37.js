/**
 * migrate37.js — Business Subscription Tiers
 *
 * Creates 4 tables required by the business-subscription-tiers feature:
 *
 *   business_subscriptions  — one row per business; tracks Stripe subscription
 *                             state and current tier (freemium / premium / pro)
 *   live_locations          — upsert model; stores the latest GPS position
 *                             broadcast by Enterprise ride/delivery businesses
 *   business_webhooks       — outbound webhook endpoints registered by Premium+
 *                             business owners (HMAC-signed event delivery)
 *   business_api_keys       — API keys for programmatic access; plaintext key is
 *                             never stored — only the SHA-256 hash
 *
 * Run standalone:  node db/migrate37.js
 * Auto-run:        node db/migrate-all.js  (exports async function)
 */

let pool;

module.exports = async function migrate37(trackPool) {
  pool = trackPool ?? require('./pool');

  // ── 1. business_subscriptions ─────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_subscriptions (
      id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id             UUID        NOT NULL
                              REFERENCES businesses(id) ON DELETE CASCADE,
      tier                    TEXT        NOT NULL DEFAULT 'freemium'
                              CHECK (tier IN ('freemium', 'premium', 'pro')),
      status                  TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
      stripe_customer_id      TEXT,
      stripe_subscription_id  TEXT,
      stripe_price_id         TEXT,
      current_period_start    TIMESTAMPTZ,
      current_period_end      TIMESTAMPTZ,
      cancel_at_period_end    BOOLEAN     NOT NULL DEFAULT FALSE,
      product_count           INTEGER     NOT NULL DEFAULT 0,
      storage_used_bytes      BIGINT      NOT NULL DEFAULT 0,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_business_subscription UNIQUE (business_id)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bsub_business   ON business_subscriptions (business_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bsub_stripe_sub ON business_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`);

  console.log('  ✅  business_subscriptions');

  // ── 2. live_locations ─────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_locations (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID        NOT NULL
                   REFERENCES businesses(id) ON DELETE CASCADE,
      user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
      lat          NUMERIC(10, 7) NOT NULL,
      lng          NUMERIC(10, 7) NOT NULL,
      label        TEXT,
      accuracy_m   NUMERIC(8, 2),
      heading      NUMERIC(5, 2),
      speed_kmh    NUMERIC(6, 2),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_live_location_business UNIQUE (business_id)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_live_locations_business ON live_locations (business_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_live_locations_updated  ON live_locations (updated_at DESC)`);

  console.log('  ✅  live_locations');

  // ── 3. business_webhooks ──────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_webhooks (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID        NOT NULL
                   REFERENCES businesses(id) ON DELETE CASCADE,
      url          TEXT        NOT NULL,
      secret       TEXT        NOT NULL,
      events       TEXT[]      NOT NULL DEFAULT '{}',
      is_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
      last_success_at  TIMESTAMPTZ,
      last_failure_at  TIMESTAMPTZ,
      failure_count    INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bwebhooks_business   ON business_webhooks (business_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bwebhooks_enabled    ON business_webhooks (business_id, is_enabled)`);

  console.log('  ✅  business_webhooks');

  // ── 4. business_api_keys ──────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_api_keys (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id  UUID        NOT NULL
                   REFERENCES businesses(id) ON DELETE CASCADE,
      name         TEXT        NOT NULL,
      key_hash     TEXT        NOT NULL UNIQUE,
      key_prefix   TEXT        NOT NULL,
      scope        TEXT        NOT NULL DEFAULT 'read'
                   CHECK (scope IN ('read', 'read_write')),
      expires_at   TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bapi_keys_business ON business_api_keys (business_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bapi_keys_hash     ON business_api_keys (key_hash)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bapi_keys_active   ON business_api_keys (business_id, is_active)`);

  console.log('  ✅  business_api_keys');

  console.log('migrate37: complete — 4 subscription-tier tables created');
};

// Allow standalone run
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  const pool = require('./pool');
  module.exports(pool)
    .then(() => { pool.end(); process.exit(0); })
    .catch(err => { console.error(err.message); pool.end(); process.exit(1); });
}
