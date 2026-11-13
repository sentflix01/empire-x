/**
 * migrate89.js — business reviews from verified customers.
 *
 * Decision 2026-11-12 "Business reviews: verified customers only": a signed-in
 * buyer with a completed order from a business may rate it 1–5 stars, once
 * (they can edit). Businesses keep the average and count for fast display.
 * Reviews can be reported and hidden by moderators.
 *
 * Idempotent: every step checks before it changes anything.
 */
module.exports = async function migrate89(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_reviews (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
        rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment     TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
        status      TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (business_id, reviewer_id)
      )`);
    await client.query('CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON business_reviews (business_id, created_at DESC) WHERE status = \'visible\'');
    await client.query('CREATE INDEX IF NOT EXISTS idx_business_reviews_reviewer ON business_reviews (reviewer_id)');
    await client.query('ALTER TABLE businesses ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) NOT NULL DEFAULT 0');
    await client.query('ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0');

    // Reports may now point at a business review.
    const { rows } = await client.query(
      "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'reports'::regclass AND conname = 'reports_target_type_check'",
    );
    if (!rows[0] || !rows[0].def.includes('business_review')) {
      await client.query('ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_target_type_check');
      await client.query("ALTER TABLE reports ADD CONSTRAINT reports_target_type_check CHECK (target_type IN ('user','post','product','comment','message','business_review'))");
    }
    await client.query('COMMIT');
    console.log('✅ migrate89: business_reviews, businesses.average_rating/review_count, reportable reviews');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
