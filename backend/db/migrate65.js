/**
 * migrate65.js - Keep the provider's checkout page for an unfinished payment.
 *
 * An owner who leaves Chapa's page before paying can come back to the same
 * checkout ("Continue payment") instead of starting over. Only returned to
 * the owner, and only while the payment is still pending.
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate65(pool) {
  await pool.query('ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS checkout_url TEXT');
};
