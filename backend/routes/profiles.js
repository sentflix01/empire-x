const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord } = require('../utils/crud');
const { cacheMiddleware } = require('../middleware/cache');

// ── Cover position fields — whitelisted "x% y%" strings (CSS object-position) ──
// NULL or '' clears back to default centered positioning.
const COVER_POS_RE = /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;
const COVER_POSITION_FIELDS = ['cover_position', 'business_cover_position'];
function sanitizeCoverPositions(body) {
  for (const k of COVER_POSITION_FIELDS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === '') continue; // allow clearing
    if (typeof v !== 'string' || !COVER_POS_RE.test(v)) delete body[k];
  }
  return body;
}

// ── BUG-6 fix: mirror the profile display_name into users.full_name ──────────
// Registration has no name field, so users.full_name stays NULL until the user
// completes onboarding — which only wrote user_profiles. The nav/avatar reads
// users.full_name, so sync it here whenever a profile name is saved.
async function syncUserName(userId, displayName) {
  if (typeof displayName !== 'string' || !displayName.trim()) return;
  await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [displayName.trim(), userId]);
}

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
      `SELECT up.*, u.is_seed
       FROM user_profiles up
       JOIN users u ON u.id = up.user_id
       WHERE up.user_id = $1`,
      [req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── GET /api/profiles/me/follows — list user IDs that the current user follows ──
// Must be defined BEFORE /:id to avoid Express matching 'me' as a profile id
router.get('/me/follows', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT followed_id FROM follows WHERE follower_id = $1',
      [req.user.id]
    );
    res.json(rows.map(r => r.followed_id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});

// ── GET /api/profiles/follows — alias for /me/follows ──
router.get('/follows', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT followed_id FROM follows WHERE follower_id = $1',
      [req.user.id]
    );
    res.json(rows.map(r => r.followed_id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});

// Get profile by id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT up.*, u.is_seed
       FROM user_profiles up
       JOIN users u ON u.id = up.user_id
       WHERE up.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// List profiles (with optional filter)
router.get('/', optionalAuth, async (req, res) => {
  const { getRedis } = require('../lib/redis');
  const redis = getRedis();
  const { user_id, profile_type, sort = '-created_at', limit = 50 } = req.query;

  // Build a cache key that includes realOnly so seed/non-seed responses don't collide
  const cacheKey = `cache:profiles:list:${new URLSearchParams({ ...req.query, realOnly: req.realOnly ? '1' : '0' }).toString()}`;
  if (!redis.isNoOp) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    } catch {}
  }

  try {
    const conditions = [];
    const values = [];
    if (user_id) { values.push(user_id); conditions.push(`up.user_id = $${values.length}`); }
    if (profile_type) { values.push(profile_type); conditions.push(`up.profile_type = $${values.length}`); }
    if (req.realOnly) conditions.push('u.is_seed = FALSE');
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit, 10) || 50, 500);
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const sortCol = sort.replace(/^-/, '').replace(/[^a-z0-9_]/gi, '') || 'created_at';
    values.push(lim);
    const { rows } = await pool.query(
      `SELECT up.*, u.is_seed FROM user_profiles up JOIN users u ON u.id = up.user_id
       ${whereClause} ORDER BY up.${sortCol} ${sortDir} LIMIT $${values.length}`,
      values
    );
    // Cache for 60s
    if (!redis.isNoOp) redis.setex(cacheKey, 60, JSON.stringify(rows)).catch(() => {});
    res.set('X-Cache', 'MISS');
    res.json(rows);
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
    await syncUserName(req.user.id, req.body.display_name);
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
    const body = sanitizeCoverPositions(req.body);
    let profile;
    if (existing.length) {
      profile = await updateRecord('user_profiles', existing[0].id, { ...body, user_id: req.user.id });
    } else {
      profile = await createRecord('user_profiles', { ...body, user_id: req.user.id });
    }
    await syncUserName(req.user.id, body.display_name);
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
    const updated = await updateRecord('user_profiles', req.params.id, sanitizeCoverPositions(req.body));
    if (!updated) return res.status(404).json({ error: 'Profile not found' });
    await syncUserName(existing.user_id, req.body.display_name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
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

  // Follow / unfollow — use transaction to prevent race conditions + parallel count updates
router.post('/follow/:targetUserId', requireAuth, async (req, res) => {
  const { targetUserId } = req.params;
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check existing follow
    const { rows: existing } = await client.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, targetUserId]
    );

    if (existing.length) {
      // Unfollow
      await client.query(
        'DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2',
        [req.user.id, targetUserId]
      );
      // Parallel count decrements in same transaction
      await Promise.all([
        client.query('UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = $1', [req.user.id]),
        client.query('UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = $1', [targetUserId]),
      ]);
      await client.query('COMMIT');
      return res.json({ following: false });
    }

    // Follow
    await client.query('INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2)', [req.user.id, targetUserId]);
    await Promise.all([
      client.query('UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = $1', [req.user.id]),
      client.query('UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = $1', [targetUserId]),
    ]);
    await client.query('COMMIT');
    res.json({ following: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to toggle follow' });
  } finally {
    client.release();
  }
});

module.exports = router;
