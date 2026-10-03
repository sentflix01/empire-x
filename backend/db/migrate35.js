/**
 * migrate35.js - Fix verification_requests schema drift (BUG: runtime 500s)
 * routes/verification.ts inserts (supporting_docs, reason) and approves with
 * resolved_at - none of which existed since migrate13. Adds them now; keeps
 * reviewed_at for backward compatibility.
 */
let pool;
module.exports = async function migrate(trackPool) {
  pool = trackPool ?? require('./poolJsShim.cjs');
  await pool.query(`
    ALTER TABLE verification_requests
      ADD COLUMN IF NOT EXISTS supporting_docs TEXT,
      ADD COLUMN IF NOT EXISTS reason TEXT,
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests (user_id);
  `);
};
