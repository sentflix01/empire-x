/**
 * db/orderStatuses.js — the one list of allowed orders.status values.
 *
 * Every migration re-runs on each deploy (migrate-all has no ledger). Any
 * migration that rebuilds orders_status_check must accept every status the
 * app writes today, or a deploy fails once a row uses a newer status. So all
 * of them build the constraint from this list; add new statuses here only.
 * test/integration/orderStatusMigrations.test.js enforces this.
 */
const ORDER_STATUSES = Object.freeze([
  'pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'completed',
  'cancelled', 'disputed', 'payment_failed', 'refunded', 'return_requested', 'return_approved',
  // Direct payment (migrate57): buyer pays the seller, reports it, seller confirms.
  'awaiting_payment', 'payment_reported', 'expired',
  // Request to order (migrate64): a website item without a catalogue product; the seller sets the price.
  'requested',
]);

/** SQL that replaces orders_status_check with the full current list. */
function orderStatusCheckSql() {
  return `ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (${ORDER_STATUSES.map((s) => `'${s}'`).join(',')}));`;
}

module.exports = { ORDER_STATUSES, orderStatusCheckSql };
