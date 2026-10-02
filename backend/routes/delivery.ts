import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { emitNotification } from '../socket';

const router = Router();

router.get('/order/:orderId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: orders } = await pool.query<{ buyer_id: string; seller_id: string }>(
      'SELECT buyer_id,seller_id FROM orders WHERE id=$1', [req.params.orderId],
    );
    if (!orders.length) { res.status(404).json({ error: 'Order not found' }); return; }
    if (orders[0].buyer_id !== req.user!.id && orders[0].seller_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const { rows } = await pool.query(
      'SELECT * FROM delivery_updates WHERE order_id=$1 ORDER BY created_at ASC',
      [req.params.orderId],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch delivery updates' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { order_id, status, location, description, estimated_delivery } = req.body as Record<string, unknown>;
  if (!order_id || !status) { res.status(400).json({ error: 'order_id and status are required' }); return; }
  try {
    const { rows: orders } = await pool.query(
      'SELECT buyer_id, seller_id, product_title FROM orders WHERE id=$1',
      [order_id],
    );
    if (!orders.length) { res.status(404).json({ error: 'Order not found' }); return; }
    const order = orders[0] as Record<string, unknown>;
    if (order.seller_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const { rows } = await pool.query(
      `INSERT INTO delivery_updates (order_id,status,location,description,estimated_delivery)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [order_id, status, location ?? null, description ?? null, estimated_delivery ?? null],
    );
    await pool.query(
      `UPDATE orders SET updated_at=NOW() WHERE id=$1`,
      [order_id],
    );
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order',$2,$3,'/orders',false) RETURNING *`,
      [order.buyer_id, `📦 Delivery update: ${status}`, description ?? `Your order for ${order.product_title} is ${status}`],
    );
    emitNotification(order.buyer_id as string, notif as Record<string, unknown>);
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to add delivery update' }); }
});

module.exports = router;
