/**
 * migrate70.js — Message Reactions
 *
 * (1) Adds a denormalized `reactions` JSONB cache column to messages.
 * (2) Creates the message_reactions table for per-user emoji reactions.
 * (3) Adds indexes on message_id and user_id for fast lookup.
 *
 * Idempotent: safe to re-run on every deploy — uses IF NOT EXISTS / ADD COLUMN
 * IF NOT EXISTS guards everywhere.
 */
module.exports = async function migrate70(pool) {
  await pool.query(`
    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}';

    CREATE TABLE IF NOT EXISTS message_reactions (
      id         BIGSERIAL PRIMARY KEY,
      message_id UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      emoji      TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (message_id, user_id, emoji)
    );

    CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id    ON message_reactions(user_id);
  `);
};
