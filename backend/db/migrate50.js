/** Idempotent email ledger for the three-day unpaid website-draft lifecycle. */
module.exports = async function migrate50(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS showroom_draft_notices (
      showroom_id UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
      notice_key TEXT NOT NULL CHECK (notice_key IN ('draft_24h', 'draft_48h', 'draft_72h')),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (showroom_id, notice_key)
    )
  `);
};
