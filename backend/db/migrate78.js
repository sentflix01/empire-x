/**
 * migrate78.js - Repair Feed Spotlight section lists that aren't JSON arrays.
 *
 * PATCH /api/showrooms/:id/spotlight passed a JavaScript array straight to
 * Postgres. node-pg sends arrays in Postgres array syntax, so an empty list was
 * stored as the JSON object {} instead of []. The feed then called .includes
 * on that object and crashed for every viewer. The route now stores JSON text.
 *
 * Resets any non-array value to [] (no sections chosen). A showroom whose
 * spotlight was "single" or "carousel" with no sections then shows no
 * spotlight, as the feed already does for an empty list. Idempotent.
 */
module.exports = async function migrate78(pool) {
  const { rowCount } = await pool.query(`
    UPDATE showrooms
       SET spotlight_section_ids = '[]'::jsonb
     WHERE spotlight_section_ids IS NOT NULL
       AND jsonb_typeof(spotlight_section_ids) <> 'array'
  `);
  console.log(`migrate78: repaired ${rowCount} spotlight section list(s)`);
};
