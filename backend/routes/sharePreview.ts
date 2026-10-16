/**
 * routes/sharePreview.ts — Link-preview data for shared business and product links.
 *
 * Mounted at /api/share-preview. Used by the Next.js server to build
 * OpenGraph/Twitter tags, so a link shared on other apps shows the business
 * or product name, description and image. Always evaluates visibility as an
 * anonymous visitor (no owner bypass) and never increments view counters.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { getBusinessSubscriptionAccess } from '../lib/businessSubscriptionPolicy';

const router = Router();

const REAL_OWNER = 'IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)';

function firstImage(images: unknown): string | null {
  let list: unknown = images;
  if (typeof images === 'string') {
    try { list = JSON.parse(images); } catch { return images.startsWith('http') ? images : null; }
  }
  if (Array.isArray(list)) {
    const first = list.find((item) => typeof item === 'string' && item.startsWith('http'));
    return typeof first === 'string' ? first : null;
  }
  return null;
}

function clip(text: unknown, max: number): string | null {
  if (typeof text !== 'string') return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean ? (clean.length > max ? `${clean.slice(0, max - 1)}…` : clean) : null;
}

async function isPubliclyVisible(businessId: unknown): Promise<boolean> {
  if (typeof businessId !== 'string' || !businessId) return true;
  const access = await getBusinessSubscriptionAccess(businessId);
  // Link previews are anonymous: private businesses never get one.
  return !!access && !access.hiddenFromPublic && access.visibility !== 'private';
}

router.get('/showroom/:slug', async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? `AND owner_id ${REAL_OWNER}` : '';
    const { rows } = await pool.query(
      `SELECT title, description, cover_image, logo_url, business_id FROM showrooms
        WHERE slug=$1 AND status='published' ${realFilter} AND (expires_at IS NULL OR expires_at > NOW())`,
      [req.params.slug],
    );
    if (!rows.length || !(await isPubliclyVisible(rows[0].business_id))) { res.status(404).json({ error: 'Not found' }); return; }
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      title: clip(rows[0].title, 90),
      description: clip(rows[0].description, 200),
      image: rows[0].cover_image || rows[0].logo_url || null,
    });
  } catch { res.status(500).json({ error: 'Failed to load preview' }); }
});

router.get('/product/:id', async (req: Request, res: Response) => {
  try {
    const realFilter = req.realOnly ? `AND seller_id ${REAL_OWNER}` : '';
    const { rows } = await pool.query(
      `SELECT p.title, p.description, p.images, p.price, p.currency,
              COALESCE(p.business_id, s.business_id) AS business_id
         FROM products p LEFT JOIN showrooms s ON s.id = p.showroom_id
        WHERE p.id=$1 AND p.status IN ('active','sold_out') ${realFilter.replace('seller_id', 'p.seller_id')}`,
      [req.params.id],
    );
    if (!rows.length || !(await isPubliclyVisible(rows[0].business_id))) { res.status(404).json({ error: 'Not found' }); return; }
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      title: clip(rows[0].title, 90),
      description: clip(rows[0].description, 200),
      image: firstImage(rows[0].images),
      price: rows[0].price !== null ? Number(rows[0].price) : null,
      currency: rows[0].currency ?? 'ETB',
    });
  } catch { res.status(500).json({ error: 'Failed to load preview' }); }
});

module.exports = router;
