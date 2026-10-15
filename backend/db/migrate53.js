/**
 * migrate53.js - Restore the real platform admin account.
 *
 * migrate39.js used to mark admin@nodbusiness.app as a demo account on every
 * deploy (migrate-all re-runs every file), and login refuses demo accounts
 * with LEGACY_DEMO_ACCOUNT, so the admin could not sign in. The owner
 * confirmed on 2026-10-15 that this is the real admin. migrate39 no longer
 * lists it; this clears the flag already written. Only a non-seed admin row
 * is touched, so seeded or demo personas keep their flags.
 */
module.exports = async function migrate53(pool) {
  await pool.query(`
    UPDATE users
       SET is_demo = FALSE
     WHERE email = 'admin@nodbusiness.app'
       AND role = 'admin'
       AND is_seed = FALSE
       AND is_demo = TRUE
  `);
};
