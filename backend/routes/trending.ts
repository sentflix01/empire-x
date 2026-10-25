import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';
import { cached } from '../lib/redis';
import { getCurrentDatabaseEnvironment } from '../db/pool';
import { announcementLiveSql, guestPostSql, notPrivateBusinessSql, productNotPrivateSql } from '../lib/siteVisibility';
import { personProfileJoin } from '../lib/personProfile';

const router = Router();

/** guest: signed-out readers see business content only (decision §7). */
async function loadTrending(isReal: boolean, guest: boolean): Promise<Record<string, unknown>> {
  const postWhere = guest ? `AND ${guestPostSql('p')}` : `AND ${announcementLiveSql('p')}`;
  const prodWhere = guest ? `AND ${productNotPrivateSql('products')}` : '';
  const showWhere = guest ? `AND ${notPrivateBusinessSql('showrooms.business_id')}` : '';
  const realPostJoin  = isReal ? 'JOIN users _pu ON _pu.id=p.author_id AND _pu.is_seed=FALSE AND _pu.is_demo=FALSE' : '';
  const realProdWhere = isReal ? `AND seller_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)` : '';
  const realShowWhere = isReal ? `AND owner_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)
       AND EXISTS (SELECT 1 FROM business_subscriptions paid_sub
         WHERE paid_sub.business_id=showrooms.business_id AND paid_sub.tier <> 'freemium'
           AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours')` : '';
  const realUserJoin  = isReal ? 'JOIN users _uu ON _uu.id=up.user_id AND _uu.is_seed=FALSE AND _uu.is_demo=FALSE' : '';

  const [posts, products, showrooms, users] = await Promise.all([
    pool.query(
      `SELECT p.id,p.author_id,p.author_name,p.author_avatar,p.content,p.image_url,p.post_type,p.like_count,p.comment_count,p.created_at,up.display_name,up.avatar_url
       FROM posts p ${personProfileJoin('p.author_id', 'up')} ${realPostJoin}
       WHERE p.created_at > NOW()-INTERVAL '48 hours' ${postWhere} ORDER BY p.like_count DESC, p.comment_count DESC LIMIT 10`,
    ),
    pool.query(
      `SELECT DISTINCT id,seller_id,title,price,currency,images,category,view_count,average_rating::float8 AS average_rating
       FROM products WHERE status='active' ${realProdWhere} ${prodWhere} ORDER BY view_count DESC LIMIT 8`,
    ),
    pool.query(
      `SELECT id,owner_id,title,description,category,cover_image,logo_url,view_count
       FROM showrooms WHERE status='published' AND (expires_at IS NULL OR expires_at > NOW()) ${realShowWhere} ${showWhere} ORDER BY view_count DESC LIMIT 6`,
    ),
    guest ? Promise.resolve({ rows: [] }) : pool.query(
      `SELECT up.user_id,up.display_name,up.avatar_url,up.headline,up.follower_count,up.is_verified
       FROM user_profiles up ${realUserJoin} ORDER BY up.follower_count DESC, up.created_at DESC LIMIT 8`,
    ),
  ]);

  return {
    trending_posts: posts.rows,
    top_products: products.rows,
    featured_showrooms: showrooms.rows,
    suggested_users: users.rows,
  };
}

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const isReal = !!req.realOnly;
    const environment = getCurrentDatabaseEnvironment();
    const guest = !req.user;
    const cacheKey = `trending:${environment}:${isReal ? 'real-only' : 'all-users'}:${guest ? 'guest' : 'member'}`;

    const data = await cached(cacheKey, 45, () => loadTrending(isReal, guest));

    // This endpoint is account-environment aware. Do not let browser/CDN caches
    // share a response between anonymous, Real, and isolated Demo requests.
    res.vary('X-Account-Mode');
    res.vary('X-Real-Only');
    res.vary('Cookie');
    res.set('Cache-Control', 'private, no-store');
    res.json(data);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Trending error');
    res.status(500).json({ error: 'Failed to fetch trending data' });
  }
});

router.get('/warm', optionalAuth, async (req: Request, res: Response) => {
  try {
    const isReal = !!req.realOnly;
    const environment = getCurrentDatabaseEnvironment();
    const guest = !req.user;
    const cacheKey = `trending:${environment}:${isReal ? 'real-only' : 'all-users'}:${guest ? 'guest' : 'member'}`;
    await cached(cacheKey, 45, () => loadTrending(isReal, guest));
    res.vary('X-Account-Mode');
    res.vary('X-Real-Only');
    res.vary('Cookie');
    res.set('Cache-Control', 'private, no-store');
    res.json({ warmed: true, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Warm error');
    res.status(500).json({ error: 'Failed to warm cache' });
  }
});

module.exports = router;
