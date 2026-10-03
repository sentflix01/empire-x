/**
 * migrate21.js ? Developer Ops / Todo Board (devops_items)
 *
 * Creates the devops_items table used by the admin-only Developer Ops board:
 * bugs, features, and tasks tracked by admins/developers/owner.
 *
 * Run: node db/migrate21.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `
CREATE TABLE IF NOT EXISTS devops_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL CHECK (kind IN ('bug','feature','task')),
  title       TEXT NOT NULL,
  description TEXT,
  severity    TEXT CHECK (severity IN ('urgent','warning','attention','cross_check')),
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','in_progress','blocked','done','planned','implemented')),
  tags        TEXT[],
  assigned_to TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_devops_items_kind     ON devops_items(kind);
CREATE INDEX IF NOT EXISTS idx_devops_items_status   ON devops_items(status);
CREATE INDEX IF NOT EXISTS idx_devops_items_severity ON devops_items(severity);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 21 ? Developer Ops board (devops_items)...');
    await client.query(schema);
    console.log('? Migration 21 complete ? devops_items table + indexes created.');
  } catch (err) {
    console.error('? Migration 21 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
