/**
 * migrate82.js - Reactions can be any single emoji (messaging M4).
 *
 * Post likes and comment reactions were limited by CHECK constraints to seven
 * emojis (migrate67). The owner asked for every emoji, in messages and in
 * comments. The server now checks that a reaction is exactly one emoji
 * (lib/emoji.ts); the database keeps only a length guard.
 *
 * Drops whatever CHECK mentions the reaction column (its name differs between
 * the likes table and the inline comment_reactions one) and adds a length
 * check on likes, comment_reactions and message_reactions. Idempotent.
 */
module.exports = async function migrate82(pool) {
  await pool.query(`
    DO $$
    DECLARE c record;
    BEGIN
      FOR c IN
        SELECT con.conname, rel.relname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
         WHERE con.contype = 'c'
           AND rel.relname IN ('likes', 'comment_reactions')
           AND pg_get_constraintdef(con.oid) ILIKE '%reaction%'
      LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', c.relname, c.conname);
      END LOOP;
    END$$;

    ALTER TABLE likes ADD CONSTRAINT likes_reaction_check
      CHECK (char_length(reaction) BETWEEN 1 AND 32);
    ALTER TABLE comment_reactions ADD CONSTRAINT comment_reactions_reaction_check
      CHECK (char_length(reaction) BETWEEN 1 AND 32);

    ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS message_reactions_emoji_length;
    ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_emoji_length
      CHECK (char_length(emoji) BETWEEN 1 AND 32);
  `);
};
