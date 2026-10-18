/**
 * migrate68.js - Scan to add products.
 *
 * - barcode_lookups: 30-day cache of open product database answers (Open Food
 *   Facts / Beauty / Products), "not found" included, so each barcode is
 *   asked for at most once a month (lib/productLookup.ts).
 * - An index on products.barcode for "is this one of mine?" and the shared
 *   NodBusiness catalogue lookups.
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate68(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS barcode_lookups (
      gtin       TEXT PRIMARY KEY CHECK (gtin ~ '^[0-9]{8,14}$'),
      source     TEXT NOT NULL,
      data       JSONB,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
  `);
};
