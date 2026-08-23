import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';

const router = Router();

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function attachDistances<T extends { latitude?: unknown; longitude?: unknown }>(rows: T[], lat: number, lon: number): (T & { distance_km: number })[] {
  return rows.map((r) => ({
    ...r,
    distance_km: r.latitude != null && r.longitude != null
      ? Math.round(haversine(lat, lon, parseFloat(r.latitude as string), parseFloat(r.longitude as string)) * 10) / 10
      : 999,
  }));
}

router.get('/nearby', optionalAuth, async (req: Request, res: Response) => {
  const { lat, lon, type = 'all', radius = '10', limit = '50' } = req.query as Record<string, string>;
  if (!lat || !lon) { res.status(400).json({ error: 'lat and lon are required' }); return; }
  const uLat = parseFloat(lat), uLon = parseFloat(lon);
  if (isNaN(uLat) || isNaN(uLon)) { res.status(400).json({ error: 'Invalid coordinates' }); return; }
  const radiusKm = parseFloat(radius) || 10;
  const lim = Math.min(parseInt(limit) || 50, 200);
  const results: Record<string, unknown[]> = {};

  try {
    if (type === 'all' || type === 'products') {
      const { rows } = await pool.query(
        `SELECT id,seller_id,title,price,currency,images,category,latitude,longitude FROM products WHERE status='active' AND latitude IS NOT NULL AND longitude IS NOT NULL LIMIT $1`,
        [lim * 3],
      );
      results.products = attachDistances(rows, uLat, uLon).filter((r) => r.distance_km <= radiusKm).slice(0, lim);
    }
    if (type === 'all' || type === 'businesses') {
      const { rows } = await pool.query(
        `SELECT id,owner_id,name,category,logo_url,address,latitude,longitude FROM businesses WHERE latitude IS NOT NULL AND longitude IS NOT NULL LIMIT $1`,
        [lim * 3],
      );
      results.businesses = attachDistances(rows, uLat, uLon).filter((r) => r.distance_km <= radiusKm).slice(0, lim);
    }
    if (type === 'all' || type === 'tasks') {
      const { rows } = await pool.query(
        `SELECT id,requester_id,title,task_type,offered_payment,currency,location,latitude,longitude FROM tasks WHERE status='open' AND latitude IS NOT NULL AND longitude IS NOT NULL LIMIT $1`,
        [lim * 3],
      );
      results.tasks = attachDistances(rows, uLat, uLon).filter((r) => r.distance_km <= radiusKm).slice(0, lim);
    }
    if (type === 'all' || type === 'people') {
      const { rows } = await pool.query(
        `SELECT up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.latitude,up.longitude FROM user_profiles up WHERE up.latitude IS NOT NULL AND up.longitude IS NOT NULL LIMIT $1`,
        [lim * 3],
      );
      results.people = attachDistances(rows, uLat, uLon).filter((r) => r.distance_km <= radiusKm).slice(0, lim);
    }
    res.json(results);
  } catch { res.status(500).json({ error: 'Failed to fetch nearby data' }); }
});

module.exports = router;
