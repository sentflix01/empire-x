/**
 * migrate34.js - Telemetry events table (DevOps observability upgrade)
 * Generic structured-event ledger: payment results, auth failures, wallet
 * movements, backup outcomes, security signals. Powers /api/devops/
 * health-summary + telemetry queries and the alert evaluator.
 */
let pool;
module.exports = async function migrate(trackPool) {
  pool = trackPool ?? require('./poolJsShim.cjs');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',   -- info | warn | error | critical
      source TEXT NOT NULL DEFAULT 'server',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_telemetry_type_time ON telemetry_events (type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_time ON telemetry_events (created_at DESC);
  `);
};
