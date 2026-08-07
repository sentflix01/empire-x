const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// ── Dashboard stats ───────────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [users, posts, products, orders, tasks] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM posts'),
      pool.query('SELECT COUNT(*) FROM products'),
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query('SELECT COUNT(*) FROM tasks'),
    ]);
    res.json({
      users: parseInt(users.rows[0].count),
      posts: parseInt(posts.rows[0].count),
      products: parseInt(products.rows[0].count),
      orders: parseInt(orders.rows[0].count),
      tasks: parseInt(tasks.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT id, email, full_name, role, is_verified, provider, created_at FROM users';
    const values = [];
    if (search) {
      query += ' WHERE email ILIKE $1 OR full_name ILIKE $1';
      values.push(`%${search}%`);
    }
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit), parseInt(offset));
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Set user role
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── Verification management ───────────────────────────────────────────────────

// Get all users with verification status (for admin panel)
router.get('/verifications', async (req, res) => {
  try {
    const { status = 'all', limit = 50, offset = 0 } = req.query;
    let where = '';
    if (status === 'verified')   where = 'WHERE up.is_verified = TRUE';
    if (status === 'unverified') where = 'WHERE up.is_verified = FALSE';
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at,
              up.display_name, up.avatar_url, up.location, up.is_verified,
              up.verification_type, up.verified_at, up.verification_note,
              up.follower_count, up.has_business_profile
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       ${where}
       ORDER BY up.follower_count DESC NULLS LAST, u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

// Grant verification badge to a user
router.post('/verifications/:userId', async (req, res) => {
  const { verification_type = 'personal', verification_note = '' } = req.body;
  const validTypes = ['personal', 'business', 'creator', 'official'];
  if (!validTypes.includes(verification_type)) {
    return res.status(400).json({ error: 'Invalid verification_type. Must be: ' + validTypes.join(', ') });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE user_profiles
       SET is_verified = TRUE,
           verification_type = $1,
           verified_at = NOW(),
           verification_note = $2
       WHERE user_id = $3
       RETURNING user_id, is_verified, verification_type, verified_at`,
      [verification_type, verification_note || null, req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User profile not found' });
    // Also mark user as verified in users table
    await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [req.params.userId]);
    res.json({ success: true, ...rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to grant verification' });
  }
});

// Revoke verification from a user
router.delete('/verifications/:userId', async (req, res) => {
  try {
    await pool.query(
      `UPDATE user_profiles
       SET is_verified = FALSE, verification_type = NULL,
           verified_at = NULL, verification_note = NULL
       WHERE user_id = $1`,
      [req.params.userId]
    );
    await pool.query('UPDATE users SET is_verified = FALSE WHERE id = $1', [req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke verification' });
  }
});

// ── Posts ─────────────────────────────────────────────────────────────────────
router.get('/posts', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ── Products ──────────────────────────────────────────────────────────────────
// Postgres NUMERIC/bigint columns come back as strings from pg — coerce the
// rating fields to numbers, mirroring normalizeProduct in routes/products.js.
function normalizeProduct(p) {
  const out = { ...p };
  if (out.average_rating != null) out.average_rating = Number(out.average_rating) || 0;
  if (out.review_count != null) out.review_count = Number(out.review_count) || 0;
  if (out.rating_count != null) out.rating_count = Number(out.rating_count) || 0;
  return out;
}

router.get('/products', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );
    res.json(rows.map(normalizeProduct));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.email as reporter_email 
       FROM reports r 
       LEFT JOIN users u ON u.id = r.reporter_id 
       WHERE r.status = 'pending' 
       ORDER BY r.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.put('/reports/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query(
      'UPDATE reports SET status = $1, resolved_at = NOW() WHERE id = $2',
      [status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Verify a user profile
router.put('/users/:id/verify', async (req, res) => {
  try {
    await pool.query(
      'UPDATE user_profiles SET is_verified = TRUE WHERE user_id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

module.exports = router;
