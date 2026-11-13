/**
 * routes/businessRooms.ts — a business's room types and its bookings calendar.
 *
 * Mounted at /api/businesses/:businessId/rooms (decision 2026-11-12 "Room
 * bookings: availability calendar and 48-hour hold"): list (public: active
 * rooms only), create, update, remove (a room type with bookings is hidden),
 * and GET /bookings for the owner's calendar. Availability per night and
 * closed nights are in routes/rooms.ts; booking is POST
 * /api/direct-orders/bookings.
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import pool from '../db/pool';
import logger from '../lib/logger';
import * as apiError from '../lib/apiError';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { getBusinessSubscriptionAccess } from '../lib/businessSubscriptionPolicy';
import { businessViewGate, rejectViewGate } from '../lib/siteVisibility';
import { isUuid, uuidParams } from '../lib/uuidParams';
import { HOLDS_ROOMS_SQL } from '../lib/roomAvailability';
import { ROOM_COLUMNS, dateRange, isOwnerOrAdmin, publicRoom, roomFields } from '../lib/roomTypes';

const router = Router({ mergeParams: true });
// :businessId comes from the mount path, where router.param does not fire.
router.use((req: Request, res: Response, next: NextFunction) => { if (isUuid(req.params.businessId)) next(); else apiError.notFound(res, 'Business not found'); });
uuidParams(router, ['roomId']);

async function ownedBusiness(req: Request, res: Response): Promise<boolean> {
  const { rows } = await pool.query('SELECT owner_id FROM businesses WHERE id = $1', [req.params.businessId]);
  if (!rows.length) { apiError.notFound(res, 'Business not found'); return false; }
  if (!isOwnerOrAdmin(req, rows[0].owner_id)) { res.status(403).json({ error: 'Forbidden' }); return false; }
  return true;
}

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const { businessId } = req.params;
  try {
    const access = await getBusinessSubscriptionAccess(businessId);
    const owner = isOwnerOrAdmin(req, access?.ownerId);
    if (!owner && rejectViewGate(res, businessViewGate(access, req), 'Business not found')) return;
    const { rows } = await pool.query(
      `SELECT ${ROOM_COLUMNS} FROM room_types WHERE business_id = $1 ${owner ? '' : 'AND active'} ORDER BY sort_order, created_at`,
      [businessId],
    );
    res.json({ rooms: rows.map(publicRoom) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'List rooms failed');
    apiError.serverError(res, 'Could not load the rooms');
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const fields = roomFields((req.body ?? {}) as Record<string, unknown>, false);
  if ('error' in fields) { apiError.validationError(res, fields.error as string); return; }
  try {
    if (!(await ownedBusiness(req, res))) return;
    const { rows: [count] } = await pool.query('SELECT COUNT(*)::int AS n FROM room_types WHERE business_id = $1', [req.params.businessId]);
    if (count.n >= 50) { res.status(409).json({ error: 'A business can list up to 50 room types' }); return; }
    const keys = Object.keys(fields);
    const { rows } = await pool.query(
      `INSERT INTO room_types (business_id, sort_order, ${keys.join(', ')}) VALUES ($1, $2, ${keys.map((_, i) => `$${i + 3}`).join(', ')}) RETURNING ${ROOM_COLUMNS}`,
      [req.params.businessId, count.n, ...keys.map((k) => fields[k])],
    );
    res.status(201).json({ room: publicRoom(rows[0]) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Create room failed');
    apiError.serverError(res, 'Could not save the room');
  }
});

router.put('/:roomId', requireAuth, async (req: Request, res: Response) => {
  const fields = roomFields((req.body ?? {}) as Record<string, unknown>, true);
  if ('error' in fields) { apiError.validationError(res, fields.error as string); return; }
  const keys = Object.keys(fields);
  if (!keys.length) { apiError.validationError(res, 'Nothing to change'); return; }
  try {
    if (!(await ownedBusiness(req, res))) return;
    const { rows } = await pool.query(
      `UPDATE room_types SET ${keys.map((k, i) => `${k} = $${i + 3}`).join(', ')}, updated_at = NOW()
        WHERE id = $1 AND business_id = $2 RETURNING ${ROOM_COLUMNS}`,
      [req.params.roomId, req.params.businessId, ...keys.map((k) => fields[k])],
    );
    if (!rows.length) { apiError.notFound(res, 'Room not found'); return; }
    res.json({ room: publicRoom(rows[0]) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Update room failed');
    apiError.serverError(res, 'Could not save the room');
  }
});

// A room type with bookings is hidden (kept for the bookings' history); one without is deleted.
router.delete('/:roomId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!(await ownedBusiness(req, res))) return;
    const { rows: [used] } = await pool.query('SELECT EXISTS (SELECT 1 FROM orders WHERE room_type_id = $1) AS used', [req.params.roomId]);
    const { rowCount } = used.used
      ? await pool.query('UPDATE room_types SET active = FALSE, updated_at = NOW() WHERE id = $1 AND business_id = $2', [req.params.roomId, req.params.businessId])
      : await pool.query('DELETE FROM room_types WHERE id = $1 AND business_id = $2', [req.params.roomId, req.params.businessId]);
    if (!rowCount) { apiError.notFound(res, 'Room not found'); return; }
    res.json({ deleted: !used.used, hidden: !!used.used });
  } catch {
    apiError.serverError(res, 'Could not remove the room');
  }
});

// The owner's calendar: open bookings overlapping [from, to).
router.get('/bookings', requireAuth, async (req: Request, res: Response) => {
  const range = dateRange(req, res);
  if (!range) return;
  try {
    if (!(await ownedBusiness(req, res))) return;
    const { rows } = await pool.query(
      `SELECT o.id, o.room_type_id, to_char(o.check_in, 'YYYY-MM-DD') AS check_in, to_char(o.check_out, 'YYYY-MM-DD') AS check_out,
              o.nights, o.guests, o.rooms, o.status, o.buyer_name, o.total_price, o.currency, o.created_at
         FROM orders o JOIN room_types r ON r.id = o.room_type_id
        WHERE r.business_id = $1 AND o.check_in < $3::date AND o.check_out > $2::date AND ${HOLDS_ROOMS_SQL}
        ORDER BY o.check_in, o.created_at`,
      [req.params.businessId, range.from, range.to],
    );
    res.json({ bookings: rows.map((r) => ({ ...r, total_price: Number(r.total_price) })), ...range });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'List room bookings failed');
    apiError.serverError(res, 'Could not load the bookings');
  }
});

module.exports = router;
