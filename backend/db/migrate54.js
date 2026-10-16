/**
 * migrate54.js - Mark accounts deleted through "Delete my account".
 * The users row is kept (orders, wallets and commissions reference it) and
 * anonymized; deleted_at records when that happened. See lib/accountData.ts.
 */
module.exports = async function migrate54(pool) {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
  `);
};
