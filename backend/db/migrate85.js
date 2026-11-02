/**
 * migrate85.js — Force-refresh spotlight tabs on ALL demo/seed showrooms.
 *
 * migrate84 skipped showrooms that already had a non-NULL spotlight_mode.
 * This means existing demo accounts (seeded before the extraSections feature)
 * kept their old single-section spotlight even after the seed data was
 * enriched with more content sections (offer, menu, pricing, items).
 *
 * This migration re-reads the sections column for every demo/seed showroom
 * (regardless of the current spotlight_mode) and rebuilds spotlight_mode +
 * spotlight_section_ids from scratch so every demo business card shows all
 * its content tabs.
 *
 * Idempotent: running it multiple times produces the same result because it
 * always derives the correct value from the sections JSON on disk.
 */
module.exports = async function migrate85(pool) {
  const client = await pool.connect();
  console.log('\n🔧 migrate85: force-refresh spotlight tabs on all demo/seed showrooms\n');

  const EXCLUDED = new Set([
    'hero', 'cta', 'contact', 'map', 'hours', 'social', 'newsletter',
    'payment_info', 'save_showroom', 'feed_ticker', 'banner',
  ]);

  try {
    await client.query('BEGIN');

    const { rows: showrooms } = await client.query(`
      SELECT s.id, s.title, s.sections
      FROM showrooms s
      JOIN users u ON u.id = s.owner_id
      WHERE (u.is_demo = TRUE OR u.is_seed = TRUE)
        AND s.status = 'published'
      ORDER BY s.created_at
    `);

    console.log(`  Found ${showrooms.length} demo/seed showrooms to refresh`);

    let patched = 0;
    let skipped = 0;

    for (const showroom of showrooms) {
      let sections = [];
      try {
        const raw = typeof showroom.sections === 'string'
          ? showroom.sections
          : JSON.stringify(showroom.sections ?? []);
        sections = JSON.parse(raw);
        if (!Array.isArray(sections)) sections = [];
      } catch { sections = []; }

      const seen = new Set();
      const contentTypes = [];
      for (const sec of sections) {
        const type = sec?.type;
        if (!type || EXCLUDED.has(type) || seen.has(type)) continue;
        seen.add(type);
        contentTypes.push(type);
      }

      if (contentTypes.length === 0) {
        console.log(`    ⚠  Skipping "${showroom.title}" — no content sections found`);
        skipped++;
        continue;
      }

      const mode = contentTypes.length > 1 ? 'carousel' : 'single';
      await client.query(
        `UPDATE showrooms
           SET spotlight_mode           = $1,
               spotlight_section_ids    = $2,
               spotlight_carousel_count = 1,
               updated_at               = NOW()
         WHERE id = $3`,
        [mode, JSON.stringify(contentTypes), showroom.id],
      );
      console.log(`    ✔ "${showroom.title}" → ${mode} [${contentTypes.join(', ')}]`);
      patched++;
    }

    await client.query('COMMIT');
    console.log(`\n  ✅ Patched:  ${patched} showrooms`);
    console.log(`  ℹ️  Skipped: ${skipped} showrooms (no content sections)\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
