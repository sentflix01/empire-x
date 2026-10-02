import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { code, discount_type, discount_value, min_order, usage_limit, expires_at } = req.body as Record<string, unknown>;
  if (!code || !discount_type || discount_value == null) {
    res.status(400).json({ error: 'code, discount_type, and discount_value are required' }); return;
  }
  const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const value = Number(discount_value);
  const minimum = min_order == null ? 0 : Number(min_order);
  const limit = usage_limit == null ? null : Number(usage_limit);
  if (!/^[A-Z0-9_-]{2,40}$/.test(normalizedCode) || !['percentage', 'fixed'].includes(String(discount_type)) ||
      !Number.isFinite(value) || value <= 0 || (discount_type === 'percentage' && value > 100) ||
      !Number.isFinite(minimum) || minimum < 0 || (limit !== null && (!Number.isInteger(limit) || limit < 1))) {
    res.status(400).json({ error: 'Invalid coupon code, discount, minimum order, or usage limit' }); return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO coupons (seller_id,code,discount_type,discount_value,min_order,usage_limit,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user!.id, normalizedCode, discount_type, value, minimum, limit, expires_at ?? null],
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === '23505') { res.status(409).json({ error: 'Coupon code already exists' }); return; }
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

router.get('/mine', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM coupons WHERE seller_id=$1 ORDER BY created_at DESC', [req.user!.id]);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch coupons' }); }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { code, seller_id, order_total } = req.body as Record<string, unknown>;
  if (!code || !seller_id) { res.status(400).json({ error: 'code and seller_id are required' }); return; }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM coupons WHERE code=$1 AND seller_id=$2 AND is_active=TRUE AND (expires_at IS NULL OR expires_at > NOW()) AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      [(code as string).toUpperCase(), seller_id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Invalid or expired coupon code' }); return; }
    const coupon = rows[0] as Record<string, unknown>;
    if (order_total && coupon.min_order && Number(order_total) < Number(coupon.min_order)) {
      res.status(400).json({ error: `Minimum order of ${coupon.min_order} ETB required for this coupon` }); return;
    }
    const discount = coupon.discount_type === 'percentage'
      ? Number(order_total ?? 0) * (Number(coupon.discount_value) / 100)
      : Number(coupon.discount_value);
    res.json({ valid: true, coupon, discount: Math.min(discount, Number(order_total ?? discount)) });
  } catch { res.status(500).json({ error: 'Failed to validate coupon' }); }
});

router.post('/use', requireAuth, async (req: Request, res: Response) => {
  // Usage is recorded only after a verified payment webhook. A client-side
  // endpoint cannot prove an order was paid and allowed arbitrary counter bumps.
  res.status(410).json({ error: 'Coupon usage is recorded automatically after payment confirmation' });
});

router.patch('/:id/toggle', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT seller_id, is_active FROM coupons WHERE id=$1', [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Coupon not found' }); return; }
    if (rows[0].seller_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { rows: updated } = await pool.query('UPDATE coupons SET is_active=NOT is_active,updated_at=NOW() WHERE id=$1 RETURNING *', [req.params.id]);
    res.json(updated[0]);
  } catch { res.status(500).json({ error: 'Failed to toggle coupon' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT seller_id FROM coupons WHERE id=$1', [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Coupon not found' }); return; }
    if (rows[0].seller_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await pool.query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete coupon' }); }
});

module.exports = router;
