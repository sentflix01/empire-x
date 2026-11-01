/**
 * migrate78.js — Set spotlight carousel mode on demo/seed showrooms
 *
 * Demo and seed showrooms have spotlight_mode=NULL (automatic = 1 section).
 * This patch sets them to 'carousel' with the content sections they already
 * have, so visitors immediately see multiple tabs in the spotlight strip.
 *
 * Logic per showroom:
 *   - Parse the sections JSON
 *   - Collect all section types that are NOT structural (no hero/contact/map
 *     /hours/social/newsletter/cta/payment_info/save_showroom/feed_ticker)
 *   - If 2+ content sections exist: set spotlight_mode='carousel',
 *     spotlight_section_ids = [those types]
 *   - If exactly 1 content section: set spotlight_mode='single',
 *     spotlight_section_ids = [that type]
 *   - If 0 content sections: leave unchanged
 *
 * Idempotent: skips showrooms that already have a non-null spotlight_mode.
 */
module.exports = async function migrate78(pool) {
  const client = await pool.connect();
  console.log('\n🔧 migrate78: configure carousel spotlight on demo/seed showrooms\n');

  // Section types that should not appear in the spotlight strip
  const EXCLUDED = new Set([
    'hero', 'cta', 'contact', 'map', 'hours', 'social', 'newsletter',
    'payment_info', 'save_showroom', 'feed_ticker', 'banner',
  ]);

  try {
    await client.query('BEGIN');

    const { rows: showrooms } = await client.query(`
      SELECT s.id, s.sections, s.spotlight_mode
      FROM showrooms s
      JOIN users u ON u.id = s.owner_id
      WHERE (u.is_demo = TRUE OR u.is_seed = TRUE)
        AND s.status = 'published'
        AND s.spotlight_mode IS NULL
    `);

    console.log(`  Found ${showrooms.length} demo/seed showrooms with spotlight_mode=NULL`);

    let patched = 0;
    let skipped = 0;

    for (const showroom of showrooms) {
      // Parse sections JSON (may be string or already parsed)
      let sections = [];
      try {
        const raw = typeof showroom.sections === 'string'
          ? showroom.sections
          : JSON.stringify(showroom.sections ?? []);
        sections = JSON.parse(raw);
        if (!Array.isArray(sections)) sections = [];
      } catch { sections = []; }

      // Collect content section types in page order, deduplicated
      const seen = new Set();
      const contentTypes = [];
      for (const sec of sections) {
        const type = sec?.type;
        if (!type || EXCLUDED.has(type) || seen.has(type)) continue;
        seen.add(type);
        contentTypes.push(type);
      }

      if (contentTypes.length === 0) {
        skipped++;
        continue;
      }

      const mode = contentTypes.length > 1 ? 'carousel' : 'single';
      await client.query(
        `UPDATE showrooms
         SET spotlight_mode = $1,
             spotlight_section_ids = $2,
             spotlight_carousel_count = 1,
             updated_at = NOW()
         WHERE id = $3`,
        [mode, JSON.stringify(contentTypes), showroom.id],
      );
      patched++;
    }

    await client.query('COMMIT');
    console.log(`  ✅ Patched:  ${patched} showrooms → carousel/single mode`);
    console.log(`  ℹ️  Skipped: ${skipped} showrooms (no content sections)`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
