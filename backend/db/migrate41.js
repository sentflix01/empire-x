/**
 * Migration 41 ? allow the order states already used by order and return routes.
 * The older payment migrations only allowed the initial and payment states,
 * so normal fulfilment/return transitions failed the database CHECK constraint.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');
const { orderStatusCheckSql } = require('./orderStatuses');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // The full current list (db/orderStatuses.js): this re-runs on every deploy.
    await client.query(orderStatusCheckSql());
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
