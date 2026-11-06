import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { emitNotification } from '../socket';
import { uuidParams } from '../lib/uuidParams';

const router = Router();

// Malformed IDs answer 404 instead of reaching Postgres (audit F-034).
uuidParams(router, ['orderId']);
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

// Steps the order page shows; the notification title repeats the status.
const DELIVERY_STATUSES = ['Packed', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];
const NOTE_MAX = 500;
const LOCATION_MAX = 200;

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) return undefined;
  return value.trim() || null;
}

// Columns match the delivery_updates table (db/migrate5.js): note, location,
// created_by. The route used to insert description/estimated_delivery, which
// do not exist, so every update failed (audit F-003).
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const { order_id, status } = body;
  if (typeof order_id !== 'string' || !order_id || typeof status !== 'string' || !status) {
    res.status(400).json({ error: 'order_id and status are required' }); return;
  }
  if (!DELIVERY_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${DELIVERY_STATUSES.join(', ')}` }); return;
  }
  // `description` is accepted as an older name for the note.
  const note = optionalText(body.note ?? body.description, NOTE_MAX);
  const location = optionalText(body.location, LOCATION_MAX);
  if (note === undefined) { res.status(400).json({ error: `note must be text of ${NOTE_MAX} characters or fewer` }); return; }
  if (location === undefined) { res.status(400).json({ error: `location must be text of ${LOCATION_MAX} characters or fewer` }); return; }
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
      `INSERT INTO delivery_updates (order_id,status,note,location,created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [order_id, status, note, location, req.user!.id],
    );
    await pool.query(
      `UPDATE orders SET updated_at=NOW() WHERE id=$1`,
      [order_id],
    );
    const { rows: [notif] } = await pool.query(
      `INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'order',$2,$3,'/orders',false) RETURNING *`,
      [order.buyer_id, `📦 Delivery update: ${status}`, note ?? `Your order for ${order.product_title} is ${status}`],
    );
    emitNotification(order.buyer_id as string, notif as Record<string, unknown>);
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Failed to add delivery update' }); }
});

module.exports = router;
