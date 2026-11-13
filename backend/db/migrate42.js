/**
 * Migration 42 ? durable product inventory reservations for open orders.
 * Stock is decremented when an order is created; provider success commits the
 * reservation, while payment failure or pre-payment cancellation releases it.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_inventory_reservations (
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        status TEXT NOT NULL DEFAULT 'reserved'
          CHECK (status IN ('reserved','committed','released')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (order_id, product_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_inventory_reservations_status ON order_inventory_reservations(status, order_id)`);
    await client.query('COMMIT');
    console.log('Migration 42 complete ? order inventory reservations are available.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration 42 failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
