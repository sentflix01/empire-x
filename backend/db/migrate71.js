/**
 * migrate71.js — Message Search (full-text + trigram)
 *
 * (1) Enables pg_trgm extension for trigram similarity search.
 * (2) Adds a `search_vector TSVECTOR` column to messages.
 * (3) Populates existing rows in a single batch (WHERE guard makes it idempotent).
 * (4) Creates a GIN index on search_vector for fast full-text queries.
 * (5) Creates a GIN trigram index on content for fuzzy/prefix matching.
 * (6) Creates (or replaces) the trigger function + trigger so every INSERT or
 *     content UPDATE keeps search_vector in sync automatically.
 *
 * Idempotent: safe to re-run on every deploy — uses IF NOT EXISTS guards and
 * CREATE OR REPLACE for the trigger function.
 */
module.exports = async function migrate71(pool) {
  // (1) pg_trgm — required for gin_trgm_ops index
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // (2) Add the tsvector column
  await pool.query(`
    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  `);

  // (3) Back-fill rows that have not been indexed yet (idempotent via WHERE)
  await pool.query(`
    UPDATE messages
       SET search_vector = to_tsvector('simple', COALESCE(content, ''))
     WHERE search_vector IS NULL
  `);

  // (4) GIN index for full-text search
  await pool.query(`
    CREATE INDEX IF NOT EXISTS messages_fts_idx
      ON messages USING GIN (search_vector)
  `);

  // (5) GIN trigram index on content for prefix/fuzzy matching
  await pool.query(`
    CREATE INDEX IF NOT EXISTS messages_trgm_idx
      ON messages USING GIN (content gin_trgm_ops)
  `);

  // (6) Trigger function (CREATE OR REPLACE is inherently idempotent)
  await pool.query(`
    CREATE OR REPLACE FUNCTION messages_search_vector_update()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search_vector := to_tsvector('simple', COALESCE(NEW.content, ''));
      RETURN NEW;
    END;
    $$
  `);

  // Drop the trigger first so re-runs don't fail with "already exists"
  await pool.query(`
    DROP TRIGGER IF EXISTS messages_search_vector_trig ON messages
  `);

  await pool.query(`
    CREATE TRIGGER messages_search_vector_trig
      BEFORE INSERT OR UPDATE OF content
      ON messages
      FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update()
  `);
};
