/**
 * Migration 26 — Performance indexes for messages and conversations.
 *
 * The messages table is queried heavily on conversation_id (chat room load)
 * and the conversations table is queried on participant_ids (JSONB containment).
 * These indexes were missing and caused sequential scans on every chat open.
 *
 * Also adds an index on notifications(user_id, created_at) to speed up the
 * unread-first notification feed query.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

const schema = `
-- ── Messages ──────────────────────────────────────────────────────────────────
-- Main access pattern: load all messages in a conversation ordered by time
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON messages(conversation_id, created_at ASC);

-- ── Conversations ─────────────────────────────────────────────────────────────
-- JSONB containment: participant_ids::jsonb @> $1::jsonb (used in list & find-or-create)
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids
  ON conversations USING gin(participant_ids::jsonb);

-- updated_at sort: conversation list ordered by most-recent message
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(updated_at DESC);

-- ── Notifications ─────────────────────────────────────────────────────────────
-- Unread-first feed: WHERE user_id = $1 ORDER BY is_read ASC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON notifications(user_id, is_read, created_at DESC);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 26 — chat & notification performance indexes...');
    await client.query(schema);
    console.log('✅ Migration 26 complete.');
  } catch (err) {
    console.error('❌ Migration 26 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
