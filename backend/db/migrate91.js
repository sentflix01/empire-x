/**
 * migrate91.js — remove owner-written testimonials and invented ratings.
 *
 * Decision 2026-11-14 "Reviews are platform-owned and mandatory on every
 * website": customer reviews come only from verified customers and are added
 * by the platform to every published site. Owners can no longer type their
 * own "What customers say" quotes (each was shown with five stars), so this
 * removes those sections from every saved website and business profile:
 *
 *   - sections whose type is "testimonials" (builder shape and legacy shape);
 *   - stats items that state a rating ("4.8 Customer rating", "★").
 *
 * Works on the TEXT JSON columns showrooms.sections,
 * businesses.business_sections and user_profiles.business_sections. A value
 * that is not valid JSON is left as it is and counted. Idempotent: a second
 * run finds nothing to change.
 */
const RATING_LABEL = /\b(ratings?|reviews?|stars?)\b|★/i;

function clean(value) {
  if (typeof value !== 'string' || !value.trim()) return { changed: false };
  let parsed;
  try { parsed = JSON.parse(value); } catch { return { changed: false, invalid: true }; }
  if (!Array.isArray(parsed)) return { changed: false };
  let changed = false;
  const kept = [];
  for (const section of parsed) {
    const type = section && typeof section === 'object' ? String(section.type ?? section.key ?? '') : '';
    if (type === 'testimonials') { changed = true; continue; }
    if (type === 'stats' && section && typeof section === 'object') {
      for (const key of ['stats', 'items']) {
        if (!Array.isArray(section[key])) continue;
        const items = section[key].filter((item) => !(item && typeof item === 'object' && RATING_LABEL.test(String(item.label ?? item.name ?? item.text ?? ''))));
        if (items.length !== section[key].length) { section[key] = items; changed = true; }
      }
    }
    kept.push(section);
  }
  return changed ? { changed: true, value: JSON.stringify(kept) } : { changed: false };
}

const TARGETS = [
  { table: 'showrooms', column: 'sections' },
  { table: 'businesses', column: 'business_sections' },
  { table: 'user_profiles', column: 'business_sections' },
];

module.exports = async function migrate91(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const summary = [];
    for (const { table, column } of TARGETS) {
      const { rows: present } = await client.query(
        'SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2', [table, column]);
      if (!present.length) continue;
      const { rows } = await client.query(
        `SELECT id, ${column} AS value FROM ${table} WHERE ${column} ILIKE '%testimonials%' OR ${column} ~* '"label"\\s*:\\s*"[^"]*(rating|review|★|star)'`);
      let updated = 0; let invalid = 0;
      for (const row of rows) {
        const result = clean(row.value);
        if (result.invalid) invalid += 1;
        if (!result.changed) continue;
        await client.query(`UPDATE ${table} SET ${column}=$1 WHERE id=$2`, [result.value, row.id]);
        updated += 1;
      }
      summary.push(`${table}.${column}: ${updated} updated${invalid ? `, ${invalid} not valid JSON (left as is)` : ''}`);
    }
    await client.query('COMMIT');
    console.log(`✅ migrate91: removed owner-written testimonials and rating claims (${summary.join('; ') || 'nothing to change'})`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports.clean = clean;
