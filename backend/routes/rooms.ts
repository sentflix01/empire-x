/**
 * routes/rooms.ts — availability per night and closed nights for a room type.
 *
 * Mounted at /api/rooms (decision 2026-11-12 "Room bookings: availability
 * calendar and 48-hour hold"): GET /:roomId/availability (visitors see free
 * rooms only; the owner also sees booked and closed counts) and PUT
 * /:roomId/blocks/:night for the owner to close or reopen a night. Room types
 * themselves are in routes/businessRooms.ts.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import logger from '../lib/logger';
import * as apiError from '../lib/apiError';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { getBusinessSubscriptionAccess } from '../lib/businessSubscriptionPolicy';
import { businessViewGate, rejectViewGate } from '../lib/siteVisibility';
import { uuidParams } from '../lib/uuidParams';
import { addDays, nightlyAvailability, parseDay } from '../lib/roomAvailability';
import { ROOM_COLUMNS, dateRange, isOwnerOrAdmin, publicRoom } from '../lib/roomTypes';

const router = Router();
uuidParams(router, ['roomId']);

async function roomWithOwner(roomId: string): Promise<Record<string, any> | null> {
  const { rows } = await pool.query(`SELECT ${ROOM_COLUMNS.split(', ').map((c) => `r.${c}`).join(', ')}, b.owner_id
    FROM room_types r JOIN businesses b ON b.id = r.business_id WHERE r.id = $1`, [roomId]);
  return rows[0] ?? null;
}

router.get('/:roomId/availability', optionalAuth, async (req: Request, res: Response) => {
  const range = dateRange(req, res);
  if (!range) return;
  try {
    const room = await roomWithOwner(req.params.roomId);
    const owner = !!room && isOwnerOrAdmin(req, room.owner_id);
    if (!room || (!room.active && !owner)) { apiError.notFound(res, 'Room not found'); return; }
    if (!owner) {
      const access = await getBusinessSubscriptionAccess(room.business_id);
      if (rejectViewGate(res, businessViewGate(access, req), 'Room not found')) return;
    }
    const nights = await nightlyAvailability(pool, room.id, room.units, range.from, range.to);
    const { owner_id: _owner, ...rest } = room;
    res.json({
      room: publicRoom(rest),
      ...range,
      // Visitors learn only how many rooms are free, not how full the hotel is.
      nights: owner ? nights : nights.map(({ night, free }) => ({ night, free })),
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Room availability failed');
    apiError.serverError(res, 'Could not load availability');
  }
});

// Close a night (units = how many rooms are closed) or open it again (units 0).
router.put('/:roomId/blocks/:night', requireAuth, async (req: Request, res: Response) => {
  const night = parseDay(req.params.night);
  if (!night) { apiError.validationError(res, 'night must be a date (YYYY-MM-DD)'); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const units = Number(body.units);
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 200) : null;
  try {
    const room = await roomWithOwner(req.params.roomId);
    if (!room) { apiError.notFound(res, 'Room not found'); return; }
    if (!isOwnerOrAdmin(req, room.owner_id)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (!Number.isInteger(units) || units < 0 || units > room.units) { apiError.validationError(res, `units must be 0 to ${room.units}`); return; }
    if (units === 0) await pool.query('DELETE FROM room_blocks WHERE room_type_id = $1 AND night = $2', [room.id, night]);
    else {
      await pool.query(
        `INSERT INTO room_blocks (room_type_id, night, units, note) VALUES ($1, $2, $3, $4)
         ON CONFLICT (room_type_id, night) DO UPDATE SET units = EXCLUDED.units, note = EXCLUDED.note`,
        [room.id, night, units, note],
      );
    }
    const [day] = await nightlyAvailability(pool, room.id, room.units, night, addDays(night, 1));
    res.json(day);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Room block failed');
    apiError.serverError(res, 'Could not update the night');
  }
});

module.exports = router;
