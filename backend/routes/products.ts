/**
 * routes/products.ts — Marketplace products
 *
 * Phase improvements:
 *   - Keyset cursor pagination (no OFFSET)
 *   - Bulk price-alert notifications (Task 9: N+1 fix)
 *   - Low-stock alerts via atomicWalletOp-free notification path
 *   - Price-drop alerts bulk INSERT replacing sequential loop
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';

const router = Router();
const LOW_STOCK_THRESHOLD = 5;

function normalizeProduct(p: Record<string,unknown>): Record<string,unknown> {
  const out = { ...p };
  if (out.average_rating != null) out.average_rating = Number(out.average_rating) || 0;
  if (out.review_count != null)   out.review_count   = Number(out.review_count)   || 0;
  return out;
}

// ── GET /api/products — keyset cursor pagination ──────────────────────────────
router.get('/', optionalAuth, cacheMiddleware('products:list', 90), async (req: Request, res: Response) => {
  try {
    const { seller_id, business_id, showroom_id, status, sort='-created_at', limit='24', cursor } = req.query as Record<string,string>;
    const lim = Math.min(parseInt(limit)||24, 100);
    const cursorTs = cursor ? new Date(cursor) : new Date();
    if (isNaN(cursorTs.getTime())) { res.status(400).json({ error: 'Invalid cursor value' }); return; }

    const realJoin = req.realOnly ? 'JOIN users u ON u.id=p.seller_id' : '';
    const realCond = req.realOnly ? 'AND u.is_seed=FALSE' : '';
    const conditions = [`p.created_at < $1`];
    const values: unknown[] = [cursorTs];

    if (seller_id)   { values.push(seller_id);   conditions.push(`p.seller_id=$${values.length}`); }
    if (business_id) { values.push(business_id); conditions.push(`p.business_id=$${values.length}`); }
    if (showroom_id) { values.push(showroom_id); conditions.push(`p.showroom_id=$${values.length}`); }
    if (status)      { values.push(status);      conditions.push(`p.status=$${values.length}`); }

    const SAFE_SORT: Record<string,string> = {
      '-created_at':'p.created_at DESC', 'created_at':'p.created_at ASC',
      '-price':'p.price DESC', 'price':'p.price ASC', '-view_count':'p.view_count DESC',
    };
    const orderBy = SAFE_SORT[sort] ?? 'p.created_at DESC';
    values.push(lim);

    const { rows } = await pool.query(
      `SELECT p.* FROM products p ${realJoin} WHERE ${conditions.join(' AND ')} ${realCond} ORDER BY ${orderBy} LIMIT $${values.length}`,
      values,
    );
    const products = rows.map(normalizeProduct);
    res.json({ products, next_cursor: products.length===lim ? products[products.length-1].created_at : null });
  } catch { res.status(500).json({ error: 'Failed to fetch products' }); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const product = await getRecord('products', req.params.id);
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    await pool.query('UPDATE products SET view_count=view_count+1 WHERE id=$1', [req.params.id]).catch(()=>undefined);
    res.json(normalizeProduct(product as Record<string,unknown>));
  } catch { res.status(500).json({ error: 'Failed to fetch product' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { title, price } = req.body as Record<string,unknown>;
  if (!title || price==null) { res.status(400).json({ error: 'title and price are required' }); return; }
  try {
    const product = await createRecord('products', { ...(req.body as Record<string,unknown>), seller_id: req.user!.id });
    await invalidateCache('products:list').catch(()=>undefined);
    res.status(201).json(normalizeProduct(product as Record<string,unknown>));
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create product error');
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<Record<string,unknown>>('products', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }
    if (existing.seller_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }

    const updated = await updateRecord('products', req.params.id, req.body as Record<string,unknown>);
    if (!updated) { res.status(404).json({ error: 'Product not found' }); return; }
    await invalidateCache('products:list').catch(()=>undefined);

    // Low-stock alert
    const body = req.body as Record<string,unknown>;
    if (body.stock != null) {
      const prev = parseInt(String(existing.stock ?? '0'), 10);
      const next = parseInt(String(body.stock), 10);
      if (prev > LOW_STOCK_THRESHOLD && next <= LOW_STOCK_THRESHOLD && next >= 0) {
        pool.query(
          `INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order',$2,$3,$4,false) RETURNING *`,
          [existing.seller_id, `⚠️ Low stock: ${existing.title}`, `Only ${next} unit${next!==1?'s':''} left.`, `/products/edit?id=${req.params.id}`],
        ).then(({rows:[notif]}) => {
          emitNotification(existing.seller_id as string, notif as Record<string,unknown>);
          sendPushToUser(existing.seller_id as string, `⚠️ Low stock: ${existing.title}`, `Only ${next} left.`, `/products/edit?id=${req.params.id}`).catch(()=>undefined);
        }).catch(()=>undefined);
      }
    }

    // Price-drop alerts — BULK INSERT replacing N+1 sequential loop (Task 9)
    if (body.price != null && parseFloat(String(body.price)) < parseFloat(String(existing.price))) {
      const newPrice = parseFloat(String(body.price));
      pool.query(
        `SELECT id, user_id, target_price FROM price_alerts WHERE product_id=$1 AND is_triggered=FALSE AND target_price>=$2`,
        [req.params.id, newPrice],
      ).then(async ({ rows: alerts }) => {
        if (!alerts.length) return;
        // Bulk mark triggered
        const alertIds = alerts.map((a: Record<string,unknown>) => a.id);
        await pool.query('UPDATE price_alerts SET is_triggered=TRUE WHERE id=ANY($1::uuid[])', [alertIds]);
        // Bulk INSERT notifications
        const userIds = alerts.map((a: Record<string,unknown>) => a.user_id as string);
        const values = userIds.flatMap((uid, i) => [
          uid, `🏷️ Price drop! ${existing.title}`,
          `Price dropped to ${newPrice.toLocaleString()} ${String(existing.currency ?? 'ETB')} — your target was ${alerts[i].target_price}`,
          `/products/${req.params.id}`, 'order',
        ]);
        const placeholders = userIds.map((_,i) => `($${i*5+1},$${i*5+5},$${i*5+2},$${i*5+3},$${i*5+4},false)`).join(',');
        const { rows: notifs } = await pool.query(
          `INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ${placeholders} RETURNING *`,
          values,
        );
        for (const notif of notifs) {
          emitNotification(notif.user_id as string, notif as Record<string,unknown>);
          sendPushToUser(notif.user_id as string, notif.title as string, notif.body as string, `/products/${req.params.id}`).catch(()=>undefined);
        }
      }).catch((err: Error) => logger.error({ err: err.message }, 'Price alert bulk notification failed'));
    }

    res.json(normalizeProduct(updated as Record<string,unknown>));
  } catch { res.status(500).json({ error: 'Failed to update product' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{ seller_id: string }>('products', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }
    if (existing.seller_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('products', req.params.id);
    await invalidateCache('products:list').catch(()=>undefined);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete product' }); }
});

module.exports = router;
