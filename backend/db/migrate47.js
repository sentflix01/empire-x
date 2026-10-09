/** Auditable partner commission bases, adjustments, and manually recorded payouts. */
module.exports = async function migrate47(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS profile_eligible_subtotal NUMERIC(12,2)');
    await client.query("ALTER TABLE profile_owner_commissions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ETB'");
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_owner_commission_adjustments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        commission_id UUID NOT NULL REFERENCES profile_owner_commissions(id) ON DELETE RESTRICT,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        provider_event_id TEXT NOT NULL,
        provider_object_id TEXT NOT NULL,
        reason TEXT NOT NULL CHECK (reason IN ('refund','dispute_opened','dispute_won','dispute_lost')),
        amount_delta NUMERIC(12,2) NOT NULL,
        eligible_subtotal_delta NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (commission_id, provider_event_id, reason)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_commission_adjustments_order ON profile_owner_commission_adjustments(order_id,created_at)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_owner_payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partnership_id UUID NOT NULL REFERENCES profile_partnerships(id) ON DELETE RESTRICT,
        profile_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        business_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        currency TEXT NOT NULL DEFAULT 'ETB',
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        payment_reference TEXT,
        recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_owner_payout_items (
        payout_id UUID NOT NULL REFERENCES profile_owner_payouts(id) ON DELETE RESTRICT,
        commission_id UUID NOT NULL UNIQUE REFERENCES profile_owner_commissions(id) ON DELETE RESTRICT,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        PRIMARY KEY (payout_id, commission_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_owner_payouts_owner ON profile_owner_payouts(profile_owner_id,paid_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_owner_payouts_business ON profile_owner_payouts(business_owner_id,paid_at DESC)`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
