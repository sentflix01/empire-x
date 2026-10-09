/** Profile-owner business partnerships and commission ledger. */
module.exports = async function migrate45(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_partnerships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        business_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        commission_rate NUMERIC(5,4) NOT NULL CHECK (commission_rate > 0 AND commission_rate <= 0.5),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','declined','terminated')),
        share_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 16),
        starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ends_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (business_owner_id <> profile_owner_id),
        CHECK (ends_at > starts_at)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_partnerships_owner_status ON profile_partnerships(profile_owner_id,status,ends_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_partnerships_business_status ON profile_partnerships(business_owner_id,status,ends_at)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_partnership_products (
        partnership_id UUID NOT NULL REFERENCES profile_partnerships(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        PRIMARY KEY (partnership_id, product_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_partnership_products_product ON profile_partnership_products(product_id)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_owner_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partnership_id UUID NOT NULL REFERENCES profile_partnerships(id) ON DELETE RESTRICT,
        order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        profile_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        business_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        eligible_gross NUMERIC(12,2) NOT NULL CHECK (eligible_gross >= 0),
        rate NUMERIC(5,4) NOT NULL CHECK (rate > 0 AND rate <= 0.5),
        amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
        currency TEXT NOT NULL DEFAULT 'ETB',
        status TEXT NOT NULL DEFAULT 'earned' CHECK (status IN ('earned','paid','reversed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profile_owner_commissions_owner ON profile_owner_commissions(profile_owner_id,status,created_at DESC)`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS profile_partnership_id UUID REFERENCES profile_partnerships(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS profile_owner_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS profile_commission_rate NUMERIC(5,4)`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS profile_eligible_subtotal NUMERIC(12,2)`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
