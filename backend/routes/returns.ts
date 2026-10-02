import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';

const router = Router();

// Return requests are always scoped through the order's buyer/seller IDs.
// The role query parameter is retained for the existing Orders page contract.
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const sellerView = req.query.role === 'seller';
  try {
    const { rows } = await pool.query(
      `SELECT rr.*,o.product_title,o.total_price,o.currency,o.payment_provider,o.status AS order_status,
              o.seller_id,o.buyer_id,up.display_name AS buyer_name
       FROM return_requests rr JOIN orders o ON o.id=rr.order_id
       LEFT JOIN user_profiles up ON up.user_id=o.buyer_id
       WHERE o.${sellerView ? 'seller_id' : 'buyer_id'}=$1 ORDER BY rr.created_at DESC`,
      [req.user!.id],
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch return requests' });
  }
});

// Kept as a compatible seller-specific endpoint for API consumers.
router.get('/seller', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT rr.*,o.product_title,o.total_price,o.currency,o.payment_provider,o.status AS order_status,
              o.seller_id,o.buyer_id,up.display_name AS buyer_name
       FROM return_requests rr JOIN orders o ON o.id=rr.order_id
       LEFT JOIN user_profiles up ON up.user_id=o.buyer_id
       WHERE o.seller_id=$1 ORDER BY rr.created_at DESC`,
      [req.user!.id],
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch return requests' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { order_id, reason, details } = req.body as Record<string, unknown>;
  if (typeof order_id !== 'string' || typeof reason !== 'string' || !reason.trim()) {
    res.status(400).json({ error: 'order_id and reason are required' });
    return;
  }
  if (reason.length > 500 || (details !== undefined && (typeof details !== 'string' || details.length > 5000))) {
    res.status(400).json({ error: 'Reason or details exceed the allowed length' });
    return;
  }

  const client = await pool.connect();
  let sellerId = '';
  let productTitle = '';
  let returnRequest: Record<string, unknown> | undefined;
  try {
    await client.query('BEGIN');
    const { rows: orders } = await client.query(
      `SELECT * FROM orders WHERE id=$1 AND buyer_id=$2 FOR UPDATE`,
      [order_id, req.user!.id],
    );
    if (!orders.length || !['paid', 'processing', 'completed'].includes(String(orders[0].status))) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Order not found or not eligible for return' });
      return;
    }
    const order = orders[0] as Record<string, unknown>;
    const { rows: pending } = await client.query(
      `SELECT id FROM return_requests WHERE order_id=$1 AND status='pending' LIMIT 1`,
      [order_id],
    );
    if (pending.length) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'A return request is already pending for this order' });
      return;
    }
    const { rows } = await client.query(
      `INSERT INTO return_requests (order_id,buyer_id,seller_id,reason,details,refund_amount)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [order_id, req.user!.id, order.seller_id, reason.trim(), typeof details === 'string' ? details.trim() || null : null, order.total_price],
    );
    returnRequest = rows[0] as Record<string, unknown>;
    sellerId = String(order.seller_id);
    productTitle = String(order.product_title ?? 'your order');
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK').catch(() => undefined);
    res.status(500).json({ error: 'Failed to create return request' });
    return;
  } finally {
    client.release();
  }

  try {
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id,type,title,body,link,is_read)
       VALUES ($1,'order','↩️ Return request',$2,'/orders',false) RETURNING *`,
      [sellerId, `Buyer requested a return for order: ${productTitle}`],
    );
    emitNotification(sellerId, notif as Record<string, unknown>);
    sendPushToUser(sellerId, '↩️ Return request', `Buyer requested a return for: ${productTitle}`, '/orders').catch(() => undefined);
  } catch { /* Notification delivery is best effort after the request is committed. */ }
  res.status(201).json(returnRequest);
});

async function resolveReturn(req: Request, res: Response, status: 'approved' | 'rejected'): Promise<void> {
  const client = await pool.connect();
  let buyerId = '';
  let productTitle = '';
  let currency = '';
  let refundAmount = 0;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT rr.*,o.seller_id AS order_seller_id,o.buyer_id AS order_buyer_id,
              o.product_title,o.total_price,o.currency,o.status AS order_status
       FROM return_requests rr JOIN orders o ON o.id=rr.order_id
       WHERE rr.id=$1 FOR UPDATE OF rr,o`,
      [req.params.id],
    );
    if (!rows.length) {
      await client.query('ROLLBACK'); res.status(404).json({ error: 'Return request not found' }); return;
    }
    const ret = rows[0] as Record<string, unknown>;
    if (ret.order_seller_id !== req.user!.id && req.user!.role !== 'admin') {
      await client.query('ROLLBACK'); res.status(403).json({ error: 'Forbidden' }); return;
    }
    if (ret.status !== 'pending') {
      await client.query('ROLLBACK'); res.status(409).json({ error: 'Return request is no longer pending' }); return;
    }

    if (status === 'approved') {
      const requestedAmount = (req.body as Record<string, unknown>).refund_amount;
      refundAmount = requestedAmount === undefined || requestedAmount === ''
        ? Number(ret.refund_amount ?? ret.total_price)
        : Number(requestedAmount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > Number(ret.total_price)) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Refund amount must be greater than zero and no more than the order total' });
        return;
      }
      await client.query(
        `UPDATE return_requests SET status='approved',refund_amount=$1,resolved_at=NOW(),updated_at=NOW() WHERE id=$2`,
        [refundAmount, req.params.id],
      );
      await client.query(`UPDATE orders SET status='return_approved',updated_at=NOW() WHERE id=$1`, [ret.order_id]);
    } else {
      await client.query(
        `UPDATE return_requests SET status='rejected',resolved_at=NOW(),updated_at=NOW() WHERE id=$1`,
        [req.params.id],
      );
      // Keep the order's pre-return state; the return request has its own status.
    }
    buyerId = String(ret.order_buyer_id);
    productTitle = String(ret.product_title ?? 'your order');
    currency = String(ret.currency ?? '');
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK').catch(() => undefined);
    res.status(500).json({ error: `Failed to ${status === 'approved' ? 'approve' : 'reject'} return` });
    return;
  } finally {
    client.release();
  }

  try {
    const message = status === 'approved'
      ? `Your return for ${productTitle} was approved. Agreed refund: ${refundAmount} ${currency}. The seller will arrange payment separately; no refund was processed by Nodbusiness.`
      : `Your return for ${productTitle} was rejected.`;
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id,type,title,body,link,is_read)
       VALUES ($1,'order',$2,$3,'/orders',false) RETURNING *`,
      [buyerId, status === 'approved' ? '✅ Return approved' : 'Return request rejected', message],
    );
    emitNotification(buyerId, notif as Record<string, unknown>);
    if (status === 'approved') sendPushToUser(buyerId, '✅ Return approved', message, '/orders').catch(() => undefined);
  } catch { /* Notification delivery is best effort after the decision is committed. */ }
  res.json({ success: true, status, refund_amount: status === 'approved' ? refundAmount : undefined, refund_processed: false });
}

// Preserve both the explicit API paths and the existing Orders page's PUT contract.
router.put('/:id/approve', requireAuth, (req, res) => resolveReturn(req, res, 'approved'));
router.put('/:id/reject', requireAuth, (req, res) => resolveReturn(req, res, 'rejected'));
router.put('/:id', requireAuth, (req: Request, res: Response) => {
  const status = (req.body as Record<string, unknown>).status;
  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: 'status must be approved or rejected' });
    return;
  }
  return resolveReturn(req, res, status);
});

module.exports = router;
