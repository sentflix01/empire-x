/**
 * migrate60.js - Durable state for sign-in security controls.
 *
 * OTP attempt limits, login lockout and refresh-token revocation lived only in
 * Redis and stopped working whenever Redis was unavailable. They now live here
 * (lib/authSecurityStore.ts). `count` also holds the revoke-before timestamp
 * (Unix seconds) for logout-all. Every row expires; expired rows are deleted by
 * the auth-state-cleanup scheduled job.
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate60(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_security_state (
      key        TEXT PRIMARY KEY,
      count      BIGINT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_security_state_expires ON auth_security_state(expires_at);
  `);
};
