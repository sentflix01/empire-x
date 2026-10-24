/**
 * migrate80.js - Fill in the author's name and picture on posts that have none.
 *
 * Automatic "<site> is now live on Nodbusiness" posts were inserted without
 * author_name / author_avatar, so the feed showed their author as "Unknown".
 * New announcements now copy them from the author's profile; this backfills
 * existing posts from user_profiles. Only empty values are filled. Idempotent.
 */
module.exports = async function migrate80(pool) {
  const { rowCount } = await pool.query(`
    UPDATE posts p
       SET author_name   = COALESCE(p.author_name, up.display_name),
           author_avatar = COALESCE(p.author_avatar, up.avatar_url)
      FROM user_profiles up
     WHERE up.user_id = p.author_id
       AND ((p.author_name IS NULL AND up.display_name IS NOT NULL)
         OR (p.author_avatar IS NULL AND up.avatar_url IS NOT NULL))
  `);
  console.log(`migrate80: filled in the author on ${rowCount} post(s)`);
};
