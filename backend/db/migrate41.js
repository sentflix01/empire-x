/**
 * Migration 41 ? allow the order states already used by order and return routes.
 * The older payment migrations only allowed the initial and payment states,
 * so normal fulfilment/return transitions failed the database CHECK constraint.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
    await client.query(`
      ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN (
        'pending','paid','confirmed','processing','shipped','delivered','completed',
        'cancelled','disputed','payment_failed','refunded','return_requested','return_approved',
        -- Direct-payment states (migrate57). Listed here too because every
        -- migration re-runs on deploy and must accept rows already using them.
        'awaiting_payment','payment_reported','expired'
      ))
    `);
    await client.query('COMMIT');
    console.log('Migration 41 complete ? fulfilment and return order statuses are allowed.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration 41 failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
