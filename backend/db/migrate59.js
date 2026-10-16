/**
 * migrate59.js - Give legacy published sites a Business profile (owner decision 1, 2026-10-16).
 *
 * Every site must belong to a Business profile (decision record §4), and a site
 * whose business has no paid period is hidden from visitors. Sites published
 * before that rule have business_id = NULL and would disappear.
 *
 * For each real owner (not demo, not seed) with published sites and no
 * Business profile, this creates one profile from their latest site's title and
 * category, links all their unlinked published sites to it, grants a free
 * period of LEGACY_GRANT_DAYS at the plan tier their sections need, and leaves
 * an in-app notice. Owners with several Business profiles are left to choose
 * (as migrate49 does); owners with exactly one were already linked by migrate49.
 *
 * Idempotent: it only touches published sites that are still unlinked, so
 * re-running on every deploy changes nothing once they are linked.
 */
const { getRequiredBusinessTier } = require('../lib/builderSectionRequirements');

const LEGACY_GRANT_DAYS = 30;

/** Builder category (Showroom Studio) -> business_category (lib/businessTemplates.ts). */
const BUSINESS_CATEGORY = {
  'Business & Commerce': 'shop',
  'Health & Medical': 'health',
  'Food & Beverage': 'restaurant',
  'Construction & Trade': 'service',
  'Transport & Logistics': 'service',
  'Education': 'course',
  'Professional Services': 'service',
  'Agriculture & Farming': 'shop',
  'Hospitality & Tourism': 'event',
  'Beauty & Personal Care': 'service',
};
const TIER_RANK = { normal: 1, premium: 2, pro: 3 };

module.exports = async function migrate59(pool) {
  await pool.query('ALTER TABLE businesses ADD COLUMN IF NOT EXISTS legacy_migrated_at TIMESTAMPTZ');

  const { rows: owners } = await pool.query(`
    SELECT s.owner_id
      FROM showrooms s
      JOIN users u ON u.id = s.owner_id AND u.is_demo = FALSE AND u.is_seed = FALSE
     WHERE s.business_id IS NULL AND s.status = 'published'
       AND NOT EXISTS (SELECT 1 FROM businesses b WHERE b.owner_id = s.owner_id)
     GROUP BY s.owner_id
  `);

  for (const { owner_id: ownerId } of owners) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: sites } = await client.query(
        `SELECT id, title, description, category, sections, logo_url, cover_image
           FROM showrooms
          WHERE owner_id = $1 AND business_id IS NULL AND status = 'published'
          ORDER BY updated_at DESC NULLS LAST, created_at DESC
          FOR UPDATE`,
        [ownerId],
      );
      if (!sites.length) { await client.query('ROLLBACK'); continue; }

      const latest = sites[0];
      const tier = sites
        .map((site) => getRequiredBusinessTier(site.sections) || 'premium')
        .reduce((best, t) => (TIER_RANK[t] > TIER_RANK[best] ? t : best), 'normal');

      const { rows: [business] } = await client.query(
        `INSERT INTO businesses (owner_id, business_name, business_category, business_description, business_logo_url, business_cover_url, legacy_migrated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, business_name`,
        [
          ownerId,
          String(latest.title || 'My business').slice(0, 200),
          BUSINESS_CATEGORY[latest.category] || 'other',
          latest.description || null,
          latest.logo_url || null,
          latest.cover_image || null,
        ],
      );
      await client.query(
        `UPDATE showrooms SET business_id = $1, updated_at = NOW()
          WHERE owner_id = $2 AND business_id IS NULL AND status = 'published'`,
        [business.id, ownerId],
      );
      await client.query(
        `INSERT INTO business_subscriptions (business_id, tier, status, currency, current_period_start, current_period_end)
         VALUES ($1, $2, 'trialing', 'ETB', NOW(), NOW() + make_interval(days => $3))
         ON CONFLICT (business_id) DO NOTHING`,
        [business.id, tier, LEGACY_GRANT_DAYS],
      );
      await client.query(
        'UPDATE user_profiles SET has_business_profile = TRUE WHERE user_id = $1',
        [ownerId],
      );
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES ($1, 'business', $2, $3, $4)`,
        [
          ownerId,
          'Your website now has a Business profile',
          `We created the Business profile "${business.business_name}" for your website so it stays online. ` +
            `It is free for ${LEGACY_GRANT_DAYS} days; choose a plan before then to keep it published.`,
          `/business/subscription?businessId=${business.id}`,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports.LEGACY_GRANT_DAYS = LEGACY_GRANT_DAYS;
module.exports.BUSINESS_CATEGORY = BUSINESS_CATEGORY;
