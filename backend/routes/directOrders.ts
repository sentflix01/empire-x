/**
 * routes/directOrders.ts — Buy by paying the seller directly (guest or signed in).
 *
 * Mounted at /api/direct-orders. NodBusiness never holds funds
 * (docs/decisions/platform-model-decisions.md §2): the buyer sees the seller's
 * payment accounts, pays outside NodBusiness, reports the payment (optional
 * reference and receipt), and only the seller confirms it. Guests need no
 * account: they get a private order link (a random token; only its SHA-256
 * hash is stored). Orders not confirmed within 7 days expire.
 *
 * States: awaiting_payment → payment_reported → paid (seller) → existing
 * fulfilment states; awaiting_payment/payment_reported → expired | cancelled.
 *
 * Request to order (website items that are not catalogue products, e.g. a
 * service typed into a website section): requested → (seller sets the price)
 * awaiting_payment → … as above; requested → cancelled (seller declines) |
 * expired (no answer within 7 days).
 */
import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import pool from '../db/pool';
import logger from '../lib/logger';
import * as apiError from '../lib/apiError';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { getBusinessSubscriptionAccess } from '../lib/businessSubscriptionPolicy';
import { businessViewGate, rejectViewGate } from '../lib/siteVisibility';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import { sendCustomEmail } from '../utils/mailer';
import { emitNotification } from '../socket';
import { reserveOrderInventory, releaseOrderInventory, InventoryUnavailableError } from '../services/orderInventory';
import { validateFileBytes } from '../middleware/upload';
import { resolvePartnerAttribution } from './profilePartnerships';
import { RECEIPT_MIME_TYPES, receiptUploadsAvailable, signedReceiptUrl, uploadReceipt } from '../lib/privateReceipts';
import { resolveProductBusiness, soleBusinessOf } from '../lib/productBusiness';

const router = Router();

export const PAYMENT_WINDOW_DAYS = 7;
const OPEN_STATES = ['awaiting_payment', 'payment_reported'];
const isDev = process.env.NODE_ENV === 'development';

const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, skip: () => isDev, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many orders from this connection. Please try again later.' },
});
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, skip: () => isDev, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, RECEIPT_MIME_TYPES.includes(file.mimetype)),
});

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const orderUrl = (token: string) => `${getPrimaryFrontendUrl()}/order/${token}`;

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

async function notifyUser(userId: string | null, title: string, body: string, link: string): Promise<void> {
  if (!userId) return;
  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link, is_read) VALUES ($1,'order',$2,$3,$4,false) RETURNING *`,
      [userId, title, body, link],
    );
    if (rows[0]) emitNotification(userId, rows[0] as Record<string, unknown>);
  } catch (err) { logger.warn({ err: (err as Error).message }, 'direct order notification failed'); }
}

async function emailUser(userId: string | null, subject: string, html: string): Promise<void> {
  if (!userId) return;
  const { rows } = await pool.query<{ email: string }>('SELECT email FROM users WHERE id=$1', [userId]).catch(() => ({ rows: [] as Array<{ email: string }> }));
  if (rows[0]?.email) await sendCustomEmail(rows[0].email, subject, html).catch(() => undefined);
}

async function emailBuyer(order: Record<string, unknown>, subject: string, html: string): Promise<void> {
  if (typeof order.buyer_email === 'string' && EMAIL_RE.test(order.buyer_email)) {
    await sendCustomEmail(order.buyer_email, subject, html).catch(() => undefined);
  }
}

/** Public payment details for an order: business identity, active accounts, and the pickup address (post-order only). */
async function sellerPaymentDetails(businessId: string | null): Promise<Record<string, unknown>> {
  if (!businessId) return { business: null, payment_accounts: [] };
  const { rows: biz } = await pool.query(
    `SELECT id, business_name, business_logo_url, business_contact_phone, business_contact_email, business_address,
            public_contact_fields, pickup_address
       FROM businesses WHERE id=$1`,
    [businessId],
  );
  const { rows: accounts } = await pool.query(
    `SELECT id, method, provider_name, account_name, account_number, instructions FROM business_payment_accounts
      WHERE business_id=$1 AND is_active=TRUE ORDER BY sort_order, created_at`,
    [businessId],
  );
  const b = biz[0] as Record<string, unknown> | undefined;
  if (!b) return { business: null, payment_accounts: accounts };
  const visible = new Set(Array.isArray(b.public_contact_fields) ? (b.public_contact_fields as string[]) : []);
  return {
    business: {
      id: b.id, business_name: b.business_name, business_logo_url: b.business_logo_url ?? null,
      business_contact_phone: visible.has('business_contact_phone') ? b.business_contact_phone : null,
      business_contact_email: visible.has('business_contact_email') ? b.business_contact_email : null,
      business_address: visible.has('business_address') ? b.business_address : null,
      // Shared with the buyer only because they have an order (decision §2.3).
      pickup_address: b.pickup_address ?? null,
    },
    payment_accounts: accounts,
  };
}

const PUBLIC_ORDER_COLUMNS = `id, product_id, product_title, listed_price_text, quantity, unit_price, total_price, currency, status, buyer_name,
  delivery_address, notes, payment_reference, receipt_key IS NOT NULL AS has_receipt, payment_reported_at,
  payment_confirmed_at, payment_expires_at, created_at, updated_at, business_id, seller_id, buyer_id, buyer_email`;

function publicOrder(row: Record<string, unknown>): Record<string, unknown> {
  const { buyer_email: _email, buyer_id: _buyer, seller_id: _seller, ...rest } = row;
  return rest;
}

// ── Before ordering: seller details for the Buy view ─────────────────────────

/**
 * GET /api/direct-orders/checkout-info?product_id=… | ?showroom_id=…
 * Public business identity, public contact fields and active payment accounts.
 * The pickup address is withheld until an order exists.
 */
router.get('/checkout-info', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { product_id: productId, showroom_id: showroomId, business_id: requestedBusinessId, seller_id: sellerId } = req.query as Record<string, string | undefined>;
    let businessId: string | null = null;
    if (productId) {
      const { rows } = await pool.query(
        `SELECT COALESCE(p.business_id, s.business_id) AS business_id, p.seller_id FROM products p
           LEFT JOIN showrooms s ON s.id = p.showroom_id WHERE p.id=$1 AND p.status IN ('active','sold_out')`,
        [productId],
      );
      if (!rows.length) { apiError.notFound(res, 'Product not found'); return; }
      // Unlinked products fall back to the seller's only business (audit FUNC-03).
      businessId = await resolveProductBusiness(rows[0]);
    } else if (showroomId) {
      const { rows } = await pool.query(`SELECT business_id FROM showrooms WHERE id=$1 AND status='published'`, [showroomId]);
      if (!rows.length) { apiError.notFound(res, 'Showroom not found'); return; }
      businessId = rows[0].business_id ?? null;
    } else if (requestedBusinessId && UUID_RE.test(requestedBusinessId)) {
      const { rows } = await pool.query('SELECT id FROM businesses WHERE id=$1', [requestedBusinessId]);
      if (!rows.length) { apiError.notFound(res, 'Business not found'); return; }
      businessId = rows[0].id;
    } else if (sellerId && UUID_RE.test(sellerId)) {
      businessId = await primaryBusinessOf(sellerId);
    } else { apiError.validationError(res, 'product_id, showroom_id, business_id or seller_id is required'); return; }
    if (businessId) {
      const access = await getBusinessSubscriptionAccess(businessId);
      // A private business sells to signed-in buyers only (decision §7).
      if (rejectViewGate(res, businessViewGate(access, req), 'Business not found')) return;
    }
    const details = await sellerPaymentDetails(businessId);
    const business = details.business as Record<string, unknown> | null;
    if (business) delete business.pickup_address;
    res.json({ ...details, payment_window_days: PAYMENT_WINDOW_DAYS });
  } catch (err) { logger.error({ err: (err as Error).message }, 'checkout-info failed'); apiError.serverError(res, 'Could not load seller details'); }
});

// ── Create ────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The seller's business when there is exactly one (a profile page names the seller, not the business). */
async function primaryBusinessOf(sellerId: string): Promise<string | null> {
  return soleBusinessOf(sellerId);
}

/**
 * Finds a priced item (service, package, best seller…) by its title in the
 * seller's own website content: published sites, Business profiles and the
 * profile's business sections. Returns the price text shown to buyers, or
 * null when the seller never offered such an item (requests for made-up
 * items are refused).
 */
export async function findWebsiteItem(sellerId: string, title: string, scope: { showroomId?: string | null; businessId?: string | null }): Promise<{ priceText: string | null } | null> {
  const sources: unknown[] = [];
  const { rows: sites } = await pool.query<{ sections: unknown }>(
    `SELECT sections FROM showrooms WHERE owner_id=$1 AND status='published' AND ($2::uuid IS NULL OR id=$2) AND ($3::uuid IS NULL OR business_id=$3)`,
    [sellerId, scope.showroomId ?? null, scope.businessId ?? null],
  );
  sources.push(...sites.map((r) => r.sections));
  if (!scope.showroomId) {
    const { rows: biz } = await pool.query<{ business_sections: unknown }>(
      `SELECT business_sections FROM businesses WHERE owner_id=$1 AND ($2::uuid IS NULL OR id=$2)`,
      [sellerId, scope.businessId ?? null],
    );
    sources.push(...biz.map((r) => r.business_sections));
    const { rows: profile } = await pool.query<{ business_sections: unknown }>('SELECT business_sections FROM user_profiles WHERE user_id=$1', [sellerId]);
    sources.push(...profile.map((r) => r.business_sections));
  }
  const wanted = title.trim().toLowerCase();
  let found: { priceText: string | null } | null = null;
  const visit = (node: unknown, depth: number): void => {
    if (found || depth > 8 || node === null || node === undefined) return;
    if (typeof node === 'string') {
      if (depth === 0 && node.trim().startsWith('[')) { try { visit(JSON.parse(node), depth + 1); } catch { /* not JSON */ } }
      return;
    }
    if (Array.isArray(node)) { node.forEach((child) => visit(child, depth + 1)); return; }
    if (typeof node !== 'object') return;
    const item = node as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name : typeof item.title === 'string' ? item.title : null;
    if (name && name.trim().toLowerCase() === wanted && ('price' in item || 'cta' in item)) {
      found = { priceText: typeof item.price === 'string' || typeof item.price === 'number' ? String(item.price).slice(0, 60) : null };
      return;
    }
    Object.values(item).forEach((child) => visit(child, depth + 1));
  };
  sources.forEach((source) => visit(source, 0));
  return found;
}

/**
 * POST /api/direct-orders/requests — request a website item that is not a
 * catalogue product. Guests welcome. No price is taken: the seller sets it.
 */
router.post('/requests', guestLimiter, optionalAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const itemTitle = text(body.item_title, 200);
  const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
  const buyerName = text(body.buyer_name, 200);
  const buyerPhone = text(body.buyer_phone, 30);
  const buyerEmail = text(body.buyer_email, 320)?.toLowerCase() ?? null;
  if (!itemTitle) { apiError.validationError(res, 'Choose an item to request'); return; }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) { apiError.validationError(res, 'A valid quantity is required'); return; }
  if (!buyerName) { apiError.validationError(res, 'Your name is required'); return; }
  if (!buyerPhone || !PHONE_RE.test(buyerPhone)) { apiError.validationError(res, 'A valid phone number is required'); return; }
  if (!buyerEmail || !EMAIL_RE.test(buyerEmail)) { apiError.validationError(res, 'A valid email address is required'); return; }
  const deliveryAddress = body.delivery_address === undefined ? null : text(body.delivery_address, 2000);
  const notes = body.notes === undefined ? null : text(body.notes, 2000);

  try {
    // Who sells it: the website's owner, the business's owner, or the named seller.
    let sellerId: string | null = null;
    let businessId: string | null = null;
    let showroomId: string | null = null;
    if (typeof body.showroom_id === 'string' && UUID_RE.test(body.showroom_id)) {
      const { rows } = await pool.query(`SELECT id, owner_id, business_id FROM showrooms WHERE id=$1 AND status='published'`, [body.showroom_id]);
      if (!rows.length) { apiError.notFound(res, 'This website is not available'); return; }
      ({ id: showroomId, owner_id: sellerId, business_id: businessId } = rows[0]);
    } else if (typeof body.business_id === 'string' && UUID_RE.test(body.business_id)) {
      const { rows } = await pool.query('SELECT id, owner_id FROM businesses WHERE id=$1', [body.business_id]);
      if (!rows.length) { apiError.notFound(res, 'This business is not available'); return; }
      ({ id: businessId, owner_id: sellerId } = rows[0]);
    } else if (typeof body.seller_id === 'string' && UUID_RE.test(body.seller_id)) {
      const { rows } = await pool.query('SELECT id FROM users WHERE id=$1', [body.seller_id]);
      if (!rows.length) { apiError.notFound(res, 'This seller is not available'); return; }
      sellerId = rows[0].id;
      businessId = await primaryBusinessOf(sellerId!);
    } else { apiError.validationError(res, 'showroom_id, business_id or seller_id is required'); return; }
    if (!sellerId) { apiError.notFound(res, 'This seller is not available'); return; }
    if (req.user?.id === sellerId) { apiError.validationError(res, 'You cannot order from your own business'); return; }
    if (businessId) {
      const access = await getBusinessSubscriptionAccess(businessId);
      if (rejectViewGate(res, businessViewGate(access, req), 'This business is not available')) return;
    }

    const item = await findWebsiteItem(sellerId, itemTitle, { showroomId, businessId: showroomId ? null : businessId });
    if (!item) { apiError.notFound(res, 'This item is not offered by the seller'); return; }

    const token = crypto.randomBytes(32).toString('base64url');
    const { rows } = await pool.query(
      `INSERT INTO orders (product_id, seller_id, business_id, product_title, listed_price_text, product_type, quantity, unit_price, total_price, currency,
                           buyer_id, buyer_name, buyer_phone, buyer_email, delivery_address, notes,
                           status, payment_provider, access_token_hash, payment_expires_at)
       VALUES (NULL,$1,$2,$3,$4,'service',$5,NULL,0,'ETB',$6,$7,$8,$9,$10,$11,'requested','direct',$12, NOW() + make_interval(days => $13))
       RETURNING ${PUBLIC_ORDER_COLUMNS}`,
      [sellerId, businessId, itemTitle, item.priceText, quantity, req.user?.id ?? null, buyerName, buyerPhone, buyerEmail,
        deliveryAddress, notes, hashToken(token), PAYMENT_WINDOW_DAYS],
    );
    const order = rows[0] as Record<string, unknown>;
    const link = orderUrl(token);
    res.status(201).json({ order: publicOrder(order), access_token: token, order_url: link, ...(await sellerPaymentDetails(businessId)) });

    const listed = item.priceText ? ` (listed as ${item.priceText})` : '';
    void notifyUser(sellerId, `New request: ${itemTitle}`, `${buyerName} requested ${quantity}× ${itemTitle}${listed}. Set the price to confirm it.`, '/orders');
    void emailUser(sellerId, `New request: ${itemTitle}`,
      `<p>${escapeHtml(buyerName)} requested ${quantity}× ${escapeHtml(itemTitle)}${escapeHtml(listed)}.</p><p>Open Orders in NodBusiness to set the price and confirm it, or decline it. Requests without an answer expire after ${PAYMENT_WINDOW_DAYS} days.</p>`);
    void emailBuyer(order, `Request sent: ${itemTitle}`,
      `<p>Thank you, ${escapeHtml(buyerName)}. The seller will confirm the price of ${escapeHtml(itemTitle)}. You will then pay them directly.</p>
       <p><a href="${escapeHtml(link)}">View your request</a></p>
       <p>Keep this link private: anyone with it can see your request.</p>`);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Order request failed');
    apiError.serverError(res, 'Could not send the request');
  }
});

router.post('/', guestLimiter, optionalAuth, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const productId = typeof body.product_id === 'string' ? body.product_id : '';
  const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
  const buyerName = text(body.buyer_name, 200);
  const buyerPhone = text(body.buyer_phone, 30);
  const buyerEmail = text(body.buyer_email, 320)?.toLowerCase() ?? null;
  if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) { apiError.validationError(res, 'product_id and a valid quantity are required'); return; }
  if (!buyerName) { apiError.validationError(res, 'Your name is required'); return; }
  if (!buyerPhone || !PHONE_RE.test(buyerPhone)) { apiError.validationError(res, 'A valid phone number is required'); return; }
  if (!buyerEmail || !EMAIL_RE.test(buyerEmail)) { apiError.validationError(res, 'A valid email address is required'); return; }
  const deliveryAddress = body.delivery_address === undefined ? null : text(body.delivery_address, 2000);
  const notes = body.notes === undefined ? null : text(body.notes, 2000);

  let orderId: string | null = null;
  try {
    const { rows: products } = await pool.query(
      `SELECT p.id, p.seller_id, COALESCE(p.business_id, s.business_id) AS business_id, p.title, p.price, p.stock, p.status, p.currency
         FROM products p LEFT JOIN showrooms s ON s.id = p.showroom_id WHERE p.id=$1`,
      [productId],
    );
    const product = products[0] as Record<string, unknown> | undefined;
    if (!product || product.status !== 'active') { apiError.notFound(res, 'This product is not available'); return; }
    if (req.user?.id && product.seller_id === req.user.id) { apiError.validationError(res, 'You cannot buy your own product'); return; }
    if (product.stock !== null && product.stock !== undefined && Number(product.stock) < quantity) {
      apiError.validationError(res, `Only ${product.stock} of this product are in stock`); return;
    }
    const businessId = await resolveProductBusiness(product);
    if (businessId) {
      const access = await getBusinessSubscriptionAccess(businessId);
      if (rejectViewGate(res, businessViewGate(access, req), 'This product is not available')) return;
    }
    const details = await sellerPaymentDetails(businessId);
    if (!(details.payment_accounts as unknown[]).length) {
      res.status(409).json({ error: 'This seller has not added payment details yet. Contact them to arrange payment.', code: 'NO_PAYMENT_ACCOUNTS' });
      return;
    }
    const unitPrice = Number(product.price);
    const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(totalPrice) || totalPrice > 10_000_000) { apiError.validationError(res, 'Product price is invalid'); return; }

    // Creator partnership links still attribute the sale; the commission is only
    // recorded on completion and settled between the two parties (decision §1).
    let partner: Awaited<ReturnType<typeof resolvePartnerAttribution>> = null;
    try { partner = await resolvePartnerAttribution(body.partnership_code, String(product.id), req.user?.id ?? ''); }
    catch (err) { apiError.validationError(res, err instanceof Error ? err.message : 'Invalid partnership link'); return; }

    const token = crypto.randomBytes(32).toString('base64url');
    const client = await pool.connect();
    let order: Record<string, unknown>;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO orders (product_id, seller_id, business_id, product_title, quantity, unit_price, total_price, currency,
                             buyer_id, buyer_name, buyer_phone, buyer_email, delivery_address, notes,
                             status, payment_provider, access_token_hash, payment_expires_at,
                             profile_partnership_id, profile_owner_id, profile_commission_rate, profile_eligible_subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'awaiting_payment','direct',$15, NOW() + make_interval(days => $16),
                 $17,$18,$19,$20)
         RETURNING ${PUBLIC_ORDER_COLUMNS}`,
        [product.id, product.seller_id, businessId, product.title, quantity, unitPrice, totalPrice, product.currency ?? 'ETB',
          req.user?.id ?? null, buyerName, buyerPhone, buyerEmail, deliveryAddress, notes, hashToken(token), PAYMENT_WINDOW_DAYS,
          partner?.partnershipId ?? null, partner?.profileOwnerId ?? null, partner?.rate ?? null, partner ? totalPrice : null],
      );
      order = rows[0] as Record<string, unknown>;
      orderId = String(order.id);
      await reserveOrderInventory(client, orderId, [{ productId: String(product.id), quantity }]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }

    const link = orderUrl(token);
    res.status(201).json({ order: publicOrder(order), access_token: token, order_url: link, ...details });

    void notifyUser(String(product.seller_id), `New order: ${product.title}`, `${buyerName} ordered ${quantity}× ${product.title} and will pay you directly.`, '/orders');
    void emailUser(String(product.seller_id), `New order: ${String(product.title)}`,
      `<p>${escapeHtml(buyerName)} ordered ${quantity}× ${escapeHtml(product.title)} (${totalPrice} ${escapeHtml(order.currency)}).</p><p>They will pay you directly. Confirm the payment in your Orders once you receive it.</p>`);
    void emailBuyer(order, `Your order: ${String(product.title)}`,
      `<p>Thank you, ${escapeHtml(buyerName)}. Pay the seller directly using the details on your order page, then tap "I've paid".</p>
       <p><a href="${escapeHtml(link)}">View your order and payment details</a></p>
       <p>Keep this link private: anyone with it can see your order. Unpaid orders expire after ${PAYMENT_WINDOW_DAYS} days.</p>`);
  } catch (err) {
    if (err instanceof InventoryUnavailableError) { apiError.validationError(res, err.message); return; }
    logger.error({ err: (err as Error).message, orderId }, 'Direct order creation failed');
    apiError.serverError(res, 'Could not place the order');
  }
});

// ── Order access: private link (token) or signed-in buyer/seller (id) ────────

type Access = { order: Record<string, unknown>; role: 'buyer' | 'seller' | 'admin' };

async function orderByToken(token: string): Promise<Record<string, unknown> | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  const { rows } = await pool.query(`SELECT ${PUBLIC_ORDER_COLUMNS}, receipt_key FROM orders WHERE access_token_hash=$1`, [hashToken(token)]);
  return (rows[0] as Record<string, unknown>) ?? null;
}

async function orderForUser(req: Request): Promise<Access | null> {
  const { rows } = await pool.query(`SELECT ${PUBLIC_ORDER_COLUMNS}, receipt_key FROM orders WHERE id=$1`, [req.params.id]);
  const order = rows[0] as Record<string, unknown> | undefined;
  if (!order) return null;
  if (req.user!.role === 'admin') return { order, role: 'admin' };
  if (order.seller_id === req.user!.id) return { order, role: 'seller' };
  if (order.buyer_id === req.user!.id) return { order, role: 'buyer' };
  return null;
}

router.get('/link/:token', reportLimiter, async (req: Request, res: Response) => {
  try {
    const order = await orderByToken(req.params.token);
    if (!order) { apiError.notFound(res, 'Order not found'); return; }
    const { receipt_key: _key, ...rest } = order;
    res.set('Cache-Control', 'private, no-store');
    res.json({ order: publicOrder(rest), ...(await sellerPaymentDetails(order.business_id as string | null)), receipt_uploads: receiptUploadsAvailable() });
  } catch (err) { logger.error({ err: (err as Error).message }, 'direct order link view failed'); apiError.serverError(res, 'Could not load the order'); }
});

// ── Buyer reports payment ────────────────────────────────────────────────────

async function reportPayment(req: Request, res: Response, order: Record<string, unknown>): Promise<void> {
  if (!OPEN_STATES.includes(String(order.status))) { res.status(409).json({ error: `This order is ${String(order.status).replace('_', ' ')}` }); return; }
  const reference = req.body?.payment_reference === undefined || req.body.payment_reference === '' ? null : text(req.body.payment_reference, 120);
  if (req.body?.payment_reference && !reference) { apiError.validationError(res, 'Payment reference must be at most 120 characters'); return; }
  let receiptKey: string | null = null;
  if (req.file) {
    if (!receiptUploadsAvailable()) { res.status(503).json({ error: 'Receipt upload is not available. Add the transaction reference instead.', code: 'RECEIPTS_UNAVAILABLE' }); return; }
    const invalid = await validateFileBytes(req.file.buffer, req.file.mimetype);
    if (invalid) { apiError.validationError(res, invalid); return; }
    receiptKey = await uploadReceipt(String(order.id), req.file.buffer, req.file.mimetype);
  }
  const { rows } = await pool.query(
    `UPDATE orders SET status='payment_reported', payment_reported_at=NOW(),
            payment_reference=COALESCE($2, payment_reference), receipt_key=COALESCE($3, receipt_key), updated_at=NOW()
      WHERE id=$1 AND status IN ('awaiting_payment','payment_reported') RETURNING ${PUBLIC_ORDER_COLUMNS}`,
    [order.id, reference, receiptKey],
  );
  if (!rows.length) { res.status(409).json({ error: 'Order changed; refresh and try again' }); return; }
  res.json({ order: publicOrder(rows[0] as Record<string, unknown>) });
  void notifyUser(String(order.seller_id), `Payment reported: ${String(order.product_title)}`,
    `${String(order.buyer_name || 'The buyer')} says they paid${reference ? ` (ref ${reference})` : ''}. Check your account, then confirm the payment.`, '/orders');
}

router.post('/link/:token/report-payment', reportLimiter, receiptUpload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const order = await orderByToken(req.params.token);
    if (!order) { apiError.notFound(res, 'Order not found'); return; }
    await reportPayment(req, res, order);
  } catch (err) { logger.error({ err: (err as Error).message }, 'report payment failed'); apiError.serverError(res, 'Could not report the payment'); }
});

router.post('/:id/report-payment', requireAuth, receiptUpload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const access = await orderForUser(req);
    if (!access || access.role === 'seller') { apiError.notFound(res, 'Order not found'); return; }
    await reportPayment(req, res, access.order);
  } catch (err) { logger.error({ err: (err as Error).message }, 'report payment failed'); apiError.serverError(res, 'Could not report the payment'); }
});

// ── Seller confirms or rejects ───────────────────────────────────────────────

router.post('/:id/confirm-payment', requireAuth, async (req: Request, res: Response) => {
  try {
    const access = await orderForUser(req);
    if (!access || access.role === 'buyer') { apiError.notFound(res, 'Order not found'); return; }
    const { rows } = await pool.query(
      `UPDATE orders SET status='paid', payment_confirmed_at=NOW(), updated_at=NOW()
        WHERE id=$1 AND status IN ('awaiting_payment','payment_reported') RETURNING ${PUBLIC_ORDER_COLUMNS}`,
      [req.params.id],
    );
    if (!rows.length) { res.status(409).json({ error: 'Only an order awaiting payment can be confirmed' }); return; }
    const order = rows[0] as Record<string, unknown>;
    res.json({ order: publicOrder(order) });
    void notifyUser(order.buyer_id as string | null, `Payment confirmed: ${String(order.product_title)}`, 'The seller confirmed your payment.', '/orders');
    void emailBuyer(order, `Payment confirmed: ${String(order.product_title)}`, `<p>The seller confirmed your payment for ${escapeHtml(order.product_title)}.</p>`);
  } catch { apiError.serverError(res, 'Could not confirm the payment'); }
});

router.post('/:id/reject-payment', requireAuth, async (req: Request, res: Response) => {
  try {
    const access = await orderForUser(req);
    if (!access || access.role === 'buyer') { apiError.notFound(res, 'Order not found'); return; }
    const { rows } = await pool.query(
      `UPDATE orders SET status='awaiting_payment', updated_at=NOW() WHERE id=$1 AND status='payment_reported' RETURNING ${PUBLIC_ORDER_COLUMNS}`,
      [req.params.id],
    );
    if (!rows.length) { res.status(409).json({ error: 'Only a reported payment can be marked as not received' }); return; }
    const order = rows[0] as Record<string, unknown>;
    res.json({ order: publicOrder(order) });
    void notifyUser(order.buyer_id as string | null, `Payment not received: ${String(order.product_title)}`, 'The seller has not received your payment yet. Check the details and try again.', '/orders');
    void emailBuyer(order, `Payment not received: ${String(order.product_title)}`, `<p>The seller has not received your payment for ${escapeHtml(order.product_title)} yet. Please check the payment details on your order page.</p>`);
  } catch { apiError.serverError(res, 'Could not update the payment'); }
});

// ── Seller answers a request ─────────────────────────────────────────────────

/** POST /:id/set-price { unit_price } — confirms a request at a price; the buyer can then pay. */
router.post('/:id/set-price', requireAuth, async (req: Request, res: Response) => {
  try {
    const access = await orderForUser(req);
    if (!access || access.role === 'buyer') { apiError.notFound(res, 'Order not found'); return; }
    const unitPrice = Number(req.body?.unit_price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 10_000_000) { apiError.validationError(res, 'Enter a price greater than 0'); return; }
    const details = await sellerPaymentDetails(access.order.business_id as string | null);
    if (!(details.payment_accounts as unknown[]).length) {
      res.status(409).json({ error: 'Add a payment account to your business first, so the buyer knows how to pay you.', code: 'NO_PAYMENT_ACCOUNTS' });
      return;
    }
    const { rows } = await pool.query(
      `UPDATE orders SET unit_price=$2::numeric, total_price=ROUND($2::numeric * quantity, 2), status='awaiting_payment',
              payment_expires_at=NOW() + make_interval(days => $3), updated_at=NOW()
        WHERE id=$1 AND status='requested' RETURNING ${PUBLIC_ORDER_COLUMNS}`,
      [req.params.id, Math.round(unitPrice * 100) / 100, PAYMENT_WINDOW_DAYS],
    );
    if (!rows.length) { res.status(409).json({ error: 'Only a request can be priced' }); return; }
    const order = rows[0] as Record<string, unknown>;
    res.json({ order: publicOrder(order) });
    const total = `${Number(order.total_price).toLocaleString('en-US')} ${String(order.currency)}`;
    void notifyUser(order.buyer_id as string | null, `Price confirmed: ${String(order.product_title)}`, `The seller confirmed ${total}. Pay them directly, then report the payment.`, '/orders');
    void emailBuyer(order, `Price confirmed: ${String(order.product_title)}`,
      `<p>The seller confirmed your request for ${escapeHtml(order.product_title)} at <strong>${escapeHtml(total)}</strong>.</p>
       <p>Open the link we sent when you made the request to see how to pay, then tap "I've paid". Unpaid orders expire after ${PAYMENT_WINDOW_DAYS} days.</p>`);
  } catch { apiError.serverError(res, 'Could not set the price'); }
});

/** POST /:id/decline-request — the seller can't take this request. */
router.post('/:id/decline-request', requireAuth, async (req: Request, res: Response) => {
  try {
    const access = await orderForUser(req);
    if (!access || access.role === 'buyer') { apiError.notFound(res, 'Order not found'); return; }
    const { rows } = await pool.query(
      `UPDATE orders SET status='cancelled', updated_at=NOW() WHERE id=$1 AND status='requested' RETURNING ${PUBLIC_ORDER_COLUMNS}`,
      [req.params.id],
    );
    if (!rows.length) { res.status(409).json({ error: 'Only a request can be declined' }); return; }
    const order = rows[0] as Record<string, unknown>;
    res.json({ order: publicOrder(order) });
    void notifyUser(order.buyer_id as string | null, `Request declined: ${String(order.product_title)}`, 'The seller cannot take this request.', '/orders');
    void emailBuyer(order, `Request declined: ${String(order.product_title)}`, `<p>The seller cannot take your request for ${escapeHtml(order.product_title)}. Nothing was charged.</p>`);
  } catch { apiError.serverError(res, 'Could not decline the request'); }
});

// ── Receipt (buyer and seller only, short-lived link) ────────────────────────

async function sendReceipt(res: Response, order: Record<string, unknown>): Promise<void> {
  if (!order.receipt_key) { apiError.notFound(res, 'No receipt uploaded'); return; }
  res.set('Cache-Control', 'private, no-store');
  res.json({ url: await signedReceiptUrl(String(order.receipt_key)) });
}

router.get('/link/:token/receipt', reportLimiter, async (req: Request, res: Response) => {
  try {
    const order = await orderByToken(req.params.token);
    if (!order) { apiError.notFound(res, 'Order not found'); return; }
    await sendReceipt(res, order);
  } catch { apiError.serverError(res, 'Could not load the receipt'); }
});

router.get('/:id/receipt', requireAuth, async (req: Request, res: Response) => {
  try {
    const access = await orderForUser(req);
    if (!access) { apiError.notFound(res, 'Order not found'); return; }
    await sendReceipt(res, access.order);
  } catch { apiError.serverError(res, 'Could not load the receipt'); }
});

// ── Expiry ───────────────────────────────────────────────────────────────────

/** Expires direct orders not confirmed in time and releases their stock. */
export async function expireStaleDirectOrders(): Promise<number> {
  const { rows } = await pool.query(
    `UPDATE orders SET status='expired', updated_at=NOW()
      WHERE payment_provider='direct' AND status IN ('requested','awaiting_payment','payment_reported') AND payment_expires_at < NOW()
      RETURNING ${PUBLIC_ORDER_COLUMNS}`,
  );
  if (!rows.length) return 0;
  await releaseOrderInventory(pool as never, rows.map((r) => String(r.id))).catch((err) => logger.error({ err }, 'release stock for expired orders failed'));
  for (const order of rows as Array<Record<string, unknown>>) {
    void notifyUser(order.buyer_id as string | null, `Order expired: ${String(order.product_title)}`, 'The payment was not confirmed in time.', '/orders');
    void notifyUser(String(order.seller_id), `Order expired: ${String(order.product_title)}`, order.unit_price === null ? 'The request got no price within 7 days.' : 'No payment was confirmed within 7 days.', '/orders');
    void emailBuyer(order, `Order expired: ${String(order.product_title)}`, `<p>Your order for ${escapeHtml(order.product_title)} expired because the payment was not confirmed within ${PAYMENT_WINDOW_DAYS} days.</p>`);
  }
  return rows.length;
}

module.exports = router;
module.exports.expireStaleDirectOrders = expireStaleDirectOrders;
module.exports.hashToken = hashToken;
module.exports.findWebsiteItem = findWebsiteItem;
module.exports.PAYMENT_WINDOW_DAYS = PAYMENT_WINDOW_DAYS;
