/**
 * migrate62.js - Extend the legacy websites' free period to six months
 * (owner decision, 2026-10-17).
 *
 * migrate59 gave each website published before paid publishing a Business
 * profile with a 30-day free ('trialing') period. The platform is still in
 * its trial with tester-owned sites and ETB checkout is not live yet, so the
 * owner extended that period to six months from when the profile was created.
 *
 * Only trialing legacy grants are touched, and the end date only ever moves
 * later. Each owner gets one in-app notice with the new date.
 * Idempotent: once a grant reaches six months it no longer matches, so
 * re-running on every deploy changes nothing and sends no further notices.
 */
const { LEGACY_GRANT_MONTHS } = require('./migrate59');

module.exports = async function migrate62(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE business_subscriptions bs
          SET current_period_end = b.legacy_migrated_at + make_interval(months => $1), updated_at = NOW()
         FROM businesses b
        WHERE b.id = bs.business_id
          AND b.legacy_migrated_at IS NOT NULL
          AND bs.status = 'trialing'
          AND bs.current_period_end < b.legacy_migrated_at + make_interval(months => $1)
        RETURNING b.id AS business_id, b.owner_id, b.business_name, bs.current_period_end`,
      [LEGACY_GRANT_MONTHS],
    );
    for (const row of rows) {
      const until = new Date(row.current_period_end).toDateString();
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, link)
         VALUES ($1, 'business', $2, $3, $4)`,
        [
          row.owner_id,
          'Your free period is extended',
          `Your Business profile "${row.business_name}" and its website are now free until ${until}. ` +
            'Choose a plan before then to keep your website published.',
          `/business/subscription?businessId=${row.business_id}`,
        ],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
