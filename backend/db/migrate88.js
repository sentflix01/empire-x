/**
 * migrate88.js — index saves by target.
 *
 * Business Analytics counts how many people saved each of a seller's products
 * (GET /api/saves/my-products). saves was only indexed by user, so that would
 * scan the whole table. Idempotent.
 */
module.exports = async function migrate88(pool) {
  await pool.query('CREATE INDEX IF NOT EXISTS idx_saves_target ON saves (target_type, target_id)');
  console.log('✅ migrate88: saves (target_type, target_id) index ready');
};
