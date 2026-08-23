/**
 * routes/orders.ts — Orders, Stripe + Chapa payments, webhooks
 *
 * Phase improvements:
 *   - Keyset cursor pagination on GET /
 *   - Stripe checkout: all prices computed server-side
 *   - Webhook: idempotent event processing via webhook_events table
 *   - Commission collected via atomicWalletOp (Phase 1 Task 4)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { getRecord, createRecord, updateRecord } from '../utils/crud';
import { collectCommission } from './commission';
import { notifyUser } from './telegram';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';
import { sendOrderConfirmation } from '../utils/mailer';
import * as apiError from '../lib/apiError';
import { getPrimaryFrontendUrl } from '../lib/frontendUrl';
import { isEnabled } from '../lib/featureFlags';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY ?? 'usd').toLowerCase();
const STRIPE_ETB_TO_USD_RATE = (() => { const r = parseFloat(process.env.STRIPE_ETB_TO_USD_RATE ?? '0.008'); return Number.isFinite(r) && r > 0 ? r : 0.008; })();
const CHAPA_SECRET  = process.env.CHAPA_SECRET_KEY ?? null;
const CHAPA_SANDBOX = CHAPA_SECRET === 'SANDBOX';

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
    res.json({ orders: rows, next_cursor: rows.length===lim ? rows[rows.length-1].created_at : null });
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
    res.json(order);
  } catch { apiError.serverError(res, 'Failed to fetch order'); }
});

// ── Field allowlists ──────────────────────────────────────────────────────────
// Clients must never be able to write payment state, money columns, or
// ownership columns directly (mass assignment).

/** Columns a client may set when creating a cash-on-delivery order. */
const COD_CREATE_FIELDS = [
  'seller_id', 'product_id', 'business_id', 'product_title', 'quantity',
  'unit_price', 'total_price', 'buyer_name', 'buyer_email', 'buyer_phone',
  'delivery_address', 'notes',
] as const;

/** Columns order parties may update on an existing order. */
const ORDER_UPDATE_FIELDS = new Set([
  'status', 'buyer_name', 'buyer_email', 'buyer_phone', 'delivery_address', 'notes',
]);

/** Order statuses a non-admin party may transition to. */
const BUYER_STATUSES = new Set(['cancelled', 'disputed', 'completed']);
const SELLER_STATUSES = new Set(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);

function pickAllowed(body: Record<string, unknown>, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// Create COD order
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = pickAllowed(req.body as Record<string, unknown>, COD_CREATE_FIELDS);
    const { seller_id, product_title, total_price } = data as Record<string, unknown>;
    if (!seller_id || !product_title || total_price == null) { apiError.validationError(res, 'seller_id, product_title, and total_price are required'); return; }
    const price = parseFloat(String(total_price));
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) { apiError.validationError(res, 'total_price must be a positive amount'); return; }
    // Server-owned columns — client values are ignored.
    const order = await createRecord('orders', {
      ...data,
      total_price: price,
      buyer_id: req.user!.id,
      status: 'pending',
      currency: 'ETB',
      payment_provider: 'cod',
    });
    res.status(201).json(order);
    try {
      const { rows: buyers } = await pool.query('SELECT email FROM users WHERE id=$1', [req.user!.id]);
      if (buyers[0]?.email) sendOrderConfirmation(buyers[0].email as string, order as unknown as Parameters<typeof sendOrderConfirmation>[1]).catch(()=>undefined);
    } catch { /* non-fatal */ }
  } catch (err) {
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
        const allowed = isBuyer ? BUYER_STATUSES : SELLER_STATUSES;
        if (!allowed.has(String(updates.status))) {
          apiError.forbidden(res, `You cannot set this order to "${String(updates.status)}"`);
          return;
        }
      }
    }
    if (!Object.keys(updates).length) { apiError.validationError(res, 'No updatable fields provided'); return; }

    const updated = await updateRecord('orders', req.params.id, updates);
    if ((updates as {status?:string}).status==='completed' && existing.status!=='completed') {
      collectCommission(existing.id as string, existing.seller_id as string, parseFloat(String(existing.total_price))).catch(err => logger.error({err},'Commission failed'));
      notifyUser(existing.seller_id as string, `✅ <b>Order Completed</b>\n${existing.product_title}\nAmount: ${existing.total_price} ${existing.currency}`).catch(()=>undefined);
      notifyUser(existing.buyer_id as string, `📦 <b>Your order is complete!</b>\n${existing.product_title}\nThank you for shopping on Nodbusiness 👑`).catch(()=>undefined);
      const [buyerNotifResult, sellerNotifResult] = await Promise.all([
        pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order','📦 Order completed!',$2,'/orders',false) RETURNING *`, [existing.buyer_id, `Your order for ${existing.product_title} is complete.`]),
        pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order','✅ Sale completed!',$2,'/orders',false) RETURNING *`, [existing.seller_id, `Order for ${existing.product_title} has been completed.`]),
      ]);
      const buyerNotif = buyerNotifResult.rows[0];
      const sellerNotif = sellerNotifResult.rows[0];
      emitNotification(existing.buyer_id as string, buyerNotif as Record<string,unknown>);
      emitNotification(existing.seller_id as string, sellerNotif as Record<string,unknown>);
      sendPushToUser(existing.buyer_id as string, '📦 Order completed!', `Your order for ${existing.product_title} is complete.`, '/orders').catch(()=>undefined);
      sendPushToUser(existing.seller_id as string, '✅ Sale completed!', `Order for ${existing.product_title} has been completed.`, '/orders').catch(()=>undefined);
    }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'Failed to update order');
    apiError.serverError(res, 'Failed to update order');
  }
});

// ── Stripe Checkout ───────────────────────────────────────────────────────────
router.post('/checkout/session', requireAuth, async (req: Request, res: Response) => {
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }
  try { if (!(await isEnabled('stripe_payments'))) { res.status(503).json({ error: 'Stripe payments temporarily disabled' }); return; } } catch { /* fall through */ }
  const createdOrderIds: string[] = [];
  try {
    const frontendUrl = getPrimaryFrontendUrl();
    const body = req.body as Record<string,unknown>;
    const rawItems = Array.isArray(body.items) && (body.items as unknown[]).length ? body.items as Array<Record<string,unknown>> : [{ product_id: body.product_id, quantity: body.quantity }];
    const requested = (rawItems as Array<Record<string,unknown>>).map(i=>({ product_id: i?.product_id as string, quantity: Math.max(1, parseInt(String(i?.quantity||1), 10)) })).filter(i=>i.product_id);
    if (!requested.length) { apiError.validationError(res, 'product_id or items is required'); return; }
    const { rows: products } = await pool.query('SELECT * FROM products WHERE id=ANY($1::uuid[])', [requested.map(i=>i.product_id)]);
    const productById = new Map(products.map((p: Record<string,unknown>) => [p.id as string, p]));
    for (const item of requested) { if (!productById.has(item.product_id)) { apiError.notFound(res, 'One or more products not found'); return; } }
    const groups = new Map<string,{seller_id:string;items:Array<{product:Record<string,unknown>;quantity:number}>;subtotal:number}>();
    for (const item of requested) {
      const product = productById.get(item.product_id)!;
      if (product.status==='draft') { apiError.validationError(res, `"${product.title}" is not available`); return; }
      if (product.stock!==null && Number(product.stock)<item.quantity) { apiError.validationError(res, `Only ${product.stock} of "${product.title}" in stock`); return; }
      const g = groups.get(product.seller_id as string) ?? { seller_id: product.seller_id as string, items:[], subtotal:0 };
      g.items.push({ product, quantity: item.quantity });
      g.subtotal += parseFloat(String(product.price)) * item.quantity;
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
        buyer_name:String(body.buyer_name||''), buyer_email:String(body.buyer_email||req.user!.email||''),
        buyer_phone:String(body.buyer_phone||''), delivery_address:String(body.delivery_address||''), notes:String(body.notes||''),
      });
      createdOrderIds.push(order.id as string);
      group.subtotal=subtotal; (group as unknown as Record<string,unknown>).discount=discount; (group as unknown as Record<string,unknown>).total=total;
      grandSubtotal+=subtotal; grandDiscount+=discount; grandTotal+=total;
    }
    grandSubtotal=Math.round(grandSubtotal*100)/100; grandDiscount=Math.round(grandDiscount*100)/100; grandTotal=Math.max(0,Math.round(grandTotal*100)/100);
    const buildLineItems = (cur: string) => {
      const items: unknown[] = [];
      for (const group of groups.values()) {
        for (const i of group.items) {
          items.push({ price_data:{ currency:cur, product_data:{name:i.product.title}, unit_amount:toChargeCents(parseFloat(String(i.product.price)),cur) }, quantity:i.quantity });
        }
      }
      if (grandDiscount>0) items.push({ price_data:{ currency:cur, product_data:{name:`Coupon (${couponInfo!.code})`}, unit_amount:-toChargeCents(grandDiscount,cur) }, quantity:1 });
      const expected=toChargeCents(grandTotal,cur); const sum=(items as Array<{price_data:{unit_amount:number};quantity:number}>).reduce((s,it)=>s+it.price_data.unit_amount*it.quantity,0);
      const drift=expected-sum; if(drift!==0) items.push({ price_data:{ currency:cur, product_data:{name:'Rounding adjustment'}, unit_amount:drift }, quantity:1 });
      return items;
    };
    const sessionParams = {
      mode:'payment', line_items:buildLineItems(chargeCurrency),
      success_url:`${frontendUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}&provider=stripe`,
      cancel_url:`${frontendUrl}/orders/cancel?provider=stripe`,
      metadata:{ purpose:'order', buyer_id:req.user!.id, order_ids:createdOrderIds.join(','), seller_ids:[...groups.keys()].join(','), coupon_id:couponInfo?.id??'' },
    };
    let session: Record<string,unknown>;
    try { session = await stripe.checkout.sessions.create(sessionParams); }
    catch (e) {
      if (chargeCurrency==='etb') { chargeCurrency='usd'; (sessionParams as Record<string,unknown>).line_items=buildLineItems('usd'); session=await stripe.checkout.sessions.create(sessionParams); }
      else throw e;
    }
    await pool.query('UPDATE orders SET stripe_session_id=$1 WHERE id=ANY($2::uuid[])', [session.id, createdOrderIds]);
    res.json({
      url:session.url, session_id:session.id, order_ids:createdOrderIds,
      display:{ currency:'ETB', subtotal:grandSubtotal, discount:grandDiscount, total:grandTotal, charge_total:Math.round(toChargeCents(grandTotal, chargeCurrency))/100 },
    });
  } catch (err) {
    if (createdOrderIds.length) pool.query(`UPDATE orders SET status='payment_failed',updated_at=NOW() WHERE id=ANY($1::uuid[]) AND stripe_session_id IS NULL AND status='pending'`, [createdOrderIds]).catch(()=>undefined);
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
    const { rows } = await pool.query(`UPDATE orders SET status='paid',stripe_payment_intent_id=$1,updated_at=NOW() WHERE stripe_session_id=$2 AND status='pending' RETURNING *`, [obj.payment_intent??null, obj.id]);
    const couponId = (obj.metadata as Record<string,string>)?.coupon_id;
    if (couponId) await pool.query('UPDATE coupons SET usage_count=usage_count+1 WHERE id=$1', [couponId]);
    for (const order of rows) {
      collectCommission(order.id as string, order.seller_id as string, parseFloat(String(order.total_price))).catch(()=>undefined);
      notifyUser(order.seller_id as string, `💰 <b>Payment Confirmed!</b>\n${order.product_title}\nAmount: ${order.total_price} ETB via Stripe ✅`).catch(()=>undefined);
      // Decrement stock
      if (order.product_id) pool.query('UPDATE products SET stock=GREATEST(0,stock-$1) WHERE id=$2 AND stock IS NOT NULL', [order.quantity??1, order.product_id]).catch(()=>undefined);
      // Confirm email
      pool.query('SELECT email FROM users WHERE id=$1', [order.buyer_id]).then(({rows:buyers}) => {
        if (buyers[0]?.email) sendOrderConfirmation(buyers[0].email as string, order as Parameters<typeof sendOrderConfirmation>[1]).catch(()=>undefined);
      }).catch(()=>undefined);
    }
    return;
  }
  if (type==='checkout.session.expired') {
    if ((obj.metadata as Record<string,string>)?.purpose==='wallet_topup') { await pool.query(`UPDATE wallet_transactions SET type='failed_topup',description='Stripe top-up expired' WHERE reference=$1 AND type='pending_topup'`, [obj.id]); return; }
    await pool.query(`UPDATE orders SET status='payment_failed',updated_at=NOW() WHERE stripe_session_id=$1 AND status='pending'`, [obj.id]);
    return;
  }
  if (type==='payment_intent.payment_failed') {
    if (obj.id) await pool.query(`UPDATE orders SET status='payment_failed',updated_at=NOW() WHERE stripe_payment_intent_id=$1 AND status='pending'`, [obj.id]);
    return;
  }
  if (type==='charge.refunded') {
    if (!obj.payment_intent) return;
    const isFullRefund = Number(obj.amount_refunded??obj.amount) >= Number(obj.amount);
    const ratio = Number(obj.amount)>0 ? Math.min(1,Number(obj.amount_refunded??obj.amount)/Number(obj.amount)) : 1;
    if ((obj.metadata as Record<string,string>)?.purpose==='wallet_topup') {
      const walletId=(obj.metadata as Record<string,string>)?.wallet_id; const etb=parseFloat(String((obj.metadata as Record<string,string>)?.amount_etb??'0')); const rev=Math.round(etb*ratio*100)/100;
      if (walletId&&rev>0) { await pool.query('UPDATE wallets SET balance=GREATEST(balance-$1,0),updated_at=NOW() WHERE id=$2',[rev,walletId]); await pool.query(`INSERT INTO wallet_transactions (wallet_id,type,amount,description,reference) VALUES ($1,'debit',$2,$3,$4)`,[walletId,rev,`Stripe top-up reversal (${isFullRefund?'full':'partial'})`,(obj.id||obj.payment_intent) as string]); }
      return;
    }
    const { rows } = await pool.query(`SELECT * FROM orders WHERE stripe_payment_intent_id=$1 AND status IN ('paid','processing','completed')`, [obj.payment_intent]);
    for (const order of rows) {
      if (isFullRefund) await pool.query(`UPDATE orders SET status='refunded',updated_at=NOW() WHERE id=$1`, [order.id]);
      const { rows:comms } = await pool.query(`SELECT id,amount FROM commissions WHERE order_id=$1 AND status<>'refunded'`, [order.id]);
      for (const c of comms) {
        const rev=Math.round(parseFloat(String(c.amount))*ratio*100)/100; if(rev<=0) continue;
        if (isFullRefund) await pool.query(`UPDATE commissions SET status='refunded' WHERE id=$1`, [c.id]);
        else await pool.query(`UPDATE commissions SET amount=GREATEST(amount-$1,0) WHERE id=$2`, [rev, c.id]);
        await pool.query('UPDATE wallets SET balance=balance+$1,updated_at=NOW() WHERE user_id=$2', [rev, order.seller_id]);
        await pool.query(`INSERT INTO wallet_transactions (wallet_id,type,amount,description,reference) SELECT id,'credit',$1,$2,$3 FROM wallets WHERE user_id=$4`, [rev,`Commission reversal (${isFullRefund?'full':'partial'})`,order.id,order.seller_id]);
      }
      notifyUser(order.buyer_id as string, `💸 <b>Refund processed</b>\n${order.product_title}`).catch(()=>undefined);
    }
  }
}

router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }
  const sig = req.headers['stripe-signature'] as string;
  let event: Record<string,unknown>;
  try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET) as Record<string,unknown>; }
  catch (err) { apiError.validationError(res, `Webhook error: ${(err as Error).message}`); return; }
  try {
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
  } catch (err) {
    logger.error({ err: (err as Error).message, eventId: event.id, type: event.type }, 'Stripe webhook processing failed');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── Chapa checkout ─────────────────────────────────────────────────────────────
router.post('/checkout/chapa', requireAuth, async (req: Request, res: Response) => {
  if (!CHAPA_SECRET) { res.status(503).json({ error: 'Chapa not configured' }); return; }
  const body = req.body as Record<string,unknown>;
  const { product_id, quantity=1, buyer_name, buyer_email, buyer_phone, delivery_address, notes } = body;
  if (!product_id) { apiError.validationError(res,'product_id is required'); return; }
  try {
    const product = await getRecord<Record<string,unknown>>('products', product_id as string);
    if (!product) { apiError.notFound(res,'Product not found'); return; }
    const qty = Math.max(1, parseInt(String(quantity),10));
    const total = Math.round(parseFloat(String(product.price))*qty*100)/100;
    const tx_ref = `ndb-${req.user!.id.slice(0,8)}-${Date.now()}`;
    const frontendUrl = getPrimaryFrontendUrl();
    const apiUrl = process.env.API_URL??'http://localhost:3001';
    const order = await createRecord('orders', {
      buyer_id:req.user!.id, seller_id:product.seller_id, product_id, product_title:product.title,
      quantity:qty, unit_price:parseFloat(String(product.price)), total_price:total, currency:'ETB',
      status:'pending', payment_provider:'chapa', chapa_tx_ref:tx_ref,
      buyer_name:String(buyer_name||''), buyer_email:String(buyer_email||req.user!.email||''),
      buyer_phone:String(buyer_phone||''), delivery_address:String(delivery_address||''), notes:String(notes||''),
    });
    const chapaRes = await chapaPost('/transaction/initialize', {
      amount:String(total), currency:'ETB', email:buyer_email||req.user!.email||'user@nodbusiness.app',
      first_name:String(buyer_name||'User'), tx_ref,
      callback_url:`${apiUrl}/api/orders/chapa/verify/${tx_ref}`,
      return_url:`${frontendUrl}/orders/success?tx_ref=${tx_ref}&provider=chapa`,
    });
    if (chapaRes.status!=='success') { apiError.serverError(res,'Failed to initialize Chapa payment'); return; }
    res.json({ url:(chapaRes.data as Record<string,string>).checkout_url, tx_ref, order_id:order.id });
  } catch (err) { logger.error({err},'Chapa checkout error'); apiError.serverError(res,'Failed to create Chapa session'); }
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

// Chapa verify
router.get('/chapa/verify/:tx_ref', async (req: Request, res: Response) => {
  if (!CHAPA_SECRET) { res.status(503).json({ error:'Chapa not configured' }); return; }
  const { tx_ref } = req.params;
  const frontendUrl = process.env.FRONTEND_URL??'http://localhost:3000';
  try {
    const chapaRes = await chapaGet(`/transaction/verify/${tx_ref}`);
    const ok = chapaRes.status==='success' && (chapaRes.data as Record<string,string>)?.status==='success';
    if (!ok && !CHAPA_SANDBOX) {
      await pool.query(`UPDATE orders SET status='payment_failed',updated_at=NOW() WHERE chapa_tx_ref=$1 AND status='pending'`, [tx_ref]);
      if (req.headers.accept?.includes('text/html')) { res.redirect(`${frontendUrl}/orders/cancel?provider=chapa`); return; }
      apiError.validationError(res,'Payment not successful'); return;
    }
    const { rows } = await pool.query(`UPDATE orders SET status='paid',updated_at=NOW() WHERE chapa_tx_ref=$1 AND status='pending' RETURNING *`, [tx_ref]);
    for (const order of rows) {
      collectCommission(order.id as string, order.seller_id as string, parseFloat(String(order.total_price))).catch(()=>undefined);
      if (order.product_id) pool.query('UPDATE products SET stock=GREATEST(0,stock-$1) WHERE id=$2 AND stock IS NOT NULL', [order.quantity??1, order.product_id]).catch(()=>undefined);
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
