import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT rr.*,o.product_title,o.total_price,o.currency FROM return_requests rr JOIN orders o ON o.id=rr.order_id
       WHERE rr.buyer_id=$1 ORDER BY rr.created_at DESC`,
      [req.user!.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch return requests' }); }
});

router.get('/seller', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT rr.*,o.product_title,o.buyer_id,up.display_name AS buyer_name FROM return_requests rr
       JOIN orders o ON o.id=rr.order_id JOIN user_profiles up ON up.user_id=rr.buyer_id
       WHERE o.seller_id=$1 ORDER BY rr.created_at DESC`,
      [req.user!.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch return requests' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { order_id, reason, refund_amount, evidence_urls } = req.body as Record<string, unknown>;
  if (!order_id || !reason) { res.status(400).json({ error: 'order_id and reason are required' }); return; }
  try {
    const { rows: orders } = await pool.query(
      `SELECT * FROM orders WHERE id=$1 AND buyer_id=$2 AND status IN ('paid','processing','completed')`,
      [order_id, req.user!.id],
    );
    if (!orders.length) { res.status(404).json({ error: 'Order not found or not eligible for return' }); return; }
    const { rows } = await pool.query(
      `INSERT INTO return_requests (order_id,buyer_id,reason,refund_amount,evidence_urls) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [order_id, req.user!.id, reason, refund_amount ?? orders[0].total_price, evidence_urls ? JSON.stringify(evidence_urls) : null],
    );
    await pool.query(`UPDATE orders SET status='return_requested' WHERE id=$1`, [order_id]);
    const order = orders[0] as Record<string, unknown>;
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order',$2,$3,'/orders',false) RETURNING *`,
      [order.seller_id, '↩️ Return request', `Buyer requested a return for order: ${order.product_title}`],
    );
    emitNotification(order.seller_id as string, notif as Record<string, unknown>);
    sendPushToUser(order.seller_id as string, '↩️ Return request', `Buyer requested a return for: ${order.product_title}`, '/orders').catch(() => undefined);
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to create return request' }); }
});

router.put('/:id/approve', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT rr.*,o.seller_id,o.buyer_id,o.product_title FROM return_requests rr JOIN orders o ON o.id=rr.order_id WHERE rr.id=$1`,
      [req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Return request not found' }); return; }
    const ret = rows[0] as Record<string, unknown>;
    if (ret.seller_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await pool.query(`UPDATE return_requests SET status='approved',resolved_at=NOW() WHERE id=$1`, [req.params.id]);
    await pool.query(`UPDATE orders SET status='return_approved' WHERE id=$1`, [ret.order_id]);
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order','✅ Return approved',$2,'/orders',false) RETURNING *`,
      [ret.buyer_id, `Your return for ${ret.product_title} was approved. Refund processing.`],
    );
    emitNotification(ret.buyer_id as string, notif as Record<string, unknown>);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to approve return' }); }
});

router.put('/:id/reject', requireAuth, async (req: Request, res: Response) => {
  const { rejection_reason } = req.body as { rejection_reason?: string };
  try {
    const { rows } = await pool.query(
      `SELECT rr.*,o.seller_id,o.buyer_id,o.product_title FROM return_requests rr JOIN orders o ON o.id=rr.order_id WHERE rr.id=$1`,
      [req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Return request not found' }); return; }
    const ret = rows[0] as Record<string, unknown>;
    if (ret.seller_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await pool.query(`UPDATE return_requests SET status='rejected',rejection_reason=$1,resolved_at=NOW() WHERE id=$2`, [rejection_reason ?? null, req.params.id]);
    await pool.query(`UPDATE orders SET status='completed' WHERE id=$1`, [ret.order_id]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to reject return' }); }
});

module.exports = router;
