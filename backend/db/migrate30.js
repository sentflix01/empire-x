/**
 * migrate30.js — Error Events table for DevOps live error feed
 *
 * Creates the `error_events` table that stores every unhandled error,
 * unhandled promise rejection, and manually captured error from the
 * Halehame backend. The DevOps panel polls this table in real time so
 * engineers can see and fix issues the moment they happen.
 *
 * Run: node backend/db/migrate30.js
 */
require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── error_events ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_events (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        -- Classification
        source        TEXT        NOT NULL DEFAULT 'server',
        -- 'server'    = uncaught exception / unhandled rejection
        -- 'route'     = API route handler error (caught by global handler)
        -- 'client'    = frontend error reported via /api/devops/errors/report
        -- 'manual'    = manually captured via captureError()
        level         TEXT        NOT NULL DEFAULT 'error',
        -- 'error' | 'warn' | 'info' | 'critical'

        -- Error details
        message       TEXT        NOT NULL,
        name          TEXT,                           -- Error class name (e.g. TypeError)
        stack         TEXT,                           -- Full stack trace
        code          TEXT,                           -- Error code if present (e.g. ECONNREFUSED)

        -- Request context (when available)
        method        TEXT,                           -- GET / POST / etc.
        path          TEXT,                           -- /api/orders/123
        status_code   INTEGER,                        -- HTTP response code sent
        user_id       UUID,                           -- Authenticated user if known
        request_id    TEXT,                           -- X-Request-ID header
        ip            TEXT,                           -- Hashed IP for privacy
        user_agent    TEXT,

        -- Additional metadata
        context       JSONB       DEFAULT '{}',       -- Extra key/value data
        fingerprint   TEXT,                           -- Hash for grouping duplicates
        occurrence    INTEGER     NOT NULL DEFAULT 1, -- How many times seen (for deduplication)
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Resolution tracking
        resolved      BOOLEAN     NOT NULL DEFAULT false,
        resolved_at   TIMESTAMPTZ,
        resolved_by   UUID,
        resolution_note TEXT,
        devops_item_id  UUID REFERENCES devops_items(id) ON DELETE SET NULL,
        -- ^ When converted to a bug ticket, link it here

        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Indexes for common query patterns
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_events_level      ON error_events(level)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_events_source     ON error_events(source)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_events_resolved   ON error_events(resolved)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_events_created    ON error_events(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_events_last_seen  ON error_events(last_seen_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_events_fingerprint ON error_events(fingerprint)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_error_events_path       ON error_events(path)`);

    await client.query('COMMIT');
    console.log('✅  migrate30: error_events table created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  migrate30 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
