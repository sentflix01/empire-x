/** Business subscription lifecycle, showroom ownership, and expiry notices. */
module.exports = async function migrate49(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE business_subscriptions
        DROP CONSTRAINT IF EXISTS business_subscriptions_tier_check
    `);
    await client.query(`
      ALTER TABLE business_subscriptions
        ADD CONSTRAINT business_subscriptions_tier_check
        CHECK (tier IN ('freemium','normal','premium','pro'))
    `);

    await client.query(`
      ALTER TABLE showrooms
        ADD COLUMN IF NOT EXISTS business_id UUID
        REFERENCES businesses(id) ON DELETE CASCADE
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_showrooms_business_id ON showrooms(business_id) WHERE business_id IS NOT NULL`);

    // Backfill only unambiguous ownership links. Owners with several business
    // records must choose the correct business explicitly before publishing.
    await client.query(`
      UPDATE showrooms s SET business_id = b.id
      FROM businesses b
      WHERE s.business_id IS NULL
        AND s.owner_id = b.owner_id
        AND (SELECT COUNT(*) FROM businesses owned WHERE owned.owner_id = s.owner_id) = 1
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_subscription_notices (
        business_id UUID NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        notice_key TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (business_id, period_end, notice_key)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_creation_blocks (
        owner_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        blocked_until TIMESTAMPTZ NOT NULL,
        reason TEXT NOT NULL DEFAULT 'subscription_expired',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
