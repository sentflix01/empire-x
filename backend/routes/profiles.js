const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord } = require('../utils/crud');

// Get my profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get profile by userId
router.get('/by-user/:userId', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get profile by id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const profile = await getRecord('user_profiles', req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// List profiles (with optional filter)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { user_id, profile_type, sort = '-created_at', limit = 50 } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (profile_type) filter.profile_type = profile_type;
    const profiles = await listRecords('user_profiles', { filter, sort, limit });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Create profile
router.post('/', requireAuth, async (req, res) => {
  try {
    // Check if profile already exists
    const existing = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Profile already exists. Use PUT to update.' });
    }
    const profile = await createRecord('user_profiles', {
      ...req.body,
      user_id: req.user.id,
    });
    res.status(201).json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Upsert profile for current user — must be BEFORE /:id
router.put('/me/upsert', requireAuth, async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    let profile;
    if (existing.length) {
      profile = await updateRecord('user_profiles', existing[0].id, { ...req.body, user_id: req.user.id });
    } else {
      profile = await createRecord('user_profiles', { ...req.body, user_id: req.user.id });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upsert profile' });
  }
});

// Update profile (by profile id)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('user_profiles', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await updateRecord('user_profiles', req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upsert profile for current user
router.put('/me/upsert', requireAuth, async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    let profile;
    if (existing.length) {
      profile = await updateRecord('user_profiles', existing[0].id, { ...req.body, user_id: req.user.id });
    } else {
      profile = await createRecord('user_profiles', { ...req.body, user_id: req.user.id });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upsert profile' });
  }
});

// ── PATCH /api/profiles/me/ticker — quick ticker update ─────────────────────
// Lets the frontend update only ticker fields without touching the whole profile
router.patch('/me/ticker', requireAuth, async (req, res) => {
  const { ticker_text, ticker_type } = req.body;
  const VALID_TYPES = ['none', 'contact', 'promo', 'news', 'location', 'custom', 'auto'];

  if (ticker_type !== undefined && !VALID_TYPES.includes(ticker_type)) {
    return res.status(400).json({ error: `ticker_type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (!existing.length) {
      return res.status(404).json({ error: 'Profile not found. Create your profile first.' });
    }

    const fields = [];
    const values = [];

    if (ticker_type !== undefined) {
      values.push(ticker_type);
      fields.push(`ticker_type = $${values.length}`);
    }
    if (ticker_text !== undefined) {
      values.push(ticker_text === '' ? null : ticker_text);
      fields.push(`ticker_text = $${values.length}`);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'Provide ticker_text and/or ticker_type' });
    }

    values.push(existing[0].id);
    const { rows } = await pool.query(
      `UPDATE user_profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, ticker_text, ticker_type`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Ticker update error:', err);
    res.status(500).json({ error: 'Failed to update ticker' });
  }
});

// Follow / unfollow a user
router.post('/follow/:targetUserId', requireAuth, async (req, res) => {
  const { targetUserId } = req.params;
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  try {
    const existing = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, targetUserId]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2', [req.user.id, targetUserId]);
      // Decrement counts
      await pool.query(
        'UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = $1',
        [req.user.id]
      );
      await pool.query(
        'UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = $1',
        [targetUserId]
      );
      return res.json({ following: false });
    }
    await pool.query(
      'INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)',
      [req.user.id, targetUserId]
    );
    await pool.query(
      'UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = $1',
      [req.user.id]
    );
    await pool.query(
      'UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = $1',
      [targetUserId]
    );
    res.json({ following: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
});

module.exports = router;
