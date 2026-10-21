/**
 * migrate72.js — Server-side pin & save for messages.
 *
 * pinned_messages: per-conversation pinned messages tracked by who pinned them.
 * saved_messages:  per-user saved messages (bookmarks), cross-conversation.
 *
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate72(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pinned_messages (
      id              BIGSERIAL PRIMARY KEY,
      conversation_id UUID        NOT NULL REFERENCES conversations(id)   ON DELETE CASCADE,
      message_id      UUID        NOT NULL REFERENCES messages(id)        ON DELETE CASCADE,
      pinned_by       UUID        NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
      pinned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (conversation_id, message_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pinned_messages_conversation
      ON pinned_messages (conversation_id);

    CREATE TABLE IF NOT EXISTS saved_messages (
      id         BIGSERIAL PRIMARY KEY,
      user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      message_id UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, message_id)
    );

    CREATE INDEX IF NOT EXISTS idx_saved_messages_user
      ON saved_messages (user_id);
  `);
};
