/**
 * routes/locations.ts — Live GPS location for Enterprise businesses
 *
 * POST /api/locations/update
 *   - Requires auth + Enterprise ('pro') tier via checkTierLimit
 *   - Upserts the business's live location in the live_locations table
 *   - Broadcasts to Socket.IO room  business:{business_id}:tracking
 *
 * Integration:
 *   - socket.ts adds join_business_tracking / leave_business_tracking handlers
 *   - LiveLocationSection.tsx subscribes to the Socket.IO room
 *
 * Files touched:
 *   backend/routes/locations.ts       (this file)
 *   backend/db/migrate37.js           (live_locations table)
 *   backend/socket.ts                 (Socket.IO room handlers)
 *   backend/index.ts                  (route registration)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { notPrivateBusinessSql } from '../lib/siteVisibility';
import logger from '../lib/logger';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { checkTierLimit } from '../middleware/tierLimit';
import { getIO } from '../socket';

const router = Router();

// ── POST /update ──────────────────────────────────────────────────────────────
router.post(
  '/update',
  requireAuth,
  checkTierLimit('live_location_tracking'),
  async (req: Request & { businessId?: string }, res: Response) => {
    const { lat, lng, label, accuracy_m, heading, speed_kmh } = req.body as Record<string, unknown>;

    if (lat == null || lng == null) {
      res.status(400).json({ error: 'lat and lng are required' });
      return;
    }

    const parsedLat = parseFloat(String(lat));
    const parsedLng = parseFloat(String(lng));

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      res.status(400).json({ error: 'lat must be between -90 and 90' });
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      res.status(400).json({ error: 'lng must be between -180 and 180' });
      return;
    }

    const businessId = req.businessId;
    if (!businessId) {
      res.status(404).json({ error: 'No business found for this user' });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO live_locations
           (business_id, user_id, lat, lng, label, accuracy_m, heading, speed_kmh, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (business_id) DO UPDATE SET
           user_id    = EXCLUDED.user_id,
           lat        = EXCLUDED.lat,
           lng        = EXCLUDED.lng,
           label      = COALESCE(EXCLUDED.label, live_locations.label),
           accuracy_m = COALESCE(EXCLUDED.accuracy_m, live_locations.accuracy_m),
           heading    = COALESCE(EXCLUDED.heading, live_locations.heading),
           speed_kmh  = COALESCE(EXCLUDED.speed_kmh, live_locations.speed_kmh),
           updated_at = NOW()`,
        [
          businessId, req.user!.id, parsedLat, parsedLng,
          label ?? null,
          accuracy_m != null ? parseFloat(String(accuracy_m)) : null,
          heading    != null ? parseFloat(String(heading))    : null,
          speed_kmh  != null ? parseFloat(String(speed_kmh))  : null,
        ],
      );

      // Broadcast to all clients watching this business's location
      const io = getIO();
      if (io) {
        io.to(`business:${businessId}:tracking`).emit('location_update', {
          business_id: businessId,
          lat: parsedLat,
          lng: parsedLng,
          label: label ?? null,
          updated_at: new Date().toISOString(),
        });
      }

      res.json({ success: true });
    } catch (err) {
      logger.error({ err: (err as Error).message, businessId }, 'Live location update failed');
      res.status(500).json({ error: 'Failed to update location' });
    }
  },
);

// ── GET /:businessId — public latest location (aggregate only) ────────────────
router.get('/:businessId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realJoin = req.realOnly
      ? 'JOIN businesses b ON b.id=ll.business_id JOIN users u ON u.id=b.owner_id AND u.is_seed=FALSE AND u.is_demo=FALSE'
      : '';
    const { rows } = await pool.query(
      `SELECT ll.lat, ll.lng, ll.label, ll.updated_at
       FROM live_locations ll ${realJoin}
       WHERE ll.business_id = $1
         AND ll.updated_at > NOW() - INTERVAL '10 minutes'
         ${req.user ? '' : `AND ${notPrivateBusinessSql('ll.business_id')}`}`,
      [req.params.businessId],
    );

    if (!rows.length) {
      res.json({ available: false });
      return;
    }

    res.json({ available: true, ...rows[0] });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'GET live location failed');
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

module.exports = router;
