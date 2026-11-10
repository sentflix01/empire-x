/**
 * migrate90.js — trigram indexes for product search.
 *
 * GET /api/products?search=… matches title, description or category with
 * ILIKE '%term%'. Guests skip Redis, so every search reaches Postgres. Without
 * an index a term that few or no products contain walks every public product
 * (61 ms at ~45k products; search p95 332 ms with 50 visitors locally). With
 * trigram GIN indexes on the three columns Postgres finds the matches
 * directly (0.1 ms); common terms keep using the newest-first index from
 * migrate89. pg_trgm comes from migrate71 (created here too if missing).
 *
 * CONCURRENTLY so a live table is not locked; an index left INVALID by an
 * interrupted build is dropped and built again. Idempotent.
 */
const INDEXES = [
  ['idx_products_title_trgm', 'title'],
  ['idx_products_description_trgm', 'description'],
  ['idx_products_category_trgm', 'category'],
];

module.exports = async function migrate90(pool) {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  for (const [name, column] of INDEXES) {
    const { rows } = await pool.query(
      `SELECT i.indisvalid FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
        WHERE c.relname = $1 AND c.relnamespace = current_schema()::regnamespace`,
      [name],
    );
    if (rows.length && rows[0].indisvalid === false) {
      await pool.query(`DROP INDEX CONCURRENTLY IF EXISTS ${name}`);
    }
    await pool.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name} ON products USING gin (${column} gin_trgm_ops)`);
  }
  console.log('✅ migrate90: product search trigram indexes ready');
};
