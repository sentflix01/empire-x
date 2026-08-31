import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, requireAdmin, invalidateUserCache } from '../middleware/auth';
import { getRedis } from '../lib/redis';
import * as apiError from '../lib/apiError';

const router = Router();
router.use(requireAuth, requireAdmin);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAdminCount(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin' AND is_banned = FALSE",
  );
  return parseInt(rows[0].count, 10);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [users, posts, products, orders, tasks, revenue, newUsersToday, bannedUsers] =
      await Promise.all([
        pool.query("SELECT COUNT(*) FROM users WHERE is_banned = FALSE OR is_banned IS NULL"),
        pool.query("SELECT COUNT(*) FROM posts"),
        pool.query("SELECT COUNT(*) FROM products WHERE status = 'active'"),
        pool.query("SELECT COUNT(*), COUNT(*) FILTER (WHERE status='paid') AS paid_count, COUNT(*) FILTER (WHERE status='pending') AS pending_count FROM orders"),
        pool.query("SELECT COUNT(*) FROM tasks WHERE status = 'open'"),
        pool.query("SELECT COALESCE(SUM(total_price),0) AS total, COALESCE(SUM(total_price) FILTER (WHERE created_at > NOW()-INTERVAL '30 days'),0) AS last_30d FROM orders WHERE status IN ('paid','processing','completed')"),
        pool.query("SELECT COUNT(*) FROM users WHERE created_at > NOW()-INTERVAL '24 hours'"),
        pool.query("SELECT COUNT(*) FROM users WHERE is_banned = TRUE"),
      ]);
    res.json({
      users: parseInt(users.rows[0].count),
      posts: parseInt(posts.rows[0].count),
      products: parseInt(products.rows[0].count),
      orders: parseInt(orders.rows[0].count),
      orders_paid: parseInt(orders.rows[0].paid_count),
      orders_pending: parseInt(orders.rows[0].pending_count),
      tasks: parseInt(tasks.rows[0].count),
      revenue_total: parseFloat(revenue.rows[0].total),
      revenue_last_30d: parseFloat(revenue.rows[0].last_30d),
      new_users_today: parseInt(newUsersToday.rows[0].count),
      banned_users: parseInt(bannedUsers.rows[0].count),
    });
  } catch { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query as Record<string, string>;
    const values: unknown[] = [];
    let query = 'SELECT id, email, full_name, role, is_verified, provider, created_at FROM users';
    if (search) { values.push(`%${search}%`); query += ' WHERE email ILIKE $1 OR full_name ILIKE $1'; }
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit), parseInt(offset));
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.put('/users/:id/role', async (req: Request, res: Response) => {
  const { role } = req.body as { role?: string };
  if (!['admin', 'user'].includes(role ?? '')) { res.status(400).json({ error: 'Invalid role' }); return; }
  try {
    // Prevent demoting the last admin
    if (role === 'user') {
      const target = await pool.query<{ role: string }>('SELECT role FROM users WHERE id = $1', [req.params.id]);
      if (target.rows[0]?.role === 'admin') {
        const adminCount = await getAdminCount();
        if (adminCount <= 1) {
          res.status(400).json({ error: 'Cannot demote the last admin account' });
          return;
        }
      }
    }
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
    await invalidateUserCache(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to update role' }); }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) { res.status(400).json({ error: 'Cannot delete your own account' }); return; }
  try {
    // Prevent deleting the last admin
    const target = await pool.query<{ role: string }>('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (target.rows[0]?.role === 'admin') {
      const adminCount = await getAdminCount();
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Cannot delete the last admin account' });
        return;
      }
    }
    const redis = getRedis();
    if (!redis.isNoOp) {
      try {
        await (redis as RedisClient).setex(
          `revoke_before:${req.params.id}`,
          7 * 24 * 60 * 60,
          Math.floor(Date.now() / 1000).toString(),
        );
      } catch { /* non-fatal */ }
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await invalidateUserCache(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete user' }); }
});

router.post('/users/:id/ban', async (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) { res.status(400).json({ error: 'Cannot ban your own account' }); return; }
  const { reason } = req.body as { reason?: string };
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_banned=TRUE, ban_reason=$1, banned_at=NOW() WHERE id=$2 RETURNING id`,
      [reason ?? null, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    await invalidateUserCache(req.params.id);
    const redis = getRedis();
    if (!redis.isNoOp) {
      try {
        await (redis as RedisClient).setex(
          `revoke_before:${req.params.id}`,
          7 * 24 * 60 * 60,
          Math.floor(Date.now() / 1000).toString(),
        );
      } catch { /* non-fatal */ }
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to ban user' }); }
});

router.post('/users/:id/unban', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_banned=FALSE, ban_reason=NULL, banned_at=NULL WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    await invalidateUserCache(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to unban user' }); }
});

// ── Verifications ─────────────────────────────────────────────────────────────
router.get('/verifications', async (req: Request, res: Response) => {
  try {
    const { status = 'all', limit = '50', offset = '0' } = req.query as Record<string, string>;
    const where = status === 'verified' ? 'WHERE up.is_verified=TRUE' : status === 'unverified' ? 'WHERE up.is_verified=FALSE' : '';
    const { rows } = await pool.query(
      `SELECT u.id,u.email,u.full_name,u.role,u.created_at,up.display_name,up.avatar_url,up.location,
              up.is_verified,up.verification_type,up.verified_at,up.verification_note,up.follower_count,up.has_business_profile
       FROM users u LEFT JOIN user_profiles up ON up.user_id=u.id ${where}
       ORDER BY up.follower_count DESC NULLS LAST, u.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch verifications' }); }
});

router.post('/verifications/:userId', async (req: Request, res: Response) => {
  const { verification_type = 'personal', verification_note = '' } = req.body as Record<string, string>;
  const validTypes = ['personal', 'business', 'creator', 'official'];
  if (!validTypes.includes(verification_type)) { res.status(400).json({ error: `Invalid verification_type. Must be: ${validTypes.join(', ')}` }); return; }
  try {
    const { rows } = await pool.query(
      `UPDATE user_profiles SET is_verified=TRUE,verification_type=$1,verified_at=NOW(),verification_note=$2
       WHERE user_id=$3 RETURNING user_id,is_verified,verification_type,verified_at`,
      [verification_type, verification_note || null, req.params.userId],
    );
    if (!rows.length) { res.status(404).json({ error: 'User profile not found' }); return; }
    await pool.query('UPDATE users SET is_verified=TRUE WHERE id=$1', [req.params.userId]);
    res.json({ success: true, ...rows[0] });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Grant verification error');
    res.status(500).json({ error: 'Failed to grant verification' });
  }
});

router.delete('/verifications/:userId', async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE user_profiles SET is_verified=FALSE,verification_type=NULL,verified_at=NULL,verification_note=NULL WHERE user_id=$1`,
      [req.params.userId],
    );
    await pool.query('UPDATE users SET is_verified=FALSE WHERE id=$1', [req.params.userId]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to revoke verification' }); }
});

// ── Posts ─────────────────────────────────────────────────────────────────────
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query as Record<string, string>;
    const { rows } = await pool.query('SELECT * FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), parseInt(offset)]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch posts' }); }
});

router.delete('/posts/:id', async (req: Request, res: Response) => {
  try { await pool.query('DELETE FROM posts WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed to delete post' }); }
});

// ── Products ──────────────────────────────────────────────────────────────────
function normalizeProduct(p: Record<string, unknown>): Record<string, unknown> {
  const out = { ...p };
  if (out.average_rating != null) out.average_rating = Number(out.average_rating) || 0;
  if (out.review_count != null)   out.review_count   = Number(out.review_count)   || 0;
  return out;
}

router.get('/products', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query as Record<string, string>;
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), parseInt(offset)]);
    res.json(rows.map(normalizeProduct));
  } catch { res.status(500).json({ error: 'Failed to fetch products' }); }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  try { await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch { res.status(500).json({ error: 'Failed to delete product' }); }
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query as Record<string, string>;
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2', [parseInt(limit), parseInt(offset)]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.email AS reporter_email FROM reports r LEFT JOIN users u ON u.id=r.reporter_id WHERE r.status='pending' ORDER BY r.created_at DESC LIMIT 100`,
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch reports' }); }
});

router.put('/reports/:id', async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  try {
    await pool.query('UPDATE reports SET status=$1,resolved_at=NOW() WHERE id=$2', [status, req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to update report' }); }
});

router.put('/users/:id/verify', async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE user_profiles SET is_verified=TRUE WHERE user_id=$1', [req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to verify user' }); }
});

// ── Revenue chart ─────────────────────────────────────────────────────────────
router.get('/stats/revenue', async (_req: Request, res: Response) => {
  try {
    const [daily, topSellers, topProducts] = await Promise.all([
      pool.query(`SELECT DATE(created_at) AS date, COUNT(*)::int AS order_count, COALESCE(SUM(total_price),0)::float AS revenue
                  FROM orders WHERE status IN ('paid','processing','completed') AND created_at > NOW()-INTERVAL '30 days'
                  GROUP BY DATE(created_at) ORDER BY date ASC`),
      pool.query(`SELECT u.id,u.full_name,u.email, COUNT(o.id)::int AS order_count, COALESCE(SUM(o.total_price),0)::float AS revenue
                  FROM orders o JOIN users u ON u.id=o.seller_id
                  WHERE o.status IN ('paid','processing','completed') AND o.created_at > NOW()-INTERVAL '30 days'
                  GROUP BY u.id,u.full_name,u.email ORDER BY revenue DESC LIMIT 10`),
      pool.query(`SELECT p.id,p.title,p.price,p.currency, COUNT(o.id)::int AS order_count, COALESCE(SUM(o.total_price),0)::float AS revenue
                  FROM orders o JOIN products p ON p.id=o.product_id
                  WHERE o.status IN ('paid','processing','completed') AND o.created_at > NOW()-INTERVAL '30 days'
                  GROUP BY p.id,p.title,p.price,p.currency ORDER BY revenue DESC LIMIT 10`),
    ]);
    res.json({ daily: daily.rows, top_sellers: topSellers.rows, top_products: topProducts.rows });
  } catch { res.status(500).json({ error: 'Failed to fetch revenue chart' }); }
});

// ── Audit Logs ──────────────────────────────────────────────────────────────
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { action, actor_id, entity_type, limit: rawLimit, offset: rawOffset } = req.query as Record<string,string>;
    const limit = Math.min(parseInt(rawLimit || '100', 10) || 100, 500);
    const offset = parseInt(rawOffset || '0', 10) || 0;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (action) { conditions.push(`action=$${idx++}`); params.push(action); }
    if (actor_id) { conditions.push(`actor_id=$${idx++}`); params.push(actor_id); }
    if (entity_type) { conditions.push(`entity_type=$${idx++}`); params.push(entity_type); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
    const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*)::int AS count FROM audit_logs ${where}`, params);
    res.json({ logs: rows, total: count, limit, offset });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch audit logs');
    apiError.serverError(res, 'Failed to fetch audit logs');
  }
});

module.exports = router;
