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
import { checkTierLimit } from '../middleware/tierLimit';
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
// varyByQuery ensures every distinct filter combo (seller_id, status, sort…)
// gets its own cache slot. varyByUser isolates realOnly/seed-filtered responses.
router.get('/', optionalAuth, cacheMiddleware('products:list', 90, { varyByQuery: true, varyByUser: true }), async (req: Request, res: Response) => {
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

// ── POST /bulk-import — Bulk import products (Premium+ tier) ───────────────────
router.post(
  '/bulk-import',
  requireAuth,
  checkTierLimit('bulk_import'),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as Request & { businessId?: string }).businessId!;
      if (!businessId) {
        res.status(404).json({ error: 'No business found for this user' });
        return;
      }

      const products = req.body as Array<Record<string, unknown>>;
      if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({ error: 'Request body must be a non-empty array of products' });
        return;
      }

      if (products.length > 1000) {
        res.status(400).json({ error: 'Maximum 1000 products per bulk import' });
        return;
      }

      const client = await pool.connect();
      let created = 0;
      const errors: Array<{ index: number; reason: string; data: Record<string, unknown> }> = [];

      try {
        await client.query('BEGIN');

        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          const { title, description, price, currency, stock, images, category, tags, status, sku, barcode, unit, cost_price, min_stock, max_stock, expiry_date, batch_number, manufacturer, supplier_id, weight_kg, dimensions_cm, tax_rate, is_prescription, controlled_substance, storage_condition, variant_of, is_bundle, bundle_components, attributes } = product as Record<string, unknown>;

          // Validation
          if (!title || typeof title !== 'string' || title.trim().length === 0) {
            errors.push({ index: i, reason: 'title is required and must be a non-empty string', data: product });
            continue;
          }
          if (price === undefined || price === null || price === '') {
            errors.push({ index: i, reason: 'price is required', data: product });
            continue;
          }
          const parsedPrice = parseFloat(String(price));
          if (isNaN(parsedPrice) || parsedPrice < 0) {
            errors.push({ index: i, reason: 'price must be a non-negative number', data: product });
            continue;
          }
          const curr = currency ? String(currency).toUpperCase() : 'ETB';
          if (curr.length !== 3) {
            errors.push({ index: i, reason: 'currency must be a 3-letter ISO code (e.g., ETB, USD)', data: product });
            continue;
          }

          const parsedStock = stock !== undefined && stock !== null && stock !== '' ? parseInt(String(stock), 10) : 0;
          if (isNaN(parsedStock) || parsedStock < 0) {
            errors.push({ index: i, reason: 'stock must be a non-negative integer', data: product });
            continue;
          }

          const parsedCostPrice = cost_price !== undefined && cost_price !== null && cost_price !== '' ? parseFloat(String(cost_price)) : null;
          if (cost_price !== undefined && cost_price !== null && cost_price !== '' && (isNaN(parsedCostPrice!) || parsedCostPrice! < 0)) {
            errors.push({ index: i, reason: 'cost_price must be a non-negative number', data: product });
            continue;
          }

          const parsedMinStock = min_stock !== undefined && min_stock !== null && min_stock !== '' ? parseInt(String(min_stock), 10) : 10;
          if (min_stock !== undefined && min_stock !== null && min_stock !== '' && (isNaN(parsedMinStock) || parsedMinStock < 0)) {
            errors.push({ index: i, reason: 'min_stock must be a non-negative integer', data: product });
            continue;
          }

          const parsedMaxStock = max_stock !== undefined && max_stock !== null && max_stock !== '' ? parseInt(String(max_stock), 10) : null;
          if (max_stock !== undefined && max_stock !== null && max_stock !== '' && (isNaN(parsedMaxStock!) || parsedMaxStock! < 0)) {
            errors.push({ index: i, reason: 'max_stock must be a non-negative integer', data: product });
            continue;
          }

          let parsedExpiryDate: string | null = null;
          if (expiry_date !== undefined && expiry_date !== null && expiry_date !== '') {
            const d = new Date(String(expiry_date));
            if (isNaN(d.getTime())) {
              errors.push({ index: i, reason: 'expiry_date must be a valid date (ISO 8601)', data: product });
              continue;
            }
            parsedExpiryDate = d.toISOString().split('T')[0];
          }

          const parsedWeight = weight_kg !== undefined && weight_kg !== null && weight_kg !== '' ? parseFloat(String(weight_kg)) : null;
          if (weight_kg !== undefined && weight_kg !== null && weight_kg !== '' && (isNaN(parsedWeight!) || parsedWeight! < 0)) {
            errors.push({ index: i, reason: 'weight_kg must be a non-negative number', data: product });
            continue;
          }

          let parsedDimensions: object | null = null;
          if (dimensions_cm !== undefined && dimensions_cm !== null) {
            try {
              parsedDimensions = typeof dimensions_cm === 'string' ? JSON.parse(dimensions_cm) : dimensions_cm;
            } catch {
              errors.push({ index: i, reason: 'dimensions_cm must be a valid JSON object', data: product });
              continue;
            }
          }

          let parsedBundleComponents: object | null = null;
          if (bundle_components !== undefined && bundle_components !== null) {
            try {
              parsedBundleComponents = typeof bundle_components === 'string' ? JSON.parse(bundle_components) : bundle_components;
            } catch {
              errors.push({ index: i, reason: 'bundle_components must be a valid JSON array', data: product });
              continue;
            }
          }

          let parsedAttributes: object | null = null;
          if (attributes !== undefined && attributes !== null) {
            try {
              parsedAttributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
            } catch {
              errors.push({ index: i, reason: 'attributes must be a valid JSON object', data: product });
              continue;
            }
          }

          const parsedIsPrescription = is_prescription === true || is_prescription === 'true';
          const parsedControlledSubstance = controlled_substance === true || controlled_substance === 'true';
          const parsedIsBundle = is_bundle === true || is_bundle === 'true';
          const parsedVariantOf = variant_of !== undefined && variant_of !== null && variant_of !== '' ? String(variant_of) : null;
          const parsedSupplierId = supplier_id !== undefined && supplier_id !== null && supplier_id !== '' ? String(supplier_id) : null;
          const parsedSku = sku !== undefined && sku !== null && sku !== '' ? String(sku).trim() : null;
          const parsedBarcode = barcode !== undefined && barcode !== null && barcode !== '' ? String(barcode).trim() : null;
          const parsedUnit = unit !== undefined && unit !== null && unit !== '' ? String(unit) : 'pcs';
          const parsedManufacturer = manufacturer !== undefined && manufacturer !== null && manufacturer !== '' ? String(manufacturer) : null;
          const parsedStorageCondition = storage_condition !== undefined && storage_condition !== null && storage_condition !== '' ? String(storage_condition) : null;

          const prodStatus = status !== undefined && status !== null && status !== '' ? String(status) : 'active';
          const validStatuses = ['active', 'sold_out', 'draft', 'archived'];
          if (!validStatuses.includes(prodStatus)) {
            errors.push({ index: i, reason: `status must be one of: ${validStatuses.join(', ')}`, data: product });
            continue;
          }

          // Insert product
          await client.query(
            `INSERT INTO products
               (seller_id, business_id, title, description, price, currency, stock, images, category, tags, status,
                sku, barcode, unit, cost_price, min_stock, max_stock, expiry_date, batch_number, manufacturer,
                supplier_id, weight_kg, dimensions_cm, is_prescription, controlled_substance,
                storage_condition, variant_of, is_bundle, bundle_components, attributes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)`,
            [
              req.user!.id,
              businessId,
              title.trim(),
              description !== undefined && description !== null ? String(description) : null,
              parsedPrice,
              curr,
              parsedStock,
              images !== undefined && images !== null && images !== '' ? String(images) : null,
              category !== undefined && category !== null && category !== '' ? String(category) : null,
              tags !== undefined && tags !== null && tags !== '' ? String(tags) : null,
              prodStatus,
              parsedSku,
              parsedBarcode,
              parsedUnit,
              parsedCostPrice,
              parsedMinStock,
              parsedMaxStock,
              parsedExpiryDate,
              batch_number !== undefined && batch_number !== null && batch_number !== '' ? String(batch_number) : null,
              parsedManufacturer,
              parsedSupplierId,
              parsedWeight,
              parsedDimensions ? JSON.stringify(parsedDimensions) : null,
              parsedIsPrescription,
              parsedControlledSubstance,
              parsedStorageCondition,
              parsedVariantOf,
              parsedIsBundle,
              parsedBundleComponents ? JSON.stringify(parsedBundleComponents) : null,
              parsedAttributes ? JSON.stringify(parsedAttributes) : null,
            ],
          );

          created++;
        }

        await client.query('COMMIT');
        await invalidateCache('products:list').catch(() => undefined);
        res.json({ created, errors });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        logger.error({ err: (err as Error).message }, 'Bulk import failed');
        res.status(500).json({ error: 'Failed to process bulk import' });
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error({ err: (err as Error).message }, 'Bulk import setup failed');
      res.status(500).json({ error: 'Failed to process bulk import' });
    }
  }
);

module.exports = router;
