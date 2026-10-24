/**
 * migrate79.js - Take automated-test listings off the marketplace (audit DATA-03).
 *
 * An E2E run against the hosted database in October 2026 left 17 active
 * listings on production: "E2E Test Product <timestamp>" and "Manual E2E Cod
 * Product". The E2E suite now refuses non-local databases; this archives the
 * rows that were already written.
 *
 * Archives (does not delete) only active products whose title matches exactly
 * those test names, so orders and history stay intact. Idempotent. To undo,
 * set status back to 'active' for the same titles.
 */
module.exports = async function migrate79(pool) {
  const { rowCount } = await pool.query(`
    UPDATE products
       SET status = 'archived', updated_at = NOW()
     WHERE status = 'active'
       AND (title ~ '^E2E Test Product [0-9]+$' OR title = 'Manual E2E Cod Product')
  `);
  console.log(`migrate79: archived ${rowCount} automated-test listing(s)`);
};
