import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id,w.created_at,p.id AS product_id,p.title,p.price,p.currency,p.images,p.stock,p.seller_id
       FROM wishlists w JOIN products p ON p.id=w.product_id WHERE w.user_id=$1 ORDER BY w.created_at DESC`,
      [req.user!.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch wishlist' }); }
});

router.get('/check/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT id FROM wishlists WHERE user_id=$1 AND product_id=$2', [req.user!.id, req.params.productId]);
    res.json({ wishlisted: rows.length > 0 });
  } catch { res.json({ wishlisted: false }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { product_id } = req.body as { product_id?: string };
  if (!product_id) { res.status(400).json({ error: 'product_id is required' }); return; }
  try {
    await pool.query(`INSERT INTO wishlists (user_id,product_id) VALUES ($1,$2) ON CONFLICT (user_id,product_id) DO NOTHING`, [req.user!.id, product_id]);
    res.status(201).json({ wishlisted: true });
  } catch { res.status(500).json({ error: 'Failed to add to wishlist' }); }
});

router.delete('/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM wishlists WHERE user_id=$1 AND product_id=$2', [req.user!.id, req.params.productId]);
    res.json({ wishlisted: false });
  } catch { res.status(500).json({ error: 'Failed to remove from wishlist' }); }
});

// ── Price Alerts ──────────────────────────────────────────────────────────────

router.get('/price-alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT pa.*,p.title,p.price AS current_price,p.currency,p.images FROM price_alerts pa JOIN products p ON p.id=pa.product_id WHERE pa.user_id=$1 ORDER BY pa.created_at DESC`,
      [req.user!.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch price alerts' }); }
});

router.post('/price-alerts', requireAuth, async (req: Request, res: Response) => {
  const { product_id, target_price } = req.body as { product_id?: string; target_price?: number };
  if (!product_id || target_price == null) { res.status(400).json({ error: 'product_id and target_price are required' }); return; }
  if (parseFloat(String(target_price)) <= 0) { res.status(400).json({ error: 'target_price must be positive' }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO price_alerts (user_id,product_id,target_price,is_triggered) VALUES ($1,$2,$3,FALSE) ON CONFLICT (user_id,product_id) DO UPDATE SET target_price=EXCLUDED.target_price,is_triggered=FALSE RETURNING *`,
      [req.user!.id, product_id, parseFloat(String(target_price))],
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to set price alert' }); }
});

router.delete('/price-alerts/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM price_alerts WHERE user_id=$1 AND product_id=$2', [req.user!.id, req.params.productId]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete price alert' }); }
});

module.exports = router;
