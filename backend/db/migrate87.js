/**
 * migrate87.js — coupons.updated_at (audit F-051).
 *
 * PATCH /api/coupons/:id/toggle sets updated_at, but the coupons table
 * (migrate3.js) never had the column, so switching a coupon on or off always
 * failed with 500. Found by the first real-database test of the coupon routes.
 * Idempotent.
 */
module.exports = async function migrate87(pool) {
  await pool.query('ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  console.log('✅ migrate87: coupons.updated_at ready');
};
