import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';
import { productNotPrivateSql } from '../lib/siteVisibility';

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

router.get('/nearby/product-search', optionalAuth, async (req: Request, res: Response) => {
  const { q = '', lat, lon, radius_km = '10', category = '' } = req.query as Record<string, string>;
  const query = q.trim();
  const latitude = Number(lat);
  const longitude = Number(lon);
  const radiusKm = Number(radius_km);

  if (query.length < 2 || query.length > 120) {
    res.status(400).json({ error: 'Search query must be between 2 and 120 characters' });
    return;
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    res.status(400).json({ error: 'Valid latitude and longitude are required' });
    return;
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
    res.status(400).json({ error: 'radius_km must be greater than 0 and at most 100' });
    return;
  }

  // Guests never see private businesses (decision §7).
  const realOnlyProductFilter = (req.realOnly
    ? 'AND seller_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)'
    : '') + (req.user ? '' : ` AND ${productNotPrivateSql('products')}`);
  const realOnlyBusinessFilter = (req.realOnly
    ? 'AND owner_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)'
    : '') + (req.user ? '' : " AND visibility = 'public'");
  const pattern = `%${query}%`;

  try {
    const { rows: productRows } = await pool.query(
      `SELECT id,seller_id,title,description,price,currency,images,category,latitude,longitude
       FROM products
       WHERE status='active'
         AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND (title ILIKE $1 OR COALESCE(description,'') ILIKE $1 OR COALESCE(category,'') ILIKE $1)
         AND ($4 = '' OR COALESCE(category,'') ILIKE $4)
         ${realOnlyProductFilter}
       ORDER BY ABS(latitude - $2::float) + ABS(longitude - $3::float)
       LIMIT 500`,
      [pattern, latitude, longitude, category],
    );

    const products = attachDistances(productRows, latitude, longitude)
      .filter((product) => product.distance_km <= radiusKm)
      .slice(0, 100);
    const ownerIds = [...new Set(products.map((product) => product.seller_id).filter(Boolean))];

    let businesses: Array<Record<string, unknown>> = [];
    if (ownerIds.length) {
      const { rows: businessRows } = await pool.query(
        `SELECT id,owner_id,business_name,business_category,business_logo_url AS logo_url,CASE WHEN 'business_address' = ANY(public_contact_fields) THEN business_address END AS address,latitude,longitude
         FROM businesses
         WHERE owner_id = ANY($1::uuid[])
           AND latitude IS NOT NULL AND longitude IS NOT NULL
           ${realOnlyBusinessFilter}
         LIMIT 200`,
        [ownerIds],
      );
      businesses = attachDistances(businessRows, latitude, longitude)
        .filter((business) => business.distance_km <= radiusKm)
        .map((business) => ({
          ...business,
          matched_products: products.filter((product) => product.seller_id === business.owner_id),
        }));
    }

    res.json({
      businesses,
      geo_products: products,
      products_matched: products,
      total_matches: products.length,
    });
  } catch {
    res.status(500).json({ error: 'Failed to search nearby products' });
  }
});

router.get('/nearby', optionalAuth, async (req: Request, res: Response) => {
  const { lat, lon, type = 'all', radius = '10', limit = '50' } = req.query as Record<string, string>;
  if (!lat || !lon) { res.status(400).json({ error: 'lat and lon are required' }); return; }
  const uLat = parseFloat(lat), uLon = parseFloat(lon);
  if (isNaN(uLat) || isNaN(uLon)) { res.status(400).json({ error: 'Invalid coordinates' }); return; }
  const radiusKm = parseFloat(radius) || 10;
  const lim = Math.min(parseInt(limit) || 50, 200);
  const results: Record<string, unknown[]> = {};
  const realProductFilter = (req.realOnly ? 'AND seller_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)' : '') + (req.user ? '' : ` AND ${productNotPrivateSql('products')}`);
  const realBusinessFilter = (req.realOnly ? 'AND owner_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)' : '') + (req.user ? '' : " AND visibility = 'public'");
  const realPeopleJoin = req.realOnly ? 'JOIN users u ON u.id=up.user_id AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';

  try {
    if (type === 'all' || type === 'products') {
      const { rows } = await pool.query(
        `SELECT id,seller_id,title,price,currency,images,category,latitude,longitude FROM products WHERE status='active' AND latitude IS NOT NULL AND longitude IS NOT NULL ${realProductFilter} LIMIT $1`,
        [lim * 3],
      );
      results.products = attachDistances(rows, uLat, uLon).filter((r) => r.distance_km <= radiusKm).slice(0, lim);
    }
    if (type === 'all' || type === 'businesses') {
      const { rows } = await pool.query(
        `SELECT id,owner_id,business_name AS name,business_name,business_category AS category,business_category,business_logo_url AS logo_url,CASE WHEN 'business_address' = ANY(public_contact_fields) THEN business_address END AS address,latitude,longitude FROM businesses WHERE latitude IS NOT NULL AND longitude IS NOT NULL ${realBusinessFilter} LIMIT $1`,
        [lim * 3],
      );
      results.businesses = attachDistances(rows, uLat, uLon).filter((r) => r.distance_km <= radiusKm).slice(0, lim);
    }
    // People are personal content: signed-in users only.
    if (req.user && (type === 'all' || type === 'people')) {
      const { rows } = await pool.query(
        `SELECT up.user_id,up.display_name,up.avatar_url,up.headline,up.is_verified,up.latitude,up.longitude FROM user_profiles up ${realPeopleJoin} WHERE up.latitude IS NOT NULL AND up.longitude IS NOT NULL LIMIT $1`,
        [lim * 3],
      );
      results.people = attachDistances(rows, uLat, uLon).filter((r) => r.distance_km <= radiusKm).slice(0, lim);
    }
    res.json(results);
  } catch { res.status(500).json({ error: 'Failed to fetch nearby data' }); }
});

module.exports = router;
