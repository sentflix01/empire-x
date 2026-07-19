const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { getPrimaryFrontendUrl } = require('../lib/frontendUrl');

// Get my referral code (generate if missing)
router.get('/my-code', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT referral_code FROM users WHERE id = $1', [req.user.id]);
    let code = rows[0]?.referral_code;
    if (!code) {
      // Generate a unique 8-char code
      code = req.user.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      await pool.query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, req.user.id]);
    }
    const { rows: referred } = await pool.query(
      'SELECT COUNT(*) FROM users WHERE referred_by = $1', [req.user.id]
    );
    res.json({ code, referral_link: `${getPrimaryFrontendUrl()}/register?ref=${code}`, total_referred: parseInt(referred[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// Apply referral code at registration (called after verifyOtp)
router.post('/apply', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Referral code is required' });
  try {
    // Find referrer
    const { rows } = await pool.query('SELECT id FROM users WHERE referral_code = $1', [code.toUpperCase()]);
    if (!rows.length) return res.status(404).json({ error: 'Invalid referral code' });
    const referrerId = rows[0].id;
    if (referrerId === req.user.id) return res.status(400).json({ error: 'Cannot use your own referral code' });

    // Check not already referred
    const { rows: current } = await pool.query('SELECT referred_by FROM users WHERE id = $1', [req.user.id]);
    if (current[0]?.referred_by) return res.status(409).json({ error: 'Referral already applied' });

    // Apply referral
    await pool.query('UPDATE users SET referred_by = $1 WHERE id = $2', [referrerId, req.user.id]);

    // Award points to referrer (50 points)
    await pool.query(
      'UPDATE user_profiles SET points = points + 50 WHERE user_id = $1', [referrerId]
    );
    await pool.query(
      `INSERT INTO point_transactions (user_id, points, type, reason) VALUES ($1, 50, 'earn', 'Referral bonus')`,
      [referrerId]
    );
    // Award 20 points to new user
    await pool.query(
      'UPDATE user_profiles SET points = points + 20 WHERE user_id = $1', [req.user.id]
    );

    res.json({ success: true, message: 'Referral applied. Both you and your referrer earned points!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply referral' });
  }
});

module.exports = router;
