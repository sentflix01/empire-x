import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { optionalAuth } from '../middleware/auth';
import { cached } from '../lib/redis';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const isReal = !!req.realOnly;
    const cacheKey = isReal ? 'trending:real' : 'trending:global';

    const data = await cached(cacheKey, 300, async () => {
      const realPostJoin  = isReal ? 'JOIN users _pu ON _pu.id=p.author_id AND _pu.is_seed=FALSE' : '';
      const realProdWhere = isReal ? `AND seller_id IN (SELECT id FROM users WHERE is_seed=FALSE)` : '';
      const realShowWhere = isReal ? `AND owner_id  IN (SELECT id FROM users WHERE is_seed=FALSE)` : '';
      const realTaskWhere = isReal ? `AND requester_id IN (SELECT id FROM users WHERE is_seed=FALSE)` : '';
      const realUserJoin  = isReal ? 'JOIN users _uu ON _uu.id=up.user_id AND _uu.is_seed=FALSE' : '';

      const [posts, products, showrooms, tasks, users] = await Promise.all([
        pool.query(
          `SELECT p.id,p.author_id,p.author_name,p.author_avatar,p.content,p.image_url,p.post_type,p.like_count,p.comment_count,p.created_at,up.display_name,up.avatar_url
           FROM posts p LEFT JOIN user_profiles up ON up.user_id=p.author_id ${realPostJoin}
           WHERE p.created_at > NOW()-INTERVAL '48 hours' ORDER BY p.like_count DESC, p.comment_count DESC LIMIT 10`,
        ),
        pool.query(
          `SELECT DISTINCT id,seller_id,title,price,currency,images,category,view_count,average_rating::float8 AS average_rating
           FROM products WHERE status='active' ${realProdWhere} ORDER BY view_count DESC LIMIT 8`,
        ),
        pool.query(
          `SELECT id,owner_id,title,description,category,cover_image,logo_url,view_count
           FROM showrooms WHERE status='published' ${realShowWhere} ORDER BY view_count DESC LIMIT 6`,
        ),
        pool.query(
          `SELECT id,requester_id,title,task_type,offered_payment,currency,location
           FROM tasks WHERE status='open' ${realTaskWhere} ORDER BY created_at DESC LIMIT 8`,
        ),
        pool.query(
          `SELECT up.user_id,up.display_name,up.avatar_url,up.headline,up.follower_count,up.is_verified
           FROM user_profiles up ${realUserJoin} ORDER BY up.follower_count DESC, up.created_at DESC LIMIT 8`,
        ),
      ]);

      return {
        trending_posts: posts.rows,
        top_products: products.rows,
        featured_showrooms: showrooms.rows,
        open_tasks: tasks.rows,
        suggested_users: users.rows,
      };
    });

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(data);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Trending error');
    res.status(500).json({ error: 'Failed to fetch trending data' });
  }
});

router.get('/warm', optionalAuth, async (_req: Request, res: Response) => {
  try {
    await cached('trending:global', 300, async () => {
      const [posts, products, showrooms, tasks, users] = await Promise.all([
        pool.query(`SELECT p.id,p.author_id,p.author_name,p.content,p.image_url,p.post_type,p.like_count,p.comment_count,p.created_at
                    FROM posts p WHERE p.created_at > NOW()-INTERVAL '48 hours' ORDER BY p.like_count DESC LIMIT 10`),
        pool.query(`SELECT id,seller_id,title,price,currency,images,category,view_count,average_rating::float8 AS average_rating FROM products WHERE status='active' ORDER BY view_count DESC LIMIT 8`),
        pool.query(`SELECT DISTINCT id,owner_id,title,description,category,cover_image,logo_url,view_count FROM showrooms WHERE status='published' ORDER BY view_count DESC LIMIT 6`),
        pool.query(`SELECT DISTINCT id,requester_id,title,task_type,offered_payment,currency,location,created_at FROM tasks WHERE status='open' ORDER BY created_at DESC LIMIT 8`),
        pool.query(`SELECT user_id,display_name,avatar_url,headline,follower_count,is_verified FROM user_profiles ORDER BY follower_count DESC, created_at DESC LIMIT 8`),
      ]);
      return { trending_posts: posts.rows, top_products: products.rows, featured_showrooms: showrooms.rows, open_tasks: tasks.rows, suggested_users: users.rows };
    });
    res.json({ warmed: true, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Warm error');
    res.status(500).json({ error: 'Failed to warm cache' });
  }
});

module.exports = router;
