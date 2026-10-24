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
import { getBusinessSubscriptionAccess } from '../lib/businessSubscriptionPolicy';
import { businessViewGate, productNotPrivateSql, rejectViewGate } from '../lib/siteVisibility';
import rateLimit from 'express-rate-limit';
import { parseProductCode } from '../lib/barcode';
import { gtinVariants, importProductImage, lookupBarcode } from '../lib/productLookup';
import { checkoutReadiness, resolveProductBusiness, soleBusinessOf } from '../lib/productBusiness';

const router = Router();
const LOW_STOCK_THRESHOLD = 5;

function normalizeProduct(p: Record<string,unknown>): Record<string,unknown> {
  const out = { ...p };
  if (out.average_rating != null) out.average_rating = Number(out.average_rating) || 0;
  if (out.review_count != null)   out.review_count   = Number(out.review_count)   || 0;
  return out;
}

function publicProduct(p: Record<string, unknown>): Record<string, unknown> {
  const out = normalizeProduct(p);
  for (const key of ['cost_price', 'supplier_id', 'batch_number', 'variant_of']) delete out[key];
  return out;
}

const PRODUCT_FIELDS = [
  'title', 'description', 'price', 'currency', 'stock', 'images', 'category', 'tags',
  'status', 'business_id', 'showroom_id', 'barcode', 'manufacturer', 'unit',
] as const;

/** A barcode as stored (13-digit GTIN when it is one), or null; throws 422 text for junk. */
function normaliseBarcode(raw: unknown): string | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const code = parseProductCode(raw);
  if (!code || code.kind !== 'gtin') throw Object.assign(new Error('barcode must be a valid product barcode (EAN/UPC)'), { status: 422 });
  return code.gtin;
}

/** The seller's product that already has this barcode (one barcode = one product per seller). */
async function ownProductWithBarcode(sellerId: string, gtin: string, exceptId?: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT id FROM products WHERE seller_id=$1 AND barcode = ANY($2::text[]) AND status <> 'archived' AND ($3::uuid IS NULL OR id <> $3) LIMIT 1`,
    [sellerId, gtinVariants(gtin), exceptId ?? null],
  );
  return rows[0]?.id ?? null;
}

function pickProductFields(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(PRODUCT_FIELDS.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
}

// ── GET /api/products — keyset cursor pagination ──────────────────────────────
// varyByQuery ensures every distinct filter combo (seller_id, status, search…)
// gets its own cache slot. varyByUser isolates realOnly/seed-filtered responses.
router.get('/', optionalAuth, cacheMiddleware('products:list', 90, { varyByQuery: true, varyByUser: true }), async (req: Request, res: Response) => {
  try {
    const { seller_id, business_id, showroom_id, status, category, search, sort='-created_at', limit='24', cursor } = req.query as Record<string,string>;
    if ((search !== undefined && typeof search !== 'string') || (category !== undefined && typeof category !== 'string')) {
      res.status(400).json({ error: 'search and category must be single values' }); return;
    }
    const searchTerm = typeof search === 'string' ? search.trim() : '';
    const categoryFilter = typeof category === 'string' ? category.trim() : '';
    if (searchTerm.length > 100 || categoryFilter.length > 80) {
      res.status(400).json({ error: 'search must be at most 100 characters and category at most 80 characters' }); return;
    }
    const lim = Math.min(parseInt(limit)||24, 100);
    const safeSorts: Record<string, { column: string; order: string; direction: '<' | '>'; kind: 'date' | 'number' }> = {
      '-created_at': { column: 'p.created_at', order: 'p.created_at DESC,p.id DESC', direction: '<', kind: 'date' },
      'created_at': { column: 'p.created_at', order: 'p.created_at ASC,p.id ASC', direction: '>', kind: 'date' },
      '-price': { column: 'p.price', order: 'p.price DESC,p.id DESC', direction: '<', kind: 'number' },
      'price': { column: 'p.price', order: 'p.price ASC,p.id ASC', direction: '>', kind: 'number' },
      '-view_count': { column: 'p.view_count', order: 'p.view_count DESC,p.id DESC', direction: '<', kind: 'number' },
    };
    const sortConfig = safeSorts[sort] ?? safeSorts['-created_at'];
    const sortKey = safeSorts[sort] ? sort : '-created_at';
    const cursorParts = cursor?.split('|') ?? [];
    const cursorSort = cursorParts.length === 3 ? cursorParts[0] : '-created_at';
    const cursorValueText = cursorParts.length === 3 ? cursorParts[1] : cursorParts[0];
    const cursorId = cursorParts.length >= 2 ? cursorParts.at(-1) : undefined;
    if (cursor && cursorParts.length === 3 && cursorSort !== sortKey) { res.status(400).json({ error: 'Cursor does not match requested sort order' }); return; }
    const cursorValue = sortConfig.kind === 'date' ? cursorValueText : Number(cursorValueText);
    const invalidCursorValue = sortConfig.kind === 'date'
      ? Number.isNaN(new Date(cursorValueText).getTime())
      : !Number.isFinite(Number(cursorValueText));
    if (cursor && invalidCursorValue) {
      res.status(400).json({ error: 'Invalid cursor value' }); return;
    }

    const realJoin = req.realOnly ? 'JOIN users u ON u.id=p.seller_id' : '';
    const realCond = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const validCursorId = !!cursorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursorId);
    if (cursorId && !validCursorId) { res.status(400).json({ error: 'Invalid cursor value' }); return; }
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (cursor && validCursorId) {
      values.push(cursorValue, cursorId);
      conditions.push(`(${sortConfig.column},p.id) ${sortConfig.direction} ($1,$2::uuid)`);
    } else if (cursor && sortConfig.kind === 'date') {
      values.push(cursorValue);
      conditions.push(`${sortConfig.column} < $1`);
    } else {
      conditions.push('p.created_at <= NOW()');
    }

    if (seller_id)   { values.push(seller_id);   conditions.push(`p.seller_id=$${values.length}`); }
    if (business_id) { values.push(business_id); conditions.push(`p.business_id=$${values.length}`); }
    if (showroom_id) { values.push(showroom_id); conditions.push(`p.showroom_id=$${values.length}`); }
    // Drafts are private. Only a seller explicitly viewing their own listings
    // (or an admin) may request them; public feeds include active and sold-out.
    const mayViewDrafts = req.user?.role === 'admin' || (!!seller_id && seller_id === req.user?.id);
    if (!mayViewDrafts) conditions.push("p.status IN ('active','sold_out')");
    if (req.realOnly && seller_id !== req.user?.id) {
      conditions.push(`((p.business_id IS NULL AND p.showroom_id IS NULL) OR EXISTS (
        SELECT 1 FROM business_subscriptions paid_sub
        WHERE paid_sub.business_id=COALESCE(p.business_id,(SELECT s.business_id FROM showrooms s WHERE s.id=p.showroom_id))
          AND paid_sub.tier <> 'freemium'
          AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours'
      ))`);
    }
    // Private businesses are for signed-in users only (decision §7).
    if (!req.user) conditions.push(productNotPrivateSql('p'));
    if (status)      { values.push(status);      conditions.push(`p.status=$${values.length}`); }
    if (categoryFilter) {
      values.push(categoryFilter);
      conditions.push(`LOWER(p.category)=LOWER($${values.length})`);
    }
    if (searchTerm) {
      const searchPattern = `%${searchTerm.replace(/[\\%_]/g, '\\$&')}%`;
      values.push(searchPattern);
      const searchParam = `$${values.length}`;
      conditions.push(`(p.title ILIKE ${searchParam} ESCAPE E'\\\\' OR p.description ILIKE ${searchParam} ESCAPE E'\\\\' OR p.category ILIKE ${searchParam} ESCAPE E'\\\\')`);
    }

    const orderBy = sortConfig.order;
    values.push(lim);

    const { rows } = await pool.query(
      `SELECT p.*, to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS __cursor_created_at
       FROM products p ${realJoin} WHERE ${conditions.join(' AND ')} ${realCond} ORDER BY ${orderBy} LIMIT $${values.length}`,
      values,
    );
    const products = rows.map(product => {
      const visibleProduct = (!!req.user?.id && product.seller_id === req.user.id) || req.user?.role === 'admin'
        ? normalizeProduct(product)
        : publicProduct(product);
      delete visibleProduct.__cursor_created_at;
      return visibleProduct;
    });
    const lastProduct = rows.at(-1) as Record<string, unknown> | undefined;
    res.json({
      products,
      next_cursor: rows.length === lim && lastProduct
        ? `${sortKey}|${sortConfig.kind === 'date' ? String(lastProduct.__cursor_created_at ?? lastProduct.created_at) : String(lastProduct[sortKey === '-price' || sortKey === 'price' ? 'price' : 'view_count'])}|${String(lastProduct.id)}`
        : null,
    });
  } catch { res.status(500).json({ error: 'Failed to fetch products' }); }
});

router.get('/mine', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE seller_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.user!.id],
    );
    res.json({ products: rows.map(normalizeProduct) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to fetch seller inventory');
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// ── Scan to add products ─────────────────────────────────────────────────────
const scanLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60, skip: () => process.env.NODE_ENV === 'test', standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many scans. Wait a moment and try again.' },
});

/** What a scanned code is: mine → Add stock; NodBusiness catalogue; open databases; not found. */
router.get('/lookup/:code', requireAuth, scanLimiter, async (req: Request, res: Response) => {
  const code = parseProductCode(req.params.code);
  if (!code) { res.status(422).json({ error: 'invalid_code', message: 'That code is empty or too long.' }); return; }
  if (code.kind === 'text') { res.json({ kind: 'text', text: code.text, message: 'This QR code isn’t a product barcode.' }); return; }
  try {
    res.set('Cache-Control', 'private, no-store');
    res.json({ kind: 'gtin', ...(await lookupBarcode(req.user!.id, code.gtin)) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'barcode lookup failed');
    res.status(500).json({ error: 'Could not look up this barcode' });
  }
});

/** Copy a suggested open-database photo into our storage before saving the product. */
router.post('/import-image', requireAuth, scanLimiter, async (req: Request, res: Response) => {
  const url = typeof req.body?.url === 'string' ? req.body.url : '';
  try {
    res.json({ url: await importProductImage(url) });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 422) { res.status(422).json({ error: 'image_not_imported', message: e.message }); return; }
    logger.error({ err: e.message }, 'product image import failed');
    res.status(500).json({ error: 'Could not copy the photo' });
  }
});

/**
 * Quick scan mode: save the whole list in one transaction. Items are either
 * { product_id, add_stock } (one of mine) or a new product with title + price.
 */
router.post('/scan-batch', requireAuth, async (req: Request, res: Response) => {
  const items = Array.isArray(req.body?.items) ? req.body.items as Array<Record<string, unknown>> : null;
  const businessId = typeof req.body?.business_id === 'string' ? req.body.business_id : null;
  if (!items || items.length === 0) { res.status(422).json({ error: 'items must be a non-empty list' }); return; }
  if (items.length > 200) { res.status(422).json({ error: 'At most 200 items per save' }); return; }
  const sellerId = req.user!.id;
  const client = await pool.connect();
  try {
    if (businessId) {
      const { rows } = await client.query('SELECT id FROM businesses WHERE id=$1 AND owner_id=$2', [businessId, sellerId]);
      if (!rows.length) { res.status(403).json({ error: 'You cannot attach products to this business' }); return; }
    }
    await client.query('BEGIN');
    const created: string[] = []; const updated: string[] = []; const seen = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const fail = (message: string, status = 422) => Object.assign(new Error(message), { status, index: i });
      if (typeof it.product_id === 'string') {
        const add = Number(it.add_stock);
        if (!Number.isInteger(add) || add < 1 || add > 100000) throw fail('add_stock must be a whole number from 1');
        const { rows } = await client.query('UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id=$2 AND seller_id=$3 RETURNING id', [add, it.product_id, sellerId]);
        if (!rows.length) throw fail('Product not found', 404);
        updated.push(rows[0].id);
        continue;
      }
      const title = typeof it.title === 'string' ? it.title.trim() : '';
      const price = Number(it.price);
      const stock = it.stock === undefined ? 1 : Number(it.stock);
      if (!title || title.length > 200) throw fail('Every new product needs a name');
      if (!Number.isFinite(price) || price <= 0) throw fail(`Add a price for "${title}"`);
      if (!Number.isInteger(stock) || stock < 0) throw fail('stock must be a whole number');
      let barcode: string | null = null;
      try { barcode = normaliseBarcode(it.barcode); } catch (e) { throw fail((e as Error).message); }
      if (barcode) {
        if (seen.has(barcode)) throw fail(`"${title}" is in the list twice`);
        seen.add(barcode);
        const existing = await ownProductWithBarcode(sellerId, barcode);
        if (existing) throw Object.assign(fail(`You already sell "${title}". Add stock to it instead.`, 409), { existing });
      }
      const images = Array.isArray(it.images) ? (it.images as unknown[]).filter((x) => typeof x === 'string').slice(0, 10) : [];
      const { rows: [row] } = await client.query(
        `INSERT INTO products (seller_id, business_id, title, description, price, currency, stock, category, images, barcode, manufacturer, unit, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, 'pcs'), 'active') RETURNING id`,
        [sellerId, businessId, title, typeof it.description === 'string' ? it.description.slice(0, 5000) : null, price,
          typeof it.currency === 'string' ? it.currency : 'ETB', stock, typeof it.category === 'string' ? it.category.slice(0, 80) : null,
          JSON.stringify(images), barcode, typeof it.manufacturer === 'string' ? it.manufacturer.slice(0, 120) : null,
          typeof it.unit === 'string' && it.unit.trim() ? it.unit.slice(0, 40) : null],
      );
      created.push(row.id);
    }
    await client.query('COMMIT');
    await invalidateCache('products:list').catch(() => undefined);
    res.status(201).json({ created, updated });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* connection gone */ }
    const e = err as Error & { status?: number; index?: number; existing?: string };
    if (e.status && e.status < 500) { res.status(e.status).json({ error: 'scan_batch_invalid', message: e.message, index: e.index, existing_product_id: e.existing }); return; }
    logger.error({ err: e.message }, 'scan batch failed');
    res.status(500).json({ error: 'Could not save the scanned products' });
  } finally { client.release(); }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const product = await getRecord('products', req.params.id, { realOnly: req.realOnly });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    const record = product as Record<string, unknown>;
    if (!['active', 'sold_out'].includes(String(record.status)) && (!req.user?.id || record.seller_id !== req.user.id) && req.user?.role !== 'admin') {
      res.status(404).json({ error: 'Product not found' }); return;
    }
    let businessId = typeof record.business_id === 'string' ? record.business_id : null;
    if (!businessId && typeof record.showroom_id === 'string') {
      const { rows } = await pool.query<{ business_id: string | null }>('SELECT business_id FROM showrooms WHERE id=$1', [record.showroom_id]);
      businessId = rows[0]?.business_id ?? null;
    }
    if (businessId) {
      const access = await getBusinessSubscriptionAccess(businessId);
      const isOwner = record.seller_id === req.user?.id;
      if (!isOwner && rejectViewGate(res, businessViewGate(access, req), 'Product not found')) return;
    }
    await pool.query('UPDATE products SET view_count=view_count+1 WHERE id=$1', [req.params.id]).catch(()=>undefined);
    res.json((!!req.user?.id && record.seller_id === req.user.id) || req.user?.role === 'admin' ? normalizeProduct(record) : publicProduct(record));
  } catch { res.status(500).json({ error: 'Failed to fetch product' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const price = Number(body.price);
  const stock = body.stock === undefined ? 0 : Number(body.stock);
  if (!title || body.price == null) { res.status(400).json({ error: 'title and price are required' }); return; }
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    res.status(422).json({ error: 'price must be positive and stock must be a non-negative integer' }); return;
  }
  const data = pickProductFields(body);
  data.title = title;
  data.price = price;
  data.stock = stock;
  if (data.status !== undefined && !['active', 'sold_out', 'draft', 'archived'].includes(String(data.status))) {
    res.status(422).json({ error: 'Invalid product status' }); return;
  }
  if (data.barcode !== undefined) {
    try { data.barcode = normaliseBarcode(data.barcode); } catch (e) { res.status(422).json({ error: (e as Error).message }); return; }
  }
  try {
    if (data.barcode) {
      const existing = await ownProductWithBarcode(req.user!.id, String(data.barcode));
      if (existing) { res.status(409).json({ error: 'barcode_exists', message: 'You already sell a product with this barcode.', existing_product_id: existing }); return; }
    }
    for (const key of ['business_id', 'showroom_id'] as const) {
      if (data[key] != null) {
        const table = key === 'business_id' ? 'businesses' : 'showrooms';
        const { rows } = await pool.query(`SELECT id FROM ${table} WHERE id=$1 AND owner_id=$2`, [data[key], req.user!.id]);
        if (!rows.length && req.user!.role !== 'admin') { res.status(403).json({ error: `You cannot attach a product to this ${key === 'business_id' ? 'business' : 'showroom'}` }); return; }
      }
    }
    // A product with no business or showroom belongs to the seller's only
    // business, so checkout can find its payment details (audit FUNC-03).
    if (data.business_id == null && data.showroom_id == null) {
      data.business_id = await soleBusinessOf(req.user!.id);
    }
    const product = await createRecord('products', { ...data, seller_id: req.user!.id }) as Record<string, unknown>;
    await invalidateCache('products:list').catch(()=>undefined);
    // Tells the seller straight away when buyers cannot pay for this product yet.
    const sellingBusiness = await resolveProductBusiness(product);
    const readiness = await checkoutReadiness(sellingBusiness);
    res.status(201).json({
      ...normalizeProduct(product),
      selling_business_id: sellingBusiness,
      payment_ready: readiness.ready,
      checkout_blocker: readiness.blocker,
    });
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

    const body = req.body as Record<string, unknown>;
    const updates = pickProductFields(body);
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable product fields provided' }); return; }
    if (updates.price !== undefined && (!Number.isFinite(Number(updates.price)) || Number(updates.price) <= 0)) {
      res.status(422).json({ error: 'price must be a positive number' }); return;
    }
    if (updates.stock !== undefined && (!Number.isInteger(Number(updates.stock)) || Number(updates.stock) < 0)) {
      res.status(422).json({ error: 'stock must be a non-negative integer' }); return;
    }
    if (updates.status !== undefined && !['active', 'sold_out', 'draft', 'archived'].includes(String(updates.status))) {
      res.status(422).json({ error: 'Invalid product status' }); return;
    }
    if (updates.barcode !== undefined) {
      try { updates.barcode = normaliseBarcode(updates.barcode); } catch (e) { res.status(422).json({ error: (e as Error).message }); return; }
      const clash = updates.barcode ? await ownProductWithBarcode(String(existing.seller_id), String(updates.barcode), req.params.id) : null;
      if (clash) { res.status(409).json({ error: 'barcode_exists', message: 'You already sell a product with this barcode.', existing_product_id: clash }); return; }
    }
    for (const key of ['business_id', 'showroom_id'] as const) {
      if (updates[key] != null) {
        const table = key === 'business_id' ? 'businesses' : 'showrooms';
        const { rows } = await pool.query(`SELECT id FROM ${table} WHERE id=$1 AND owner_id=$2`, [updates[key], req.user!.id]);
        if (!rows.length && req.user!.role !== 'admin') { res.status(403).json({ error: `You cannot attach a product to this ${key === 'business_id' ? 'business' : 'showroom'}` }); return; }
      }
    }
    const updated = await updateRecord('products', req.params.id, updates);
    if (!updated) { res.status(404).json({ error: 'Product not found' }); return; }
    await invalidateCache('products:list').catch(()=>undefined);

    // Low-stock alert
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

          if (supplier_id !== undefined && supplier_id !== null && supplier_id !== '') {
            errors.push({ index: i, reason: 'supplier_id is not supported until supplier records are available', data: product });
            continue;
          }

          // Validation
          if (!title || typeof title !== 'string' || title.trim().length === 0) {
            errors.push({ index: i, reason: 'title is required and must be a non-empty string', data: product });
            continue;
          }
          if (price === undefined || price === null || price === '') {
            errors.push({ index: i, reason: 'price is required', data: product });
            continue;
          }
          const parsedPrice = Number(price);
          if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            errors.push({ index: i, reason: 'price must be a positive number', data: product });
            continue;
          }
          const curr = currency ? String(currency).toUpperCase() : 'ETB';
          if (!/^[A-Z]{3}$/.test(curr)) {
            errors.push({ index: i, reason: 'currency must be a 3-letter ISO code (e.g., ETB, USD)', data: product });
            continue;
          }

          const parsedStock = stock !== undefined && stock !== null && stock !== '' ? Number(stock) : 0;
          if (!Number.isInteger(parsedStock) || parsedStock < 0) {
            errors.push({ index: i, reason: 'stock must be a non-negative integer', data: product });
            continue;
          }

          const parsedCostPrice = cost_price !== undefined && cost_price !== null && cost_price !== '' ? Number(cost_price) : null;
          if (cost_price !== undefined && cost_price !== null && cost_price !== '' && (!Number.isFinite(parsedCostPrice) || parsedCostPrice! < 0)) {
            errors.push({ index: i, reason: 'cost_price must be a non-negative number', data: product });
            continue;
          }

          const parsedMinStock = min_stock !== undefined && min_stock !== null && min_stock !== '' ? Number(min_stock) : 10;
          if (!Number.isInteger(parsedMinStock) || parsedMinStock < 0) {
            errors.push({ index: i, reason: 'min_stock must be a non-negative integer', data: product });
            continue;
          }

          const parsedMaxStock = max_stock !== undefined && max_stock !== null && max_stock !== '' ? Number(max_stock) : null;
          if (max_stock !== undefined && max_stock !== null && max_stock !== '' && (!Number.isInteger(parsedMaxStock) || parsedMaxStock! < parsedMinStock)) {
            errors.push({ index: i, reason: 'max_stock must be a non-negative integer', data: product });
            continue;
          }

          let parsedExpiryDate: string | null = null;
          if (expiry_date !== undefined && expiry_date !== null && expiry_date !== '') {
            const dateText = String(expiry_date);
            const d = new Date(`${dateText}T00:00:00.000Z`);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dateText) {
              errors.push({ index: i, reason: 'expiry_date must be a valid date (ISO 8601)', data: product });
              continue;
            }
            parsedExpiryDate = d.toISOString().split('T')[0];
          }

          const parsedWeight = weight_kg !== undefined && weight_kg !== null && weight_kg !== '' ? Number(weight_kg) : null;
          if (weight_kg !== undefined && weight_kg !== null && weight_kg !== '' && (!Number.isFinite(parsedWeight) || parsedWeight! < 0)) {
            errors.push({ index: i, reason: 'weight_kg must be a non-negative number', data: product });
            continue;
          }

          let parsedDimensions: object | null = null;
          if (dimensions_cm !== undefined && dimensions_cm !== null) {
            try {
              parsedDimensions = typeof dimensions_cm === 'string' ? JSON.parse(dimensions_cm) : dimensions_cm;
              if (!parsedDimensions || typeof parsedDimensions !== 'object' || Array.isArray(parsedDimensions)) throw new Error('not an object');
            } catch {
              errors.push({ index: i, reason: 'dimensions_cm must be a valid JSON object', data: product });
              continue;
            }
          }

          let parsedBundleComponents: object | null = null;
          if (bundle_components !== undefined && bundle_components !== null) {
            try {
              parsedBundleComponents = typeof bundle_components === 'string' ? JSON.parse(bundle_components) : bundle_components;
              if (!Array.isArray(parsedBundleComponents)) throw new Error('not an array');
            } catch {
              errors.push({ index: i, reason: 'bundle_components must be a valid JSON array', data: product });
              continue;
            }
          }

          let parsedAttributes: object | null = null;
          if (attributes !== undefined && attributes !== null) {
            try {
              parsedAttributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
              if (!parsedAttributes || typeof parsedAttributes !== 'object' || Array.isArray(parsedAttributes)) throw new Error('not an object');
            } catch {
              errors.push({ index: i, reason: 'attributes must be a valid JSON object', data: product });
              continue;
            }
          }

          const parsedIsPrescription = is_prescription === true || is_prescription === 'true';
          const parsedControlledSubstance = controlled_substance === true || controlled_substance === 'true';
          const parsedIsBundle = is_bundle === true || is_bundle === 'true';
          const parsedVariantOf = variant_of !== undefined && variant_of !== null && variant_of !== '' ? String(variant_of) : null;
          const parsedSku = sku !== undefined && sku !== null && sku !== '' ? String(sku).trim() : null;
          const parsedBarcode = barcode !== undefined && barcode !== null && barcode !== '' ? String(barcode).trim() : null;
          const parsedUnit = unit !== undefined && unit !== null && unit !== '' ? String(unit) : 'pcs';
          const parsedManufacturer = manufacturer !== undefined && manufacturer !== null && manufacturer !== '' ? String(manufacturer) : null;
          const parsedStorageCondition = storage_condition !== undefined && storage_condition !== null && storage_condition !== '' ? String(storage_condition) : null;
          const parsedTaxRate = tax_rate !== undefined && tax_rate !== null && tax_rate !== '' ? Number(tax_rate) : 0;
          if (!Number.isFinite(parsedTaxRate) || parsedTaxRate < 0 || parsedTaxRate > 100) {
            errors.push({ index: i, reason: 'tax_rate must be between 0 and 100', data: product });
            continue;
          }

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
                weight_kg, dimensions_cm, is_prescription, controlled_substance,
                storage_condition, variant_of, is_bundle, bundle_components, attributes, tax_rate)
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
              parsedWeight,
              parsedDimensions ? JSON.stringify(parsedDimensions) : null,
              parsedIsPrescription,
              parsedControlledSubstance,
              parsedStorageCondition,
              parsedVariantOf,
              parsedIsBundle,
              parsedBundleComponents ? JSON.stringify(parsedBundleComponents) : null,
              parsedAttributes ? JSON.stringify(parsedAttributes) : null,
              parsedTaxRate,
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
