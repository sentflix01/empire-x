/**
 * routes/orders.ts — Orders, Stripe + Chapa payments, webhooks
 *
 * Phase improvements:
 *   - Keyset cursor pagination on GET /
 *   - Stripe checkout: all prices computed server-side
 *   - Webhook: idempotent event processing via webhook_events table
 *   - No platform commission: NodBusiness earns only from subscriptions
 *     (docs/decisions/platform-model-decisions.md §1)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { getRecord, createRecord, updateRecord } from '../utils/crud';
import { resolvePartnerAttribution, recordProfileOwnerCommission } from './profilePartnerships';
import { notifyUser } from './telegram';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';
import { sendOrderConfirmation } from '../utils/mailer';
import * as apiError from '../lib/apiError';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import { recordEvent } from '../lib/telemetry';
import { auditLog } from '../lib/auditLogger';
import { isStripeConfigured, stripeClientFacade, withVerifiedStripeWebhook } from '../lib/stripeClient';
import { requireIsolatedPaymentEnvironment } from '../middleware/demoEnvironment';
import { requireFeatureFlag } from '../middleware/featureFlag';
import { platformCollectionRetired } from '../middleware/platformCollectionRetired';
import {
  InventoryUnavailableError, reserveOrderInventory, commitOrderInventory,
  releaseOrderInventory, transitionPaymentOrders, cancelOrderAndReleaseInventory,
} from '../services/orderInventory';

const router = Router();

// Card and Chapa checkout charged buyers into NodBusiness's own accounts.
// Retired until a provider settles directly to the seller (decision §1).
const platformCheckoutRetired = platformCollectionRetired('Paying through NodBusiness is not available. Pay the seller directly using the payment details on the order.');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = stripeClientFacade();
const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY ?? 'usd').toLowerCase();
const STRIPE_ETB_TO_USD_RATE = (() => { const r = parseFloat(process.env.STRIPE_ETB_TO_USD_RATE ?? '0.008'); return Number.isFinite(r) && r > 0 ? r : 0.008; })();
const CHAPA_SECRET  = process.env.CHAPA_SECRET_KEY ?? null;
const CHAPA_SANDBOX = CHAPA_SECRET === 'SANDBOX';

async function reserveInventoryForOrders(reservations: Array<{ orderId: string; lines: Array<{ productId: string; quantity: number }> }>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const reservation of reservations) {
      await reserveOrderInventory(client, reservation.orderId, reservation.lines);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

function toChargeCents(etb: number, currency: string): number {
  return Math.round((currency === 'usd' ? etb * STRIPE_ETB_TO_USD_RATE : etb) * 100);
}

async function chapaPost(path: string, body: Record<string,unknown>): Promise<Record<string,unknown>> {
  if (CHAPA_SANDBOX) {
    const frontendUrl = getPrimaryFrontendUrl();
    const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
    const tx_ref = (body.tx_ref as string) ?? `sandbox-${Date.now()}`;
    if (path === '/transaction/initialize') return { status:'success', data:{ checkout_url:`${apiUrl}/api/orders/chapa/sandbox?tx_ref=${tx_ref}&return_url=${encodeURIComponent((body.return_url as string)||frontendUrl)}` } };
    return {};
  }
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`https://api.chapa.co/v1${path}`, { method:'POST', headers:{ Authorization:`Bearer ${CHAPA_SECRET}`, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
  return res.json() as Promise<Record<string,unknown>>;
}

async function chapaGet(path: string): Promise<Record<string,unknown>> {
  if (CHAPA_SANDBOX) { return { status:'success', data:{ status:'success', tx_ref:path.split('/').pop(), amount:'0', currency:'ETB' } }; }
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`https://api.chapa.co/v1${path}`, { headers:{ Authorization:`Bearer ${CHAPA_SECRET}` } });
  return res.json() as Promise<Record<string,unknown>>;
}

// ── GET — keyset cursor pagination ────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { buyer_id, seller_id, status, sort='-created_at', limit='20', cursor } = req.query as Record<string,string>;
    const lim = Math.min(parseInt(limit)||20, 100);
    const cursorTs = cursor ? new Date(cursor) : new Date();
    if (isNaN(cursorTs.getTime())) { res.status(400).json({ error: 'Invalid cursor value' }); return; }
    const conditions = ['o.created_at < $1'];
    const params: unknown[] = [cursorTs];
    if (req.user!.role !== 'admin') {
      const reqBuyer  = buyer_id  === req.user!.id ? buyer_id  : null;
      const reqSeller = seller_id === req.user!.id ? seller_id : null;
      if (!reqBuyer && !reqSeller) { params.push(req.user!.id); conditions.push(`o.buyer_id=$${params.length}`); }
      else {
        if (reqBuyer)  { params.push(reqBuyer);  conditions.push(`o.buyer_id=$${params.length}`); }
        if (reqSeller) { params.push(reqSeller); conditions.push(`o.seller_id=$${params.length}`); }
      }
    } else {
      if (buyer_id)  { params.push(buyer_id);  conditions.push(`o.buyer_id=$${params.length}`); }
      if (seller_id) { params.push(seller_id); conditions.push(`o.seller_id=$${params.length}`); }
    }
    if (status) { params.push(status); conditions.push(`o.status=$${params.length}`); }
    const orderBy = sort==='created_at' ? 'o.created_at ASC' : 'o.created_at DESC';
    params.push(lim);
    const { rows } = await pool.query(`SELECT o.* FROM orders o WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT $${params.length}`, params);
    res.json({ orders: rows.map(clientOrder), next_cursor: rows.length===lim ? rows[rows.length-1].created_at : null });
  } catch { apiError.serverError(res, 'Failed to fetch orders'); }
});

// Get by Stripe session ID (used by success page)
router.get('/session/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT id,product_title,total_price,currency,quantity,status,buyer_id,seller_id FROM orders WHERE stripe_session_id=$1`, [req.params.sessionId]);
    res.json(rows.filter((o: Record<string,string>) => o.buyer_id===req.user!.id || o.seller_id===req.user!.id || req.user!.role==='admin'));
  } catch { apiError.serverError(res, 'Failed to fetch orders'); }
});

// Get single
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const order = await getRecord<Record<string,unknown>>('orders', req.params.id);
    if (!order) { apiError.notFound(res, 'Order not found'); return; }
    if (order.buyer_id!==req.user!.id && order.seller_id!==req.user!.id && req.user!.role!=='admin') { res.status(403).json({ error:'Forbidden' }); return; }
    res.json(clientOrder(order));
  } catch { apiError.serverError(res, 'Failed to fetch order'); }
});

// ── Field allowlists ──────────────────────────────────────────────────────────
// Clients must never be able to write payment state, money columns, or
// ownership columns directly (mass assignment).

/** Columns order parties may update on an existing order. */
const ORDER_UPDATE_FIELDS = new Set([
  'status', 'buyer_name', 'buyer_email', 'buyer_phone', 'delivery_address', 'notes',
]);

/** State transitions allowed for each order party, indexed by current state. */
// Direct-payment orders are confirmed through /api/direct-orders/:id/confirm-payment.
const BUYER_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(['cancelled']),
  awaiting_payment: new Set(['cancelled']),
  paid: new Set(['disputed']),
  confirmed: new Set(['disputed']),
  processing: new Set(['disputed']),
  shipped: new Set(['disputed']),
  delivered: new Set(['completed', 'disputed']),
};
const SELLER_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(['confirmed', 'cancelled']),
  awaiting_payment: new Set(['cancelled']),
  payment_reported: new Set(['cancelled']),
  paid: new Set(['confirmed', 'processing', 'cancelled']),
  confirmed: new Set(['processing', 'cancelled']),
  processing: new Set(['shipped', 'cancelled']),
  shipped: new Set(['delivered']),
};

/** Never send the order-link token hash or the private receipt key to clients. */
function clientOrder<T extends Record<string, unknown> | null | undefined>(row: T): T {
  if (!row) return row;
  const { access_token_hash: _hash, receipt_key: receiptKey, ...rest } = row as Record<string, unknown>;
  return { ...rest, has_receipt: !!receiptKey } as unknown as T;
}

function pickAllowed(body: Record<string, unknown>, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// Create COD order
router.post('/', requireAuth, async (req: Request, res: Response) => {
  let createdOrderId: string | null = null;
  try {
    const body = req.body as Record<string, unknown>;
    const productId = typeof body.product_id === 'string' ? body.product_id : '';
    const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
      apiError.validationError(res, 'product_id and a valid quantity are required'); return;
    }
    const { rows: products } = await pool.query(
      `SELECT id,seller_id,business_id,title,price,stock,status FROM products WHERE id=$1`,
      [productId],
    );
    if (!products.length) { apiError.notFound(res, 'Product not found'); return; }
    const product = products[0] as Record<string, unknown>;
    if (product.seller_id === req.user!.id) { apiError.validationError(res, 'You cannot purchase your own product'); return; }
    if (product.status !== 'active') { apiError.validationError(res, 'This product is not available'); return; }
    if (product.stock !== null && product.stock !== undefined && Number(product.stock) < quantity) {
      apiError.validationError(res, `Only ${product.stock} of this product are in stock`); return;
    }
    let partner: Awaited<ReturnType<typeof resolvePartnerAttribution>> = null;
    try { partner = await resolvePartnerAttribution(body.partnership_code, String(product.id), req.user!.id); }
    catch (err) { apiError.validationError(res, err instanceof Error ? err.message : 'Invalid partnership link'); return; }
    const unitPrice = Number(product.price);
    const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(totalPrice) || totalPrice <= 0 || totalPrice > 10_000_000) {
      apiError.validationError(res, 'Product price is invalid'); return;
    }
    // Server-owned columns — client values are ignored.
    const order = await createRecord('orders', {
      product_id: product.id,
      seller_id: product.seller_id,
      business_id: product.business_id ?? null,
      product_title: product.title,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      buyer_name: typeof body.buyer_name === 'string' ? body.buyer_name.slice(0, 200) : '',
      buyer_email: typeof body.buyer_email === 'string' ? body.buyer_email.slice(0, 320) : String(req.user!.email ?? ''),
      buyer_phone: typeof body.buyer_phone === 'string' ? body.buyer_phone.slice(0, 50) : '',
      delivery_address: typeof body.delivery_address === 'string' ? body.delivery_address.slice(0, 2000) : '',
      notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : '',
      buyer_id: req.user!.id,
      status: 'pending',
      currency: 'ETB',
      payment_provider: 'cod',
      profile_partnership_id: partner?.partnershipId,
      profile_owner_id: partner?.profileOwnerId,
      profile_commission_rate: partner?.rate,
      profile_eligible_subtotal: partner ? totalPrice : null,
    });
    createdOrderId = String(order.id);
    await reserveInventoryForOrders([{ orderId: createdOrderId, lines: [{ productId: String(product.id), quantity }] }]);
    res.status(201).json(order);
    try {
      const { rows: [notification] } = await pool.query(
        `INSERT INTO notifications (user_id,type,title,body,link,is_read)
         VALUES ($1,'order',$2,$3,'/orders',false) RETURNING *`,
        [order.seller_id, `New order: ${order.product_title}`, `${order.buyer_name || 'A buyer'} ordered ${order.quantity}× ${order.product_title}.`],
      );
      if (notification) {
        emitNotification(String(order.seller_id), notification as Record<string, unknown>);
        sendPushToUser(String(order.seller_id), String(notification.title), String(notification.body), '/orders').catch(() => undefined);
      }
    } catch { /* order creation must not depend on notification delivery */ }
    try {
      const { rows: buyers } = await pool.query('SELECT email FROM users WHERE id=$1', [req.user!.id]);
      if (buyers[0]?.email) sendOrderConfirmation(buyers[0].email as string, order as unknown as Parameters<typeof sendOrderConfirmation>[1]).catch(()=>undefined);
    } catch { /* non-fatal */ }
  } catch (err) {
    if (createdOrderId) await pool.query(`UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id=$1 AND status='pending'`, [createdOrderId]).catch(() => undefined);
    if (err instanceof InventoryUnavailableError) { res.status(409).json({ error: 'Product inventory changed; please review your cart and try again' }); return; }
    logger.error({ err }, 'Failed to create order');
    apiError.serverError(res, 'Failed to create order');
  }
});

// Update order status
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<Record<string,unknown>>('orders', req.params.id);
    if (!existing) { apiError.notFound(res, 'Order not found'); return; }
    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && existing.buyer_id!==req.user!.id && existing.seller_id!==req.user!.id) { res.status(403).json({ error:'Forbidden' }); return; }

    const body = req.body as Record<string, unknown>;
    let updates: Record<string, unknown>;
    if (isAdmin) {
      // Admins may manage operational fields but still cannot reassign ownership.
      updates = pickAllowed(body, [...ORDER_UPDATE_FIELDS, 'stripe_payment_intent_id']);
    } else {
      updates = pickAllowed(body, [...ORDER_UPDATE_FIELDS]);
      if (updates.status !== undefined) {
        const isBuyer = existing.buyer_id === req.user!.id;
        const transitions = isBuyer ? BUYER_TRANSITIONS : SELLER_TRANSITIONS;
        const retryCompletedLedger = existing.status === 'completed' && updates.status === 'completed';
        // A guest buyer has no account to confirm delivery, so the seller completes it.
        const sellerCompletesGuestOrder = !isBuyer && !existing.buyer_id && existing.status === 'delivered' && updates.status === 'completed';
        if (!retryCompletedLedger && !sellerCompletesGuestOrder && !transitions[String(existing.status)]?.has(String(updates.status))) {
          apiError.forbidden(res, `You cannot set this order to "${String(updates.status)}"`);
          return;
        }
        // Card/Chapa orders went through a provider; COD and direct-payment orders
        // never passed money through NodBusiness, so they can be cancelled here.
        if (updates.status === 'cancelled' && !['cod', 'direct'].includes(String(existing.payment_provider)) && existing.payment_provider !== null) {
          apiError.forbidden(res, 'Online orders cannot be cancelled here; use the provider refund or return process');
          return;
        }
      }
    }
    if (!Object.keys(updates).length) { apiError.validationError(res, 'No updatable fields provided'); return; }

    const updated = (updates as {status?:string}).status === 'cancelled'
      ? await cancelOrderAndReleaseInventory(pool, req.params.id, String(existing.status))
      : await updateRecord('orders', req.params.id, updates);
    if (!updated) { res.status(409).json({ error: 'Order changed; refresh and try again' }); return; }
    if ((updates as {status?:string}).status === 'completed') {
      // Keep the commission write retryable if a previous request changed the
      // order state but failed while recording the ledger entry. This insert is
      // idempotent by order_id.
      await recordProfileOwnerCommission({ ...existing, ...updated, status: 'completed' });
    }
    if ((updates as {status?:string}).status==='completed' && existing.status!=='completed') {
      await commitOrderInventory(pool, [req.params.id]).catch(err => logger.error({ err }, 'Failed to commit inventory for completed COD order'));
      notifyUser(existing.seller_id as string, `✅ <b>Order Completed</b>\n${existing.product_title}\nAmount: ${existing.total_price} ${existing.currency}`).catch(()=>undefined);
      const buyerId = (existing.buyer_id as string | null) ?? null; // null for guest orders
      if (buyerId) notifyUser(buyerId, `📦 <b>Your order is complete!</b>\n${existing.product_title}\nThank you for shopping on Nodbusiness 👑`).catch(()=>undefined);
      const [buyerNotifResult, sellerNotifResult] = await Promise.all([
        buyerId
          ? pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order','📦 Order completed!',$2,'/orders',false) RETURNING *`, [buyerId, `Your order for ${existing.product_title} is complete.`])
          : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
        pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order','✅ Sale completed!',$2,'/orders',false) RETURNING *`, [existing.seller_id, `Order for ${existing.product_title} has been completed.`]),
      ]);
      const buyerNotif = buyerNotifResult.rows[0];
      const sellerNotif = sellerNotifResult.rows[0];
      if (buyerId && buyerNotif) emitNotification(buyerId, buyerNotif as Record<string,unknown>);
      emitNotification(existing.seller_id as string, sellerNotif as Record<string,unknown>);
      if (buyerId) sendPushToUser(buyerId, '📦 Order completed!', `Your order for ${existing.product_title} is complete.`, '/orders').catch(()=>undefined);
      sendPushToUser(existing.seller_id as string, '✅ Sale completed!', `Order for ${existing.product_title} has been completed.`, '/orders').catch(()=>undefined);
    }
    res.json(clientOrder(updated as Record<string, unknown>));
  } catch (err) {
    logger.error({ err }, 'Failed to update order');
    apiError.serverError(res, 'Failed to update order');
  }
});

// ── Stripe Checkout ───────────────────────────────────────────────────────────
router.post('/checkout/session', platformCheckoutRetired, requireAuth, requireIsolatedPaymentEnvironment, requireFeatureFlag('stripe_payments', 'Stripe payments temporarily disabled'), async (req: Request, res: Response) => {
  if (!isStripeConfigured()) { res.status(503).json({ error: 'Stripe is not configured for this environment' }); return; }
  const createdOrderIds: string[] = [];
  try {
    const frontendUrl = getPrimaryFrontendUrl();
    const body = req.body as Record<string,unknown>;
    const rawItems = Array.isArray(body.items) && (body.items as unknown[]).length
      ? body.items as Array<Record<string,unknown>>
      : [{ product_id: body.product_id, quantity: body.quantity }];
    if (rawItems.length > 100) { apiError.validationError(res, 'A checkout can contain at most 100 cart lines'); return; }
    const requestedQuantities = new Map<string, number>();
    for (const item of rawItems) {
      const productId = typeof item?.product_id === 'string' ? item.product_id.trim() : '';
      const quantity = item?.quantity === undefined ? 1 : Number(item.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
        apiError.validationError(res, 'Each item requires a product_id and an integer quantity between 1 and 1000'); return;
      }
      const combinedQuantity = (requestedQuantities.get(productId) ?? 0) + quantity;
      if (combinedQuantity > 1000) { apiError.validationError(res, 'Combined quantity for a product cannot exceed 1000'); return; }
      requestedQuantities.set(productId, combinedQuantity);
    }
    const requested = [...requestedQuantities].map(([product_id, quantity]) => ({ product_id, quantity }));
    const { rows: products } = await pool.query('SELECT * FROM products WHERE id=ANY($1::uuid[])', [requested.map(i=>i.product_id)]);
    const productById = new Map(products.map((p: Record<string,unknown>) => [p.id as string, p]));
    for (const item of requested) { if (!productById.has(item.product_id)) { apiError.notFound(res, 'One or more products not found'); return; } }
    let partner: Awaited<ReturnType<typeof resolvePartnerAttribution>> = null;
    if (body.partnership_code !== undefined && body.partnership_code !== '') {
      if (requested.length !== 1) { apiError.validationError(res, 'A profile partnership checkout can contain one product at a time'); return; }
      try { partner = await resolvePartnerAttribution(body.partnership_code, requested[0].product_id, req.user!.id); }
      catch (err) { apiError.validationError(res, err instanceof Error ? err.message : 'Invalid partnership link'); return; }
    }
    const groups = new Map<string,{seller_id:string;items:Array<{product:Record<string,unknown>;quantity:number}>;subtotal:number;orderId?:string}>();
    for (const item of requested) {
      const product = productById.get(item.product_id)!;
      if (product.status!=='active') { apiError.validationError(res, `"${product.title}" is not available`); return; }
      if (product.seller_id === req.user!.id) { apiError.validationError(res, 'You cannot purchase your own product'); return; }
      if (product.stock!==null && Number(product.stock)<item.quantity) { apiError.validationError(res, `Only ${product.stock} of "${product.title}" in stock`); return; }
      const productPrice = Number(product.price);
      if (!Number.isFinite(productPrice) || productPrice <= 0) { apiError.validationError(res, `"${product.title}" has an invalid price`); return; }
      const g = groups.get(product.seller_id as string) ?? { seller_id: product.seller_id as string, items:[], subtotal:0 };
      g.items.push({ product, quantity: item.quantity });
      g.subtotal += productPrice * item.quantity;
      groups.set(product.seller_id as string, g);
    }
    type CouponInfo = { id:string; seller_id:string; code:string; discount:number }|null;
    let couponInfo: CouponInfo = null;
    if (body.coupon_code) {
      const code = String(body.coupon_code).toUpperCase();
      const { rows: coupons } = await pool.query(`SELECT * FROM coupons WHERE code=$1 AND seller_id=ANY($2::uuid[]) AND is_active=TRUE AND (expires_at IS NULL OR expires_at>NOW()) AND (usage_limit IS NULL OR usage_count<usage_limit)`, [code, [...groups.keys()]]);
      if (!coupons.length) { apiError.notFound(res, 'Invalid or expired coupon code'); return; }
      const coupon = coupons[0] as Record<string,unknown>;
      const group = groups.get(coupon.seller_id as string)!;
      if (coupon.min_order && group.subtotal < parseFloat(String(coupon.min_order))) { apiError.validationError(res, `Coupon requires minimum order of ${coupon.min_order}`); return; }
      const discount = coupon.discount_type==='percentage' ? group.subtotal*(parseFloat(String(coupon.discount_value))/100) : parseFloat(String(coupon.discount_value));
      couponInfo = { id:coupon.id as string, seller_id:coupon.seller_id as string, code, discount:Math.min(discount,group.subtotal) };
    }
    let chargeCurrency = STRIPE_CURRENCY==='etb'?'etb':'usd';
    let grandSubtotal=0, grandDiscount=0, grandTotal=0;
    for (const group of groups.values()) {
      const subtotal = Math.round(group.subtotal*100)/100;
      const discount = couponInfo && couponInfo.seller_id===group.seller_id ? Math.round(couponInfo.discount*100)/100 : 0;
      const total = Math.max(0, Math.round((subtotal-discount)*100)/100);
      if (total<=0) { apiError.validationError(res, 'Order total must be > 0'); return; }
      const businessId = group.items.find(i=>i.product.business_id)?.product.business_id ?? null;
      const titles = group.items.map(i=>`${i.quantity}× ${i.product.title}`).join(', ');
      const order = await createRecord('orders', {
        buyer_id:req.user!.id, seller_id:group.seller_id, business_id:businessId,
        product_id:group.items[0].product.id, product_title:titles,
        quantity:group.items.reduce((s,i)=>s+i.quantity,0),
        unit_price:parseFloat(String(group.items[0].product.price)),
        total_price:total, currency:'ETB', status:'pending', payment_provider:'stripe',
        amount_subtotal:subtotal, amount_discount:discount,
        profile_partnership_id:partner?.partnershipId,
        profile_owner_id:partner?.profileOwnerId,
        profile_commission_rate:partner?.rate,
        profile_eligible_subtotal:partner ? total : null,
        buyer_name:String(body.buyer_name||''), buyer_email:String(body.buyer_email||req.user!.email||''),
        buyer_phone:String(body.buyer_phone||''), delivery_address:String(body.delivery_address||''), notes:String(body.notes||''),
      });
      createdOrderIds.push(order.id as string);
      group.orderId = String(order.id);
      group.subtotal=subtotal; (group as unknown as Record<string,unknown>).discount=discount; (group as unknown as Record<string,unknown>).total=total;
      grandSubtotal+=subtotal; grandDiscount+=discount; grandTotal+=total;
    }
    grandSubtotal=Math.round(grandSubtotal*100)/100; grandDiscount=Math.round(grandDiscount*100)/100; grandTotal=Math.max(0,Math.round(grandTotal*100)/100);
    await reserveInventoryForOrders([...groups.values()].map(group => ({
      orderId: group.orderId!,
      lines: group.items.map(item => ({ productId: String(item.product.id), quantity: item.quantity })),
    })));
    const cartLabel = [...groups.values()].flatMap(g => g.items.map(i => `${i.quantity}× ${i.product.title}`)).join(', ').slice(0, 450) || 'Nodbusiness order';
    const createCheckoutSession = async (currency: string): Promise<Record<string,unknown>> => {
      const subtotalCents = toChargeCents(grandSubtotal, currency);
      const totalCents = toChargeCents(grandTotal, currency);
      if (subtotalCents <= 0 || totalCents <= 0 || totalCents > subtotalCents) {
        throw new Error('Order total cannot be represented in the selected Stripe currency');
      }
      const sessionParams: Record<string,unknown> = {
        mode:'payment',
        line_items:[{ price_data:{ currency, product_data:{name:cartLabel}, unit_amount:subtotalCents }, quantity:1 }],
        success_url:`${frontendUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}&provider=stripe`,
        cancel_url:`${frontendUrl}/orders/cancel?provider=stripe`,
        metadata:{ purpose:'order', buyer_id:req.user!.id, order_ids:createdOrderIds.join(','), seller_ids:[...groups.keys()].join(','), coupon_id:couponInfo?.id??'' },
      };
      const amountOff = subtotalCents - totalCents;
      if (amountOff > 0) {
        if (!couponInfo) throw new Error('Stripe amount rounding produced an unexpected discount');
        const stripeCoupon = await stripe.coupons.create({
          amount_off:amountOff, currency, duration:'once', name:`Nodbusiness coupon ${couponInfo.code}`,
        });
        sessionParams.discounts = [{ coupon:stripeCoupon.id }];
      }
      return stripe.checkout.sessions.create(sessionParams);
    };
    let session: Record<string,unknown>;
    try { session = await createCheckoutSession(chargeCurrency); }
    catch (e) {
      if (chargeCurrency==='etb') { chargeCurrency='usd'; session=await createCheckoutSession('usd'); }
      else throw e;
    }
    await pool.query('UPDATE orders SET stripe_session_id=$1 WHERE id=ANY($2::uuid[])', [session.id, createdOrderIds]);
    res.json({
      url:session.url, session_id:session.id, order_ids:createdOrderIds,
      display:{ currency:'ETB', subtotal:grandSubtotal, discount:grandDiscount, total:grandTotal, charge_total:Math.round(toChargeCents(grandTotal, chargeCurrency))/100 },
    });
  } catch (err) {
    if (createdOrderIds.length) pool.query(`UPDATE orders SET status='payment_failed',updated_at=NOW() WHERE id=ANY($1::uuid[]) AND stripe_session_id IS NULL AND status='pending'`, [createdOrderIds]).catch(()=>undefined);
    if (createdOrderIds.length) await releaseOrderInventory(pool, createdOrderIds).catch((releaseErr) => logger.error({ err: releaseErr, orderIds: createdOrderIds }, 'Failed to release inventory after Stripe checkout failure'));
    if (err instanceof InventoryUnavailableError) { res.status(409).json({ error: 'Product inventory changed; please review your cart and try again' }); return; }
    logger.error({ err }, 'Stripe session error');
    apiError.serverError(res, 'Failed to create payment session');
  }
});

// ── Stripe Webhook ────────────────────────────────────────────────────────────

async function handleStripeEvent(event: Record<string,unknown>): Promise<void> {
  const type = event.type as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj  = (event.data as any)?.object as Record<string,unknown> ?? {};

  if (type==='checkout.session.completed' || type==='checkout.session.async_payment_succeeded') {
    if (type==='checkout.session.completed' && obj.payment_status!=='paid') return;
    if ((obj.metadata as Record<string,string>)?.purpose==='wallet_topup') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows:pending } = await client.query(`UPDATE wallet_transactions SET type='credit',description='Stripe wallet top-up (confirmed)' WHERE reference=$1 AND type='pending_topup' RETURNING id,wallet_id,amount`, [obj.id]);
        if (!pending.length) { await client.query('COMMIT'); return; }
        const credit = parseFloat(String((obj.metadata as Record<string,string>)?.amount_etb||pending[0].amount));
        await client.query('UPDATE wallets SET balance=balance+$1,updated_at=NOW() WHERE id=$2', [credit, pending[0].wallet_id]);
        await client.query('COMMIT');
      } catch(err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
      return;
    }
    const rows = await transitionPaymentOrders(pool, 'stripe_session_id', String(obj.id), 'paid', String(obj.payment_intent ?? ''));
    recordEvent('payment_result',{provider:'stripe',outcome:rows.length?'paid':'no_pending_match',session:String(obj.id),count:rows.length},{level:rows.length?'info':'warn'});
    const couponId = (obj.metadata as Record<string,string>)?.coupon_id;
    if (couponId) await pool.query('UPDATE coupons SET usage_count=usage_count+1 WHERE id=$1', [couponId]);
    for (const order of rows) {
      notifyUser(order.seller_id as string, `💰 <b>Payment Confirmed!</b>\n${order.product_title}\nAmount: ${order.total_price} ETB via Stripe ✅`).catch(()=>undefined);
      // Confirm email
      pool.query('SELECT email FROM users WHERE id=$1', [order.buyer_id]).then(({rows:buyers}) => {
        if (buyers[0]?.email) sendOrderConfirmation(buyers[0].email as string, order as Parameters<typeof sendOrderConfirmation>[1]).catch(()=>undefined);
      }).catch(()=>undefined);
    }
    return;
  }
  if (type==='checkout.session.expired' || type==='checkout.session.async_payment_failed') {
    recordEvent('payment_result',{provider:'stripe',outcome:'expired',session:String(obj.id)},{level:'warn'});
    if ((obj.metadata as Record<string,string>)?.purpose==='wallet_topup') { await pool.query(`UPDATE wallet_transactions SET type='failed_topup',description='Stripe top-up expired' WHERE reference=$1 AND type='pending_topup'`, [obj.id]); return; }
    await transitionPaymentOrders(pool, 'stripe_session_id', String(obj.id), 'payment_failed');
    return;
  }
  if (type==='payment_intent.payment_failed') {
    if (obj.id) {
      await transitionPaymentOrders(pool, 'stripe_payment_intent_id', String(obj.id), 'payment_failed');
    }
    return;
  }
  if (type==='charge.refunded') {
    // DOUBLE-REFUND REVIEW (bug[6]): buyer compensation happens ONLY via
    // Stripe's automatic card refund - we never credit the buyer wallet here.
    // Wallet adjustments below reverse the SELLER commission (and reverse
    // wallet-topup payments), which is correct and non-duplicative.

    if (!obj.payment_intent) return;
    const isFullRefund = Number(obj.amount_refunded??obj.amount) >= Number(obj.amount);
    const ratio = Number(obj.amount)>0 ? Math.min(1,Number(obj.amount_refunded??obj.amount)/Number(obj.amount)) : 1;
    if ((obj.metadata as Record<string,string>)?.purpose==='wallet_topup') {
      const walletId=(obj.metadata as Record<string,string>)?.wallet_id; const etb=parseFloat(String((obj.metadata as Record<string,string>)?.amount_etb??'0')); const rev=Math.round(etb*ratio*100)/100;
      if (walletId&&rev>0) { await pool.query('UPDATE wallets SET balance=GREATEST(balance-$1,0),updated_at=NOW() WHERE id=$2',[rev,walletId]); await pool.query(`INSERT INTO wallet_transactions (wallet_id,type,amount,description,reference) VALUES ($1,'debit',$2,$3,$4)`,[walletId,rev,`Stripe top-up reversal (${isFullRefund?'full':'partial'})`,(obj.id||obj.payment_intent) as string]); auditLog({ action:'stripe_topup_reversal', entity_type:'wallet', entity_id:walletId, amount:-rev, metadata:{tx_ref:obj.id,reason:isFullRefund?'full_refund':'partial_refund'} }).catch(()=>{}); }
      return;
    }
    const { rows } = await pool.query(`SELECT * FROM orders WHERE stripe_payment_intent_id=$1 AND status IN ('paid','processing','completed')`, [obj.payment_intent]);
    for (const order of rows) {
      if (isFullRefund) await pool.query(`UPDATE orders SET status='refunded',updated_at=NOW() WHERE id=$1`, [order.id]);
      const { rows: creatorCommissions } = await pool.query(
        `SELECT id,eligible_gross,amount,rate,status FROM profile_owner_commissions WHERE order_id=$1 AND status IN ('earned','paid')`,
        [order.id],
      );
      for (const creatorCommission of creatorCommissions as Array<Record<string, unknown>>) {
        const eligibleBase = Number(creatorCommission.eligible_gross) || 0;
        const { rows: priorAdjustments } = await pool.query(
          `SELECT COALESCE(SUM(eligible_subtotal_delta),0) AS base_reversed,
                  COALESCE(SUM(amount_delta),0) AS commission_reversed
             FROM profile_owner_commission_adjustments
            WHERE commission_id=$1 AND provider_object_id=$2 AND reason='refund'`,
          [creatorCommission.id, String(obj.id ?? obj.payment_intent)],
        );
        const alreadyReversedBase = Number(priorAdjustments[0]?.base_reversed) || 0;
        const alreadyReversedAmount = Number(priorAdjustments[0]?.commission_reversed) || 0;
        const originalBase = eligibleBase + alreadyReversedBase;
        const originalAmount = Number(creatorCommission.amount) + alreadyReversedAmount;
        const targetBaseReversed = isFullRefund ? originalBase : Math.min(originalBase, Math.round(originalBase * ratio * 100) / 100);
        const targetAmountReversed = isFullRefund ? originalAmount : Math.min(originalAmount, Math.round(targetBaseReversed * Number(creatorCommission.rate) * 100) / 100);
        const baseReversal = Math.max(0, Math.round((targetBaseReversed - alreadyReversedBase) * 100) / 100);
        const commissionReversal = Math.max(0, Math.round((targetAmountReversed - alreadyReversedAmount) * 100) / 100);
        if (baseReversal <= 0 || commissionReversal < 0) continue;
        await pool.query(
          `WITH adjustment AS (
             INSERT INTO profile_owner_commission_adjustments
               (commission_id,order_id,provider_event_id,provider_object_id,reason,amount_delta,eligible_subtotal_delta)
             VALUES ($1,$2,$3,$4,'refund',$5,$6) ON CONFLICT DO NOTHING RETURNING id
           )
           UPDATE profile_owner_commissions c
              SET eligible_gross=GREATEST(c.eligible_gross-$6,0),
                  amount=GREATEST(c.amount-$5,0),
                  status=CASE WHEN c.status='earned' AND ($7::boolean OR c.amount-$5<=0) THEN 'reversed' ELSE c.status END,
                  updated_at=NOW()
             FROM adjustment WHERE c.id=$1 AND c.status IN ('earned','paid')`,
          [creatorCommission.id, order.id, String(event.id ?? `stripe-refund:${obj.id}`), String(obj.id ?? obj.payment_intent), commissionReversal, baseReversal, isFullRefund],
        );
      }
      const { rows:comms } = await pool.query(`SELECT id,amount FROM commissions WHERE order_id=$1 AND status<>'refunded'`, [order.id]);
      for (const c of comms) {
        const rev=Math.round(parseFloat(String(c.amount))*ratio*100)/100; if(rev<=0) continue;
        if (isFullRefund) await pool.query(`UPDATE commissions SET status='refunded' WHERE id=$1`, [c.id]);
        else await pool.query(`UPDATE commissions SET amount=GREATEST(amount-$1,0) WHERE id=$2`, [rev, c.id]);
        await pool.query('UPDATE wallets SET balance=balance+$1,updated_at=NOW() WHERE user_id=$2', [rev, order.seller_id]);
        await pool.query(`INSERT INTO wallet_transactions (wallet_id,type,amount,description,reference) SELECT id,'credit',$1,$2,$3 FROM wallets WHERE user_id=$4`, [rev,`Commission reversal (${isFullRefund?'full':'partial'})`,order.id,order.seller_id]);
        auditLog({ action:'commission_reversal', entity_type:'wallet', entity_id:order.seller_id as string, amount:rev, metadata:{order_id:order.id, is_full_refund:isFullRefund} }).catch(()=>{});
      }
      notifyUser(order.buyer_id as string, `💸 <b>Refund processed</b>\n${order.product_title}`).catch(()=>undefined);
    }
  }
  if (type === 'charge.dispute.created' || type === 'charge.dispute.closed') {
    const paymentIntentId = String(obj.payment_intent || '');
    const disputeId = String(obj.id || '');
    if (!paymentIntentId || !disputeId) return;
    const { rows: disputedOrders } = await pool.query(
      `SELECT id FROM orders WHERE stripe_payment_intent_id=$1 AND status IN ('paid','processing','completed','disputed')`,
      [paymentIntentId],
    );
    for (const order of disputedOrders as Array<Record<string, unknown>>) {
      if (type === 'charge.dispute.created') {
        const { rows: commissions } = await pool.query(
          `SELECT id,amount,eligible_gross FROM profile_owner_commissions WHERE order_id=$1 AND status IN ('earned','paid')`,
          [order.id],
        );
        for (const commission of commissions as Array<Record<string, unknown>>) {
          await pool.query(
            `WITH adjustment AS (
               INSERT INTO profile_owner_commission_adjustments
                 (commission_id,order_id,provider_event_id,provider_object_id,reason,amount_delta,eligible_subtotal_delta)
               VALUES ($1,$2,$3,$4,'dispute_opened',$5,$6) ON CONFLICT DO NOTHING RETURNING id
             )
             UPDATE profile_owner_commissions c SET status='reversed',amount=0,eligible_gross=0,updated_at=NOW()
              FROM adjustment WHERE c.id=$1 AND c.status='earned'`,
            [commission.id, order.id, String(event.id ?? `stripe-dispute-open:${disputeId}`), disputeId, -Number(commission.amount), -Number(commission.eligible_gross)],
          );
        }
      } else {
        const outcome = String(obj.status || '').toLowerCase();
        if (outcome !== 'won' && outcome !== 'lost') continue;
        if (outcome === 'won') {
          await pool.query(
            `WITH prior AS (
               SELECT a.commission_id,SUM(a.amount_delta) AS amount_delta,SUM(a.eligible_subtotal_delta) AS base_delta
                 FROM profile_owner_commission_adjustments a
                WHERE a.order_id=$1 AND a.provider_object_id=$2 AND a.reason='dispute_opened'
                GROUP BY a.commission_id
             ), adjustment AS (
               INSERT INTO profile_owner_commission_adjustments
                 (commission_id,order_id,provider_event_id,provider_object_id,reason,amount_delta,eligible_subtotal_delta)
               SELECT prior.commission_id,$1,$3,$2,'dispute_won',-prior.amount_delta,-prior.base_delta FROM prior
               ON CONFLICT DO NOTHING RETURNING commission_id,amount_delta,eligible_subtotal_delta
             )
             UPDATE profile_owner_commissions c
                SET amount=GREATEST(c.amount+a.amount_delta,0),eligible_gross=GREATEST(c.eligible_gross+a.eligible_subtotal_delta,0),
                    status=CASE WHEN c.amount+a.amount_delta>0 THEN
                      CASE WHEN EXISTS (SELECT 1 FROM profile_owner_payout_items pi WHERE pi.commission_id=c.id) THEN 'paid' ELSE 'earned' END
                      ELSE 'reversed' END,updated_at=NOW()
               FROM adjustment a WHERE c.id=a.commission_id AND c.status='reversed'`,
            [order.id, disputeId, String(event.id ?? `stripe-dispute-won:${disputeId}`)],
          );
        } else {
          const { rows: commissions } = await pool.query(
            `SELECT id FROM profile_owner_commissions WHERE order_id=$1 AND status='reversed'`,
            [order.id],
          );
          for (const commission of commissions as Array<Record<string, unknown>>) {
            await pool.query(
              `INSERT INTO profile_owner_commission_adjustments
                (commission_id,order_id,provider_event_id,provider_object_id,reason,amount_delta,eligible_subtotal_delta)
               VALUES ($1,$2,$3,$4,'dispute_lost',0,0) ON CONFLICT DO NOTHING`,
              [commission.id, order.id, String(event.id ?? `stripe-dispute-lost:${disputeId}`), disputeId],
            );
          }
        }
      }
    }
  }
}

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    await withVerifiedStripeWebhook(
      req.body as Buffer,
      req.headers['stripe-signature'] as string | undefined,
      { real: process.env.STRIPE_WEBHOOK_SECRET, demo: process.env.STRIPE_TEST_WEBHOOK_SECRET },
      async (event: Record<string, unknown>) => {
    // Atomic claim: only ONE concurrent delivery can insert the event id.
    // (A check-then-insert race allowed duplicate deliveries to both process.)
    const claimed = await pool.query(
      'INSERT INTO webhook_events (id,type) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING RETURNING id',
      [event.id, event.type],
    );
    if (!claimed.rows.length) { res.json({ received:true, duplicate:true }); return; }
    try {
      await handleStripeEvent(event);
    } catch (processErr) {
      // Release the claim so Stripe's redelivery is processed instead of
      // being misread as a duplicate.
      await pool.query('DELETE FROM webhook_events WHERE id=$1', [event.id]).catch(()=>undefined);
      throw processErr;
    }
    res.json({ received: true });
      },
    );
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('signature')) { res.status(400).json({ error: 'Invalid Stripe webhook signature' }); return; }
    logger.error({ err: message }, 'Stripe webhook processing failed');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── Chapa checkout ─────────────────────────────────────────────────────────────
router.post('/checkout/chapa', platformCheckoutRetired, requireAuth, requireIsolatedPaymentEnvironment, requireFeatureFlag('chapa_payments', 'Chapa payments temporarily disabled'), async (req: Request, res: Response) => {
  if (!CHAPA_SECRET) { res.status(503).json({ error: 'Chapa not configured' }); return; }
  if (CHAPA_SANDBOX && process.env.NODE_ENV === 'production') { res.status(503).json({ error: 'Chapa sandbox is disabled in production' }); return; }
  const body = req.body as Record<string,unknown>;
  const { product_id, quantity=1, buyer_name, buyer_email, buyer_phone, delivery_address, notes } = body;
  if (!product_id) { apiError.validationError(res,'product_id is required'); return; }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000) { apiError.validationError(res, 'quantity must be an integer between 1 and 1000'); return; }
  let orderId: string | null = null;
  let inventoryReserved = false;
  let txRef: string | null = null;
  try {
    const product = await getRecord<Record<string,unknown>>('products', product_id as string);
    if (!product) { apiError.notFound(res,'Product not found'); return; }
    if (product.seller_id === req.user!.id) { apiError.validationError(res, 'You cannot purchase your own product'); return; }
    if (product.status !== 'active') { apiError.validationError(res, 'This product is not available'); return; }
    if (product.stock !== null && product.stock !== undefined && Number(product.stock) < qty) {
      apiError.validationError(res, `Only ${product.stock} of this product are in stock`); return;
    }
    let partner: Awaited<ReturnType<typeof resolvePartnerAttribution>> = null;
    try { partner = await resolvePartnerAttribution(body.partnership_code, String(product.id), req.user!.id); }
    catch (err) { apiError.validationError(res, err instanceof Error ? err.message : 'Invalid partnership link'); return; }
    const unitPrice = Number(product.price);
    const total = Math.round(unitPrice * qty * 100) / 100;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(total) || total <= 0 || total > 10_000_000) {
      apiError.validationError(res, 'Product price is invalid'); return;
    }
    txRef = `ndb-${req.user!.id.slice(0,8)}-${Date.now()}`;
    const frontendUrl = getPrimaryFrontendUrl();
    const apiUrl = process.env.API_URL??'http://localhost:3001';
    const order = await createRecord('orders', {
      buyer_id:req.user!.id, seller_id:product.seller_id, business_id:product.business_id ?? null,
      product_id, product_title:product.title,
      quantity:qty, unit_price:unitPrice, total_price:total, currency:'ETB',
      status:'pending', payment_provider:'chapa', chapa_tx_ref:txRef,
      profile_partnership_id:partner?.partnershipId,
      profile_owner_id:partner?.profileOwnerId,
      profile_commission_rate:partner?.rate,
      profile_eligible_subtotal:partner ? total : null,
      buyer_name:String(buyer_name||''), buyer_email:String(buyer_email||req.user!.email||''),
      buyer_phone:String(buyer_phone||''), delivery_address:String(delivery_address||''), notes:String(notes||''),
    });
    orderId = String(order.id);
    await reserveInventoryForOrders([{ orderId, lines: [{ productId: String(product.id), quantity: qty }] }]);
    inventoryReserved = true;
    const chapaRes = await chapaPost('/transaction/initialize', {
      amount:String(total), currency:'ETB', email:buyer_email||req.user!.email||'user@nodbusiness.app',
      first_name:String(buyer_name||'User'), tx_ref:txRef,
      callback_url:`${apiUrl}/api/orders/chapa/verify/${txRef}`,
      return_url:`${frontendUrl}/orders/success?tx_ref=${txRef}&provider=chapa`,
    });
    if (chapaRes.status!=='success') {
      await pool.query(`UPDATE orders SET status='payment_failed',updated_at=NOW() WHERE id=$1 AND status='pending'`, [orderId]);
      await releaseOrderInventory(pool, [orderId]);
      inventoryReserved = false;
      apiError.serverError(res,'Failed to initialize Chapa payment'); return;
    }
    res.json({ url:(chapaRes.data as Record<string,string>).checkout_url, tx_ref:txRef, order_id:order.id });
  } catch (err) {
    if (orderId) await pool.query(`UPDATE orders SET status='payment_failed',updated_at=NOW() WHERE id=$1 AND status='pending'`, [orderId]).catch(() => undefined);
    if (inventoryReserved && orderId) await releaseOrderInventory(pool, [orderId]).catch(releaseErr => logger.error({ err:releaseErr, orderId }, 'Failed to release inventory after Chapa checkout failure'));
    if (err instanceof InventoryUnavailableError) { res.status(409).json({ error: 'Product inventory changed; please review your cart and try again' }); return; }
    logger.error({err},'Chapa checkout error'); apiError.serverError(res,'Failed to create Chapa session');
  }
});

// Chapa sandbox page — dev/test only. Never expose a fake payment
// confirmation surface in production, even if a sandbox secret leaks.
router.get('/chapa/sandbox', (req: Request, res: Response) => {
  if (!CHAPA_SANDBOX || process.env.NODE_ENV === 'production') { res.status(404).json({ error: 'Not found' }); return; }
  const { tx_ref, return_url } = req.query as Record<string,string>;
  const safe = (s: string) => String(s||'').replace(/[<>"'&]/g,c=>`&#${c.charCodeAt(0)};`);
  const safeReturn = return_url ? decodeURIComponent(return_url) : getPrimaryFrontendUrl();
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Chapa Sandbox</title></head><body style="font-family:sans-serif;text-align:center;padding:2rem"><h1>🇪🇹 Chapa Sandbox</h1><p>ref: ${safe(tx_ref)}</p><button onclick="pay()" style="background:#16a34a;color:#fff;padding:1rem 2rem;border:none;border-radius:8px;cursor:pointer;font-size:1rem">✅ Confirm Payment</button><script>async function pay(){window.location.href='${safeReturn}';}</script></body></html>`);
});

// Chapa payment status (read-only, DB-only)
// Frontend polls this while the Chapa window is open. Confirmation still
// arrives server-side via GET /chapa/verify/:tx_ref (Chapa callback_url) —
// polling here never triggers upstream Chapa verification calls.
router.get('/chapa/status/:tx_ref', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<{ status: string }>(
      'SELECT status FROM orders WHERE chapa_tx_ref=$1 ORDER BY created_at DESC LIMIT 1',
      [req.params.tx_ref],
    );
    res.json({ status: rows[0]?.status ?? null });
  } catch { apiError.serverError(res, 'Failed to fetch payment status'); }
});

// Chapa verify
router.get('/chapa/verify/:tx_ref', async (req: Request, res: Response) => {
  if (!CHAPA_SECRET) { res.status(503).json({ error:'Chapa not configured' }); return; }
  if (CHAPA_SANDBOX && process.env.NODE_ENV === 'production') { res.status(404).json({ error: 'Not found' }); return; }
  const { tx_ref } = req.params;
  const frontendUrl = process.env.FRONTEND_URL??'http://localhost:3002';
  try {
    const chapaRes = await chapaGet(`/transaction/verify/${tx_ref}`);
    const ok = chapaRes.status==='success' && (chapaRes.data as Record<string,string>)?.status==='success';
    if (!ok && !CHAPA_SANDBOX) {
      await transitionPaymentOrders(pool, 'chapa_tx_ref', tx_ref, 'payment_failed');
      if (req.headers.accept?.includes('text/html')) { res.redirect(`${frontendUrl}/orders/cancel?provider=chapa`); return; }
      apiError.validationError(res,'Payment not successful'); return;
    }
    const rows = await transitionPaymentOrders(pool, 'chapa_tx_ref', tx_ref, 'paid');
    for (const order of rows) {
      notifyUser(order.seller_id as string, `💰 <b>Payment Confirmed!</b>\n${order.product_title}\nAmount: ${order.total_price} ${order.currency||'ETB'} via Chapa ✅`).catch(()=>undefined);
      sendPushToUser(order.seller_id as string,'💰 Payment received!',`${order.product_title} — ${order.total_price} ETB via Chapa`,'/orders').catch(()=>undefined);
      sendPushToUser(order.buyer_id as string,'✅ Payment confirmed!',`Your payment for ${order.product_title} was successful.`,'/orders').catch(()=>undefined);
      const [{ rows:[buyerNotif] },{ rows:[sellerNotif] }] = await Promise.all([
        pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order','✅ Payment confirmed!',$2,'/orders',false) RETURNING *`, [order.buyer_id, `Your payment for ${order.product_title} was confirmed via Chapa.`]),
        pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order','💰 Payment received!',$2,'/orders',false) RETURNING *`, [order.seller_id, `Payment for ${order.product_title} was received via Chapa.`]),
      ]);
      emitNotification(order.buyer_id as string, buyerNotif as Record<string,unknown>);
      emitNotification(order.seller_id as string, sellerNotif as Record<string,unknown>);
    }
    if (req.headers.accept?.includes('text/html')) { res.redirect(`${frontendUrl}/orders/success?tx_ref=${tx_ref}&provider=chapa`); return; }
    res.json({ success:true, tx_ref, order:rows[0]??null });
  } catch (err) { logger.error({err},'Chapa verify error'); apiError.serverError(res,'Failed to verify Chapa payment'); }
});

module.exports = router;
module.exports.handleStripeEvent = handleStripeEvent;
