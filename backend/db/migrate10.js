/**
 * migrate10.js — External API Integration tables
 *
 * Creates three new tables to support the Showroom External API Integration:
 *   - external_data_sources  : stores external REST endpoint configs per showroom section
 *   - field_mappings         : dot-notation path mappings from external fields to schema fields
 *   - external_health_records: audit log of every proxy fetch attempt (success and failure)
 *
 * Credentials are stored encrypted (AES-256-GCM) in the `credential` JSONB column.
 * The plaintext credential is NEVER stored and is NEVER returned to the frontend.
 *
 * Run: node db/migrate10.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
-- ── External Data Sources ────────────────────────────────────────────────────
-- One row per showroom section that is connected to an external REST API.
-- Credentials are stored as { iv, authTag, ciphertext } (AES-256-GCM hex strings).
CREATE TABLE IF NOT EXISTS external_data_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id   UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  section_key   TEXT NOT NULL,
  url           TEXT NOT NULL,
  auth_method   TEXT NOT NULL DEFAULT 'none'
                CHECK (auth_method IN ('none','bearer_token','api_key_header','api_key_query')),
  credential    JSONB,
  header_name   TEXT,
  query_param   TEXT,
  ttl_seconds   INTEGER NOT NULL DEFAULT 300
                CHECK (ttl_seconds >= 1),
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (showroom_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_ext_sources_showroom ON external_data_sources(showroom_id);

-- ── Field Mappings ────────────────────────────────────────────────────────────
-- Maps a dot-notation source path in the external API response to a target
-- schema field name. One mapping per target_field per source (enforced by UNIQUE).
CREATE TABLE IF NOT EXISTS field_mappings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      UUID NOT NULL REFERENCES external_data_sources(id) ON DELETE CASCADE,
  source_path    TEXT NOT NULL,
  target_field   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, target_field)
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_source ON field_mappings(source_id);

-- ── External Health Records ───────────────────────────────────────────────────
-- Audit log written after every proxy fetch attempt (success or failure).
-- source_id uses SET NULL on delete so history is preserved even when the
-- source is removed.
CREATE TABLE IF NOT EXISTS external_health_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id  UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  section_key  TEXT NOT NULL,
  source_id    UUID REFERENCES external_data_sources(id) ON DELETE SET NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  http_status  INTEGER,
  success      BOOLEAN NOT NULL,
  error_msg    TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_showroom_section
  ON external_health_records(showroom_id, section_key, fetched_at DESC);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 10 — External API Integration tables...');
    await client.query(schema);
    console.log('✅ Migration 10 complete — external_data_sources, field_mappings, external_health_records tables created.');
  } catch (err) {
    console.error('❌ Migration 10 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
