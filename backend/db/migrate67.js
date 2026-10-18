/**
 * migrate67.js - People-first interactions on posts and comments.
 *
 * - Reactions: one per person per post. The existing likes row gains an
 *   emoji (existing likes become ❤️), so like_count stays "all reactions".
 *   Comments get the same in comment_reactions.
 * - Comment edits show "edited" (comments.edited_at).
 * - Viewer controls: hide a post ("Not interested"), mute a person (their
 *   posts leave your feed), restrict a person (their comments on your posts
 *   are seen only by them). Blocks already exist (blocks, migrate2).
 * - Post owner controls: pin to profile, who can comment, hide like count,
 *   notifications off for that post.
 * - Privacy settings on the profile: who sees my posts, appear in search,
 *   default who can comment, who can message me, show my reactions.
 * Idempotent: safe to re-run on every deploy.
 */
const REACTIONS = "('❤️','👍','😂','😮','😢','👏','🔥')";

module.exports = async function migrate67(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE likes ADD COLUMN IF NOT EXISTS reaction TEXT NOT NULL DEFAULT '❤️';
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_reaction_check') THEN
          ALTER TABLE likes ADD CONSTRAINT likes_reaction_check CHECK (reaction IN ${REACTIONS});
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_likes_target_reaction ON likes(target_id, reaction);

      CREATE TABLE IF NOT EXISTS comment_reactions (
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction   TEXT NOT NULL CHECK (reaction IN ${REACTIONS}),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (comment_id, user_id)
      );
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS post_hidden (
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      );
      CREATE TABLE IF NOT EXISTS user_mutes (
        muter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        muted_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (muter_id, muted_id),
        CHECK (muter_id <> muted_id)
      );
      CREATE TABLE IF NOT EXISTS user_restricts (
        owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        restricted_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (owner_id, restricted_id),
        CHECK (owner_id <> restricted_id)
      );

      ALTER TABLE posts
        ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS comment_policy TEXT NOT NULL DEFAULT 'everyone',
        ADD COLUMN IF NOT EXISTS hide_like_count BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS notifications_off BOOLEAN NOT NULL DEFAULT FALSE;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_comment_policy_check') THEN
          ALTER TABLE posts ADD CONSTRAINT posts_comment_policy_check CHECK (comment_policy IN ('everyone', 'followers', 'off'));
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS idx_posts_author_pinned ON posts(author_id, pinned_at) WHERE pinned_at IS NOT NULL;

      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'public',
        ADD COLUMN IF NOT EXISTS searchable BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS default_comment_policy TEXT NOT NULL DEFAULT 'everyone',
        ADD COLUMN IF NOT EXISTS message_policy TEXT NOT NULL DEFAULT 'everyone',
        ADD COLUMN IF NOT EXISTS show_reactions BOOLEAN NOT NULL DEFAULT TRUE;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_privacy_check') THEN
          ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_privacy_check CHECK (
            profile_visibility IN ('public', 'followers', 'private')
            AND default_comment_policy IN ('everyone', 'followers', 'off')
            AND message_policy IN ('everyone', 'followers', 'nobody'));
        END IF;
      END $$;
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
};
