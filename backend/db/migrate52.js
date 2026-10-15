/**
 * One platform commission per order.
 *
 * collectCommission ran on payment and again on completion, and the commissions
 * table had no unique key, so online orders could hold two rows (and two
 * wallet debits). Duplicate rows are copied to commissions_duplicates_archive
 * for reconciliation, then removed — the earliest row per order is kept — and a
 * unique index on order_id makes `ON CONFLICT (order_id)` the idempotency claim.
 * Safe to re-run.
 */
module.exports = async function migrate52(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Block concurrent commission inserts while duplicates are cleaned up.
    await client.query('LOCK TABLE commissions IN SHARE ROW EXCLUSIVE MODE');
    await client.query(`
      CREATE TABLE IF NOT EXISTS commissions_duplicates_archive (
        LIKE commissions INCLUDING DEFAULTS,
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at, id) AS rn
        FROM commissions
      ),
      removed AS (
        DELETE FROM commissions c
        USING ranked r
        WHERE c.id = r.id AND r.rn > 1
        RETURNING c.*
      )
      INSERT INTO commissions_duplicates_archive (id, order_id, seller_id, gross, rate, amount, status, created_at)
      SELECT id, order_id, seller_id, gross, rate, amount, status, created_at FROM removed
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS commissions_order_id_unique
        ON commissions(order_id)
    `);
    await client.query('DROP INDEX IF EXISTS idx_commissions_order_id');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
