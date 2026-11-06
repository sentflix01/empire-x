/**
 * migrate86.js — two-factor sign-in (audit F-017).
 *
 * user_mfa holds one row per person who has started or finished setting up an
 * authenticator app:
 *   - totp_secret_enc: AES-256-GCM encrypted secret (lib/mfa.ts); never plain text
 *   - enabled_at: set once the first code is confirmed; NULL while pending
 *   - last_used_step: the last accepted 30-second step, so a code cannot be reused
 *   - recovery_codes: HMAC hashes of one-time recovery codes, with used_at
 *
 * Idempotent (IF NOT EXISTS). Deleting the user deletes the row.
 */
module.exports = async function migrate86(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_mfa (
      user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      totp_secret_enc  TEXT NOT NULL,
      enabled_at       TIMESTAMPTZ,
      last_used_step   BIGINT,
      recovery_codes   JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ migrate86: user_mfa ready');
};
