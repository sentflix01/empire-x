let pool;
module.exports = async function migrate(trackPool) {
  pool = trackPool ?? require('./poolJsShim.cjs');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_id TEXT,
      actor_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      amount NUMERIC(12,2),
      currency TEXT DEFAULT 'ETB',
      balance_before NUMERIC(12,2),
      balance_after NUMERIC(12,2),
      metadata JSONB DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
  `);
};
