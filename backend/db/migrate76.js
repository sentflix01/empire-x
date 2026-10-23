/**
 * migrate76.js — Patch spotlight_mode on existing seed showrooms
 *
 * Best-effort patch: updates spotlight_mode/spotlight_section_ids/
 * spotlight_carousel_count on existing seed showrooms to match the
 * distribution used in the new seed-showrooms.js.
 *
 * Distribution (by position in result set, 0-based):
 *   pos % 5 === 0 → single (best content section)
 *   pos % 5 === 1 → carousel, carouselCount=1
 *   pos % 5 === 2 → carousel, carouselCount=2
 *   pos % 5 === 3 → single (contact or testimonials)
 *   pos % 5 === 4 → off
 *
 * Run: node db/migrate76.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

async function migrate() {
  const client = await pool.connect();
  console.log('\n🔧 migrate76: patching spotlight on seed showrooms\n');
  try {
    const { rows: showrooms } = await client.query(
      `SELECT s.id, s.category, s.sections
       FROM showrooms s
       JOIN users u ON u.id = s.owner_id
       WHERE u.is_seed = TRUE
       ORDER BY s.created_at`
    );
    console.log(`  Found ${showrooms.length} seed showrooms`);

    const CONTENT_SECTION_BY_CATEGORY = {
      'Food & Beverage':        'menu',
      'Business & Commerce':    'items',
      'Agriculture & Farming':  'items',
      'Health & Medical':       'services',
      'Construction & Trade':   'services',
      'Transport & Logistics':  'services',
      'Education':              'services',
      'Professional Services':  'services',
      'Hospitality & Tourism':  'services',
      'Beauty & Personal Care': 'services',
    };

    let patched = 0;
    for (let i = 0; i < showrooms.length; i++) {
      const s = showrooms[i];
      const pos = i % 5;
      const sections = Array.isArray(s.sections) ? s.sections : [];
      const sectionTypes = sections.map(sec => sec.type).filter(Boolean);
      const contentKey = CONTENT_SECTION_BY_CATEGORY[s.category] || 'services';
      const hasContent      = sectionTypes.includes(contentKey);
      const hasContact      = sectionTypes.includes('contact');
      const hasTestimonials = sectionTypes.includes('testimonials');

      let mode, sectionIds, carouselCount;
      if (pos === 0) {
        mode = 'single';
        sectionIds = [hasContent ? contentKey : (sectionTypes[1] || sectionTypes[0] || 'hero')];
        carouselCount = 1;
      } else if (pos === 1) {
        mode = 'carousel';
        sectionIds = sectionTypes.slice(0, 2);
        carouselCount = 1;
      } else if (pos === 2) {
        mode = 'carousel';
        sectionIds = sectionTypes.slice(0, 3);
        carouselCount = 2;
      } else if (pos === 3) {
        mode = 'single';
        sectionIds = [hasContact ? 'contact' : (hasTestimonials ? 'testimonials' : sectionTypes[0] || 'hero')];
        carouselCount = 1;
      } else {
        mode = 'off';
        sectionIds = [];
        carouselCount = 1;
      }

      await client.query(
        `UPDATE showrooms
         SET spotlight_mode=$1, spotlight_section_ids=$2, spotlight_carousel_count=$3
         WHERE id=$4`,
        [mode, JSON.stringify(sectionIds), carouselCount, s.id]
      );
      patched++;
    }
    console.log(`  ✅ Patched ${patched} showrooms`);
  } catch (err) {
    console.error('❌ migrate76 failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) migrate();
module.exports = { migrate };
