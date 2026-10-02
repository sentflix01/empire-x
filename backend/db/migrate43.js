/**
 * Migration 43 — columns used by the product inventory and bulk import routes.
 * The importer previously referenced these fields without any migration, so a
 * clean install could not import even one valid inventory row.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS sku TEXT,
        ADD COLUMN IF NOT EXISTS barcode TEXT,
        ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'pcs',
        ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 10,
        ADD COLUMN IF NOT EXISTS max_stock INTEGER,
        ADD COLUMN IF NOT EXISTS expiry_date DATE,
        ADD COLUMN IF NOT EXISTS batch_number TEXT,
        ADD COLUMN IF NOT EXISTS manufacturer TEXT,
        ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,3),
        ADD COLUMN IF NOT EXISTS dimensions_cm JSONB,
        ADD COLUMN IF NOT EXISTS is_prescription BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS controlled_substance BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS storage_condition TEXT,
        ADD COLUMN IF NOT EXISTS variant_of UUID REFERENCES products(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS bundle_components JSONB,
        ADD COLUMN IF NOT EXISTS attributes JSONB,
        ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0
    `);
    await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check');
    await client.query(`
      ALTER TABLE products ADD CONSTRAINT products_status_check
        CHECK (status IN ('active','sold_out','draft','archived')) NOT VALID
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE products ADD CONSTRAINT products_inventory_values_check
          CHECK (cost_price IS NULL OR cost_price >= 0)
          NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE products ADD CONSTRAINT products_inventory_ranges_check
          CHECK (stock >= 0 AND min_stock >= 0 AND (max_stock IS NULL OR max_stock >= min_stock)
            AND (weight_kg IS NULL OR weight_kg >= 0) AND tax_rate BETWEEN 0 AND 100)
          NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(seller_id,sku) WHERE sku IS NOT NULL');
    await client.query('COMMIT');
    console.log('Migration 43 complete — product inventory columns are available.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration 43 failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
