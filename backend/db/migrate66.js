/**
 * migrate66.js - Email sign-ups from a website's Newsletter section.
 *
 * Visitors leave an email in a published site's Newsletter section; only the
 * site's owner can read the list. One row per site and address (case-
 * insensitive), so signing up twice changes nothing. Rows go with the site.
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate66(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS showroom_newsletter_signups (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      showroom_id UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
      email       TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_showroom_newsletter_email
      ON showroom_newsletter_signups (showroom_id, lower(email));
    CREATE INDEX IF NOT EXISTS idx_showroom_newsletter_recent
      ON showroom_newsletter_signups (showroom_id, created_at DESC);
  `);
};
