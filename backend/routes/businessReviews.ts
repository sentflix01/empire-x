/**
 * routes/businessReviews.ts — Reviews of a business by verified customers.
 *
 * Mounted at /api/businesses/:businessId/reviews. Decision 2026-11-12
 * "Business reviews: verified customers only":
 *   - only a signed-in buyer with a completed order from the business may
 *     review it; one review each (sending again edits it); owners cannot;
 *   - the business's average_rating and review_count are recalculated from
 *     visible reviews in the same transaction;
 *   - reviews can be reported (target_type 'business_review') and an admin
 *     can hide or show them.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import pool from '../db/pool';
import logger from '../lib/logger';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth';
import { getBusinessSubscriptionAccess } from '../lib/businessSubscriptionPolicy';
import { businessViewGate, rejectViewGate } from '../lib/siteVisibility';
import { uuidParams } from '../lib/uuidParams';

const router = Router({ mergeParams: true });
uuidParams(router, ['businessId', 'reviewId']);

const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, skip: () => process.env.NODE_ENV === 'test',
  // Runs after requireAuth, so every request has a user.
  keyGenerator: (req) => `user:${(req as Request).user?.id ?? 'anon'}`,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many reviews. Try again later.' },
});

const REVIEW_COLUMNS = `r.id, r.business_id, r.reviewer_id, r.rating, r.comment, r.created_at, r.updated_at,
  (SELECT up.display_name FROM user_profiles up WHERE up.user_id = r.reviewer_id ORDER BY up.created_at LIMIT 1) AS reviewer_name,
  (SELECT up.avatar_url FROM user_profiles up WHERE up.user_id = r.reviewer_id ORDER BY up.created_at LIMIT 1) AS reviewer_avatar`;

type Queryable = { query: typeof pool.query };

async function recalculate(db: Queryable, businessId: string): Promise<{ average_rating: number; review_count: number }> {
  const { rows: [r] } = await db.query(
    `UPDATE businesses SET
       average_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM business_reviews WHERE business_id = $1 AND status = 'visible'), 0),
       review_count = (SELECT COUNT(*) FROM business_reviews WHERE business_id = $1 AND status = 'visible')
     WHERE id = $1 RETURNING average_rating, review_count`,
    [businessId],
  );
  return { average_rating: Number(r?.average_rating ?? 0), review_count: Number(r?.review_count ?? 0) };
}

/** The viewer's completed order from this business, if any. */
async function completedOrder(userId: string, businessId: string): Promise<string | null> {
  const { rows } = await pool.query(
    "SELECT id FROM orders WHERE buyer_id = $1 AND business_id = $2 AND status = 'completed' ORDER BY updated_at DESC LIMIT 1",
    [userId, businessId],
  );
  return rows[0]?.id ?? null;
}

// Anyone who may see the business may read its visible reviews.
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const { businessId } = req.params;
  try {
    const access = await getBusinessSubscriptionAccess(businessId);
    const isOwner = !!req.user && access?.ownerId === req.user.id;
    if (!isOwner && rejectViewGate(res, businessViewGate(access, req), 'Business not found')) return;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset), 10) || 0, 0);
    const [{ rows }, { rows: [summary] }] = await Promise.all([
      pool.query(`SELECT ${REVIEW_COLUMNS} FROM business_reviews r WHERE r.business_id = $1 AND r.status = 'visible' ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`, [businessId, limit, offset]),
      pool.query('SELECT average_rating, review_count FROM businesses WHERE id = $1', [businessId]),
    ]);
    res.json({
      reviews: rows,
      average_rating: Number(summary?.average_rating ?? 0),
      review_count: Number(summary?.review_count ?? 0),
      next_offset: rows.length === limit ? offset + limit : null,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'List business reviews failed');
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// Whether the signed-in viewer may review, and their current review.
router.get('/mine', requireAuth, async (req: Request, res: Response) => {
  const { businessId } = req.params;
  try {
    const [{ rows: [biz] }, { rows: [mine] }] = await Promise.all([
      pool.query('SELECT owner_id FROM businesses WHERE id = $1', [businessId]),
      pool.query(`SELECT ${REVIEW_COLUMNS} FROM business_reviews r WHERE r.business_id = $1 AND r.reviewer_id = $2`, [businessId, req.user!.id]),
    ]);
    if (!biz) { res.status(404).json({ error: 'Business not found' }); return; }
    const isOwner = biz.owner_id === req.user!.id;
    const orderId = isOwner ? null : await completedOrder(req.user!.id, businessId);
    res.json({ can_review: !isOwner && !!orderId, reason: isOwner ? 'owner' : orderId ? null : 'no_completed_order', review: mine ?? null });
  } catch {
    res.status(500).json({ error: 'Failed to check review status' });
  }
});

router.post('/', requireAuth, writeLimiter, async (req: Request, res: Response) => {
  const { businessId } = req.params;
  const rating = Number((req.body as Record<string, unknown>)?.rating);
  const rawComment = (req.body as Record<string, unknown>)?.comment;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) { res.status(422).json({ error: 'rating must be a whole number from 1 to 5' }); return; }
  if (rawComment !== undefined && rawComment !== null && typeof rawComment !== 'string') { res.status(422).json({ error: 'comment must be text' }); return; }
  const comment = typeof rawComment === 'string' && rawComment.trim() ? rawComment.trim() : null;
  if (comment && comment.length > 1000) { res.status(422).json({ error: 'comment must be at most 1000 characters' }); return; }
  try {
    const { rows: [biz] } = await pool.query('SELECT owner_id FROM businesses WHERE id = $1', [businessId]);
    if (!biz) { res.status(404).json({ error: 'Business not found' }); return; }
    if (biz.owner_id === req.user!.id) { res.status(403).json({ error: 'You cannot review your own business', code: 'OWN_BUSINESS' }); return; }
    const orderId = await completedOrder(req.user!.id, businessId);
    if (!orderId) {
      res.status(403).json({ error: 'Only customers with a completed order can review this business', code: 'NO_COMPLETED_ORDER' });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [review] } = await client.query(
        `INSERT INTO business_reviews (business_id, reviewer_id, order_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (business_id, reviewer_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, order_id = EXCLUDED.order_id, updated_at = NOW()
         RETURNING id, business_id, reviewer_id, rating, comment, status, created_at, updated_at, (xmax = 0) AS created`,
        [businessId, req.user!.id, orderId, rating, comment],
      );
      const summary = await recalculate(client, businessId);
      await client.query('COMMIT');
      const { created, ...rest } = review;
      res.status(created ? 201 : 200).json({ review: rest, ...summary });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Save business review failed');
    res.status(500).json({ error: 'Failed to save review' });
  }
});

router.delete('/:reviewId', requireAuth, async (req: Request, res: Response) => {
  const { businessId, reviewId } = req.params;
  try {
    const { rows: [review] } = await pool.query('SELECT reviewer_id FROM business_reviews WHERE id = $1 AND business_id = $2', [reviewId, businessId]);
    if (!review) { res.status(404).json({ error: 'Review not found' }); return; }
    if (review.reviewer_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await pool.query('DELETE FROM business_reviews WHERE id = $1', [reviewId]);
    res.json({ deleted: true, ...(await recalculate(pool, businessId)) });
  } catch {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Moderators hide a reported review (or show it again).
router.put('/:reviewId/status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { businessId, reviewId } = req.params;
  const status = (req.body as Record<string, unknown>)?.status;
  if (status !== 'visible' && status !== 'hidden') { res.status(422).json({ error: "status must be 'visible' or 'hidden'" }); return; }
  try {
    const { rowCount } = await pool.query('UPDATE business_reviews SET status = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3', [status, reviewId, businessId]);
    if (!rowCount) { res.status(404).json({ error: 'Review not found' }); return; }
    res.json({ status, ...(await recalculate(pool, businessId)) });
  } catch {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

module.exports = router;
