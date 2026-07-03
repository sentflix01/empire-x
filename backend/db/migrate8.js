require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
-- ── Migration 8: Location columns for search distance ───────────────────────
-- Add lat/lon to showrooms (missing from migrate3 which added them to other tables)
ALTER TABLE showrooms ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE showrooms ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- Add lat/lon to events and jobs for distance-aware search
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);

-- GIN index for faster full-text search on showrooms title/description
CREATE INDEX IF NOT EXISTS idx_showrooms_search
  ON showrooms USING gin(to_tsvector('english', title || ' ' || COALESCE(description,'')));

-- GIN index on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_search
  ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description,'') || ' ' || COALESCE(location,'')));
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 8 (search location columns)...');
    await client.query(schema);
    console.log('✅ Migration 8 complete.');
  } catch (err) {
    console.error('❌ Migration 8 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
