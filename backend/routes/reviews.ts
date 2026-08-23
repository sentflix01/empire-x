import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { product_id, reviewer_id, sort = '-created_at', limit = '50' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (product_id)  { params.push(product_id);  conditions.push(`r.product_id=$${params.length}`); }
    if (reviewer_id) { params.push(reviewer_id); conditions.push(`r.reviewer_id=$${params.length}`); }
    const where    = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortDesc = sort.startsWith('-');
    const sortRaw  = sort.replace(/^-/, '').replace(/[^a-z0-9_]/gi, '') || 'created_at';
    params.push(Math.min(parseInt(limit) || 50, 200));
    const { rows } = await pool.query(
      `SELECT r.*, up.display_name, up.avatar_url FROM reviews r LEFT JOIN user_profiles up ON up.user_id=r.reviewer_id
       ${where} ORDER BY r.${sortRaw} ${sortDesc ? 'DESC' : 'ASC'} LIMIT $${params.length}`,
      params,
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch reviews' }); }
});

router.get('/product/:productId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, up.display_name, up.avatar_url FROM reviews r LEFT JOIN user_profiles up ON up.user_id=r.reviewer_id WHERE r.product_id=$1 ORDER BY r.created_at DESC`,
      [req.params.productId],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch reviews' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { product_id, order_id, rating, comment } = req.body as Record<string, unknown>;
  if (!product_id || rating == null) { res.status(400).json({ error: 'product_id and rating are required' }); return; }
  if (Number(rating) < 1 || Number(rating) > 5) { res.status(400).json({ error: 'Rating must be between 1 and 5' }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (product_id, order_id, reviewer_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (product_id, reviewer_id)
       DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment, updated_at=NOW() RETURNING *`,
      [product_id, order_id ?? null, req.user!.id, rating, comment ?? null],
    );
    await pool.query(
      `UPDATE products SET average_rating=(SELECT AVG(rating) FROM reviews WHERE product_id=$1), review_count=(SELECT COUNT(*) FROM reviews WHERE product_id=$1) WHERE id=$1`,
      [product_id],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create review error');
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT reviewer_id, product_id FROM reviews WHERE id=$1', [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Review not found' }); return; }
    if (rows[0].reviewer_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await pool.query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
    await pool.query(
      `UPDATE products SET average_rating=COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id=$1),0), review_count=(SELECT COUNT(*) FROM reviews WHERE product_id=$1) WHERE id=$1`,
      [rows[0].product_id],
    );
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete review' }); }
});

module.exports = router;
