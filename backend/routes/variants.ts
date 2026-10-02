import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/product/:productId', optionalAuth, async (req: Request, res: Response) => {
  try {
    if (req.realOnly) {
      const { rows: products } = await pool.query(
        'SELECT id FROM products WHERE id=$1 AND seller_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)',
        [req.params.productId],
      );
      if (!products.length) { res.status(404).json({ error: 'Product not found' }); return; }
    }
    const { rows } = await pool.query('SELECT * FROM product_variants WHERE product_id=$1 ORDER BY name, value', [req.params.productId]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch variants' }); }
});

router.post('/product/:productId', requireAuth, async (req: Request, res: Response) => {
  const { name, value, price, stock, sku } = req.body as Record<string, unknown>;
  if (!name || !value) { res.status(400).json({ error: 'name and value are required' }); return; }
  try {
    const { rows: products } = await pool.query('SELECT seller_id FROM products WHERE id=$1', [req.params.productId]);
    if (!products.length) { res.status(404).json({ error: 'Product not found' }); return; }
    if (products[0].seller_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { rows } = await pool.query(
      `INSERT INTO product_variants (product_id,name,value,price,stock,sku) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.productId, name, value, price ?? null, stock ?? 0, sku ?? null],
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to add variant' }); }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const { name, value, price, stock, sku } = req.body as Record<string, unknown>;
  try {
    const { rows } = await pool.query(
      `UPDATE product_variants SET name=COALESCE($1,name),value=COALESCE($2,value),price=$3,stock=COALESCE($4,stock),sku=$5,updated_at=NOW() WHERE id=$6 RETURNING *`,
      [name ?? null, value ?? null, price ?? null, stock ?? null, sku ?? null, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Variant not found' }); return; }
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to update variant' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM product_variants WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete variant' }); }
});

module.exports = router;
