/**
 * migrate83.js — Backfill feed_ticker sections from profile ticker_text/ticker_type
 *
 * Any user_profile that has ticker_text set (from ProfileEdit) will now also
 * have a feed_ticker section injected into:
 *   1. user_profiles.business_sections  — shown on BusinessFeedCard directly
 *   2. businesses.business_sections     — the business row used by the API
 *   3. showrooms.sections               — the published showroom site sections
 *
 * The injection is idempotent: profiles that already have a feed_ticker section
 * (added through the builder) are skipped.
 *
 * This makes existing accounts' tickers visible in the business feed without
 * requiring any user action or re-seed.
 */
module.exports = async function migrate83(pool) {
  const client = await pool.connect();
  console.log('\n🔧 migrate83: backfill feed_ticker sections from profile ticker data\n');
  try {
    await client.query('BEGIN');

    const { rows: profiles } = await client.query(`
      SELECT id, user_id, ticker_text, ticker_type, business_sections
      FROM user_profiles
      WHERE ticker_text IS NOT NULL
        AND ticker_text <> ''
    `);
    console.log(`  Found ${profiles.length} profiles with ticker_text set`);

    let profilesPatched = 0;
    let businessesPatched = 0;
    let showroomsPatched = 0;

    for (const profile of profiles) {
      const tickerSection = {
        type: 'feed_ticker',
        tickerText: profile.ticker_text,
        tickerType: profile.ticker_type && profile.ticker_type !== 'none'
          ? profile.ticker_type
          : 'auto',
      };

      let sections = [];
      try {
        const raw = typeof profile.business_sections === 'string'
          ? profile.business_sections
          : JSON.stringify(profile.business_sections ?? []);
        sections = JSON.parse(raw);
        if (!Array.isArray(sections)) sections = [];
      } catch { sections = []; }

      const alreadyHasTicker = sections.some(s => s && s.type === 'feed_ticker');
      if (!alreadyHasTicker) {
        sections.push(tickerSection);
        await client.query(
          `UPDATE user_profiles SET business_sections = $1 WHERE id = $2`,
          [JSON.stringify(sections), profile.id],
        );
        profilesPatched++;
      }

      const { rows: businesses } = await client.query(
        `SELECT id, business_sections FROM businesses WHERE owner_id = $1`,
        [profile.user_id],
      );
      for (const biz of businesses) {
        let bizSections = [];
        try {
          const raw = typeof biz.business_sections === 'string'
            ? biz.business_sections
            : JSON.stringify(biz.business_sections ?? []);
          bizSections = JSON.parse(raw);
          if (!Array.isArray(bizSections)) bizSections = [];
        } catch { bizSections = []; }
        if (!bizSections.some(s => s && s.type === 'feed_ticker')) {
          bizSections.push(tickerSection);
          await client.query(
            `UPDATE businesses SET business_sections = $1 WHERE id = $2`,
            [JSON.stringify(bizSections), biz.id],
          );
          businessesPatched++;
        }
      }

      const { rows: showrooms } = await client.query(
        `SELECT id, sections FROM showrooms WHERE owner_id = $1 AND status = 'published'`,
        [profile.user_id],
      );
      for (const showroom of showrooms) {
        let srmSections = [];
        try {
          const raw = typeof showroom.sections === 'string'
            ? showroom.sections
            : JSON.stringify(showroom.sections ?? []);
          srmSections = JSON.parse(raw);
          if (!Array.isArray(srmSections)) srmSections = [];
        } catch { srmSections = []; }
        if (!srmSections.some(s => s && s.type === 'feed_ticker')) {
          srmSections.push(tickerSection);
          await client.query(
            `UPDATE showrooms SET sections = $1 WHERE id = $2`,
            [JSON.stringify(srmSections), showroom.id],
          );
          showroomsPatched++;
        }
      }
    }

    await client.query('COMMIT');
    console.log(`  ✅ user_profiles patched: ${profilesPatched}`);
    console.log(`  ✅ businesses patched:    ${businessesPatched}`);
    console.log(`  ✅ showrooms patched:     ${showroomsPatched}`);
    console.log(`  ℹ️  Skipped profiles already having feed_ticker: ${profiles.length - profilesPatched}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
