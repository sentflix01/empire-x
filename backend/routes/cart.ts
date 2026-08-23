import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT ci.*, p.title, p.price, p.currency, p.images, p.stock, p.seller_id
       FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.user_id=$1 ORDER BY ci.created_at DESC`,
      [req.user!.id],
    );
    const total = rows.reduce((sum, i) => sum + parseFloat(i.price as string) * (i.quantity as number), 0);
    res.json({ items: rows, total, count: rows.length });
  } catch { res.status(500).json({ error: 'Failed to fetch cart' }); }
});

router.post('/add', requireAuth, async (req: Request, res: Response) => {
  const { product_id, quantity = 1 } = req.body as { product_id?: string; quantity?: number };
  if (!product_id) { res.status(400).json({ error: 'product_id is required' }); return; }
  try {
    const { rows: products } = await pool.query('SELECT * FROM products WHERE id=$1', [product_id]);
    if (!products.length) { res.status(404).json({ error: 'Product not found' }); return; }
    const product = products[0] as Record<string, unknown>;
    if (product.stock !== null && Number(product.stock) < quantity) {
      res.status(400).json({ error: `Only ${product.stock} in stock` }); return;
    }
    const { rows } = await pool.query(
      `INSERT INTO cart_items (user_id,product_id,quantity) VALUES ($1,$2,$3) ON CONFLICT (user_id,product_id) DO UPDATE SET quantity=cart_items.quantity+$3,updated_at=NOW() RETURNING *`,
      [req.user!.id, product_id, quantity],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Add to cart error');
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.put('/:itemId', requireAuth, async (req: Request, res: Response) => {
  const { quantity } = req.body as { quantity?: number };
  if (!quantity || quantity < 1) { res.status(400).json({ error: 'quantity must be >= 1' }); return; }
  try {
    const { rows } = await pool.query(
      'UPDATE cart_items SET quantity=$1,updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *',
      [quantity, req.params.itemId, req.user!.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Cart item not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to update cart' }); }
});

router.delete('/:itemId', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [req.params.itemId, req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to remove from cart' }); }
});

router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id=$1', [req.user!.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to clear cart' }); }
});

module.exports = router;
