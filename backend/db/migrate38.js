/**
 * migrate38.js — story_reactions and story_comments tables
 *
 * stories.ts references these tables for engagement (reactions/replies)
 * but they were never created in a migration. This adds them idempotently.
 */
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS story_reactions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        emoji      TEXT NOT NULL DEFAULT '❤️',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (story_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS story_comments (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        author_id     UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
        author_name   TEXT,
        author_avatar TEXT,
        content       TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_story_comments_story  ON story_comments(story_id)`);

    await client.query('COMMIT');
    console.log('✅ Migration 38 complete — story_reactions and story_comments tables created.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 38 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
