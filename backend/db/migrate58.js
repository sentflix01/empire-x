/**
 * migrate58.js - Public or private business sites.
 *
 * The owner chooses who can view the business: 'public' (anyone, including
 * guests from a QR code or link, and search engines) or 'private' (signed-in
 * users only; hidden from guests, guest feeds, the sitemap and search engines).
 * Existing businesses stay public. See
 * docs/decisions/platform-model-decisions.md §2 and §7.
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate58(pool) {
  await pool.query(`
    ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'businesses_visibility_check'
      ) THEN
        ALTER TABLE businesses
          ADD CONSTRAINT businesses_visibility_check CHECK (visibility IN ('public', 'private'));
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_businesses_private ON businesses(id) WHERE visibility = 'private';
  `);
};
