/**
 * routes/feed.ts — The Business feed, built on the server.
 *
 * GET /api/feed/businesses?sort=nearest|recent&lat=&lon=&limit=&offset=
 *
 * Merges published sites (showrooms) and business profiles with the same
 * visibility rules as /api/showrooms and /api/businesses (real/demo, paid
 * plan, unexpired sites, guests see public businesses only), drops a
 * business that already has a same-named site, and returns one ordered list:
 *   - sort=nearest (needs lat/lon): businesses with a map pin by distance,
 *     then those without a pin, newest first;
 *   - sort=recent: newest first.
 * Each item carries `distance_km` (rounded to 0.5 km, null without a pin;
 * never exact coordinates for a private address, lib/locationPrivacy.ts) and
 * `relationship` ('friend' when the viewer and the owner follow each other,
 * 'following' when only the viewer follows). Owners' display details come in
 * one map, so the client makes no per-owner requests.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import logger from '../lib/logger';
import { optionalAuth } from '../middleware/auth';
import { listRecords } from '../utils/crud';
import { redactContactFields } from '../lib/contactPrivacy';
import { roundedDistanceKm } from '../lib/locationPrivacy';

const router = Router();

/** How many rows of each kind are considered before ordering. */
const POOL_SIZE = 300;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const nameKey = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();
const num = (value: unknown) => (value === null || value === undefined || value === '' ? NaN : Number(value));

type Item = { type: 'showroom' | 'business'; record: Record<string, unknown>; created: number; distance: number | null; ownerId: string };

router.get('/businesses', optionalAuth, async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const sort = q.sort === 'nearest' ? 'nearest' : 'recent';
  const lat = num(q.lat);
  const lon = num(q.lon);
  const hasPoint = Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180;
  if (sort === 'nearest' && !hasPoint) { res.status(400).json({ error: 'sort=nearest needs valid lat and lon' }); return; }
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 30);
  const offset = Math.min(Math.max(parseInt(q.offset, 10) || 0, 0), POOL_SIZE * 2);
  const viewerId = req.user?.id ?? null;

  try {
    const [businessRows, showroomRows] = await Promise.all([
      listRecords<Record<string, unknown>>('businesses', { sort: '-created_at', limit: POOL_SIZE, realOnly: req.realOnly, paidBusinessGrace: true, publicOnly: !req.user }),
      listRecords<Record<string, unknown>>('showrooms', { filter: { status: 'published' }, sort: '-created_at', limit: POOL_SIZE, realOnly: req.realOnly, paidBusinessGrace: true, publicOnly: !req.user }),
    ]);

    // Exact pins stay on the server: they only feed the distance.
    const pinIds = [...new Set([...businessRows.map((b) => b.id), ...showroomRows.map((s) => s.business_id)].filter(Boolean).map(String))];
    const pins = new Map<string, { lat: number; lon: number }>();
    if (hasPoint && pinIds.length) {
      const { rows } = await pool.query(
        'SELECT id, latitude, longitude FROM businesses WHERE id = ANY($1::uuid[]) AND latitude IS NOT NULL AND longitude IS NOT NULL',
        [pinIds],
      );
      for (const r of rows) pins.set(String(r.id), { lat: Number(r.latitude), lon: Number(r.longitude) });
    }
    const distanceOf = (businessId: unknown): number | null => {
      const pin = hasPoint && businessId ? pins.get(String(businessId)) : undefined;
      return pin ? haversineKm(lat, lon, pin.lat, pin.lon) : null;
    };

    const showroomKeys = new Map(showroomRows.map((s) => [`${s.owner_id}:${nameKey(s.title)}`, s]));
    const items: Item[] = [
      ...showroomRows.map((s) => ({ type: 'showroom' as const, record: s, created: Date.parse(String(s.created_at)), distance: distanceOf(s.business_id), ownerId: String(s.owner_id ?? '') })),
      ...businessRows
        .filter((b) => !showroomKeys.has(`${b.owner_id}:${nameKey(b.business_name)}`))
        .map((b) => ({ type: 'business' as const, record: b, created: Date.parse(String(b.created_at)), distance: distanceOf(b.id), ownerId: String(b.owner_id ?? '') })),
    ];
    items.sort((a, b) => {
      if (sort === 'nearest') {
        if (a.distance !== null && b.distance !== null && a.distance !== b.distance) return a.distance - b.distance;
        if (a.distance !== null && b.distance === null) return -1;
        if (a.distance === null && b.distance !== null) return 1;
      }
      return (b.created || 0) - (a.created || 0);
    });
    const page = items.slice(offset, offset + limit);

    const ownerIds = [...new Set(page.map((i) => i.ownerId).filter(Boolean))];
    const owners: Record<string, Record<string, unknown>> = {};
    const relationship: Record<string, 'friend' | 'following'> = {};
    if (ownerIds.length) {
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (up.user_id) up.user_id, up.display_name, up.avatar_url, up.is_verified, up.ticker_text, up.ticker_type, u.is_seed
         FROM user_profiles up JOIN users u ON u.id = up.user_id
         WHERE up.user_id = ANY($1::uuid[]) ORDER BY up.user_id, up.created_at`,
        [ownerIds],
      );
      for (const r of rows) {
        owners[String(r.user_id)] = {
          display_name: r.display_name ?? null,
          avatar_url: Array.isArray(r.avatar_url) ? (r.avatar_url[0] ?? null) : r.avatar_url ?? null,
          is_verified: r.is_verified === true,
          is_seed: r.is_seed === true,
          ticker_text: r.ticker_text || null,
          ticker_type: r.ticker_type || null,
        };
      }
      if (viewerId) {
        const { rows: rel } = await pool.query(
          `SELECT o.id::text AS owner_id,
                  EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followed_id = o.id) AS i_follow,
                  EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = o.id AND f.followed_id = $1) AS follows_me
           FROM unnest($2::uuid[]) AS o(id)`,
          [viewerId, ownerIds],
        );
        for (const r of rel) {
          if (r.owner_id === viewerId) continue;
          if (r.i_follow && r.follows_me) relationship[r.owner_id] = 'friend';
          else if (r.i_follow) relationship[r.owner_id] = 'following';
        }
      }
    }

    const canSeeAll = (ownerId: string) => !!req.user && (req.user.id === ownerId || req.user.role === 'admin');
    res.set('Cache-Control', 'private, no-store');
    res.json({
      items: page.map((i) => ({
        type: i.type,
        record: i.type === 'business' ? redactContactFields(i.record, canSeeAll(i.ownerId)) : i.record,
        distance_km: roundedDistanceKm(i.distance),
        relationship: relationship[i.ownerId] ?? null,
      })),
      owners,
      next_offset: offset + limit < items.length ? offset + limit : null,
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Business feed failed');
    res.status(500).json({ error: 'Failed to load the business feed' });
  }
});

module.exports = router;
