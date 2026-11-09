/**
 * migrate89.js — indexes for the public product list and trending order.
 *
 * GET /api/products (newest first) and GET /api/trending (most viewed) read
 * public products (status active or sold out) in one order and stop after
 * 24 or 8 rows. Neither order had an index, so every request scanned and
 * sorted all public products (on disk at ~45k rows: 44 ms per query, p95
 * above 1 s with 50 visitors; guests bypass Redis, so every guest hit it).
 * With these partial indexes the same queries read only the rows they return
 * (~0.2 ms). The (…, id) column matches the keyset cursor tie-breaker.
 *
 * CONCURRENTLY so a live table is not locked; it cannot run in a transaction,
 * so each statement runs on its own. An index left INVALID by an interrupted
 * build is dropped and built again. Idempotent.
 */
const INDEXES = [
  ['idx_products_public_created',
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_public_created
       ON products (created_at DESC, id DESC) WHERE status IN ('active', 'sold_out')`],
  ['idx_products_public_views',
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_public_views
       ON products (view_count DESC, id DESC) WHERE status IN ('active', 'sold_out')`],
];

module.exports = async function migrate89(pool) {
  for (const [name, sql] of INDEXES) {
    const { rows } = await pool.query(
      `SELECT i.indisvalid FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
        WHERE c.relname = $1 AND c.relnamespace = current_schema()::regnamespace`,
      [name],
    );
    if (rows.length && rows[0].indisvalid === false) {
      await pool.query(`DROP INDEX CONCURRENTLY IF EXISTS ${name}`);
    }
    await pool.query(sql);
  }
  console.log('✅ migrate89: public product list and trending indexes ready');
};
