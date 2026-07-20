const router = require('express').Router();
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');
const { cached } = require('../lib/redis');

// GET /api/trending — aggregated explore/trending data
// Cached for 5 minutes in Redis to avoid hammering the DB on every page load
router.get('/', optionalAuth, async (req, res) => {
  try {
    const data = await cached('trending:global', 300, async () => {
      const [posts, products, showrooms, tasks, users] = await Promise.all([
        // Trending posts — most liked in last 48 hours
        pool.query(
          `SELECT p.id, p.author_id, p.author_name, p.author_avatar, p.content,
                  p.image_url, p.post_type, p.like_count, p.comment_count, p.created_at,
                  up.display_name, up.avatar_url
           FROM posts p
           LEFT JOIN user_profiles up ON up.user_id = p.author_id
           WHERE p.created_at > NOW() - INTERVAL '48 hours'
           ORDER BY p.like_count DESC, p.comment_count DESC
           LIMIT 10`
        ),
        // Top products by views
        pool.query(
          `SELECT id, seller_id, title, price, currency, images, category, view_count, average_rating
           FROM products WHERE status = 'active'
           ORDER BY view_count DESC LIMIT 8`
        ),
        // Featured showrooms
        pool.query(
          `SELECT id, owner_id, title, description, category, cover_image, logo_url, view_count
           FROM showrooms WHERE status = 'published'
           ORDER BY view_count DESC LIMIT 6`
        ),
        // Latest open tasks
        pool.query(
          `SELECT id, requester_id, title, task_type, offered_payment, currency, location, deadline
           FROM tasks WHERE status = 'open'
           ORDER BY created_at DESC LIMIT 8`
        ),
        // Suggested users
        pool.query(
          `SELECT user_id, display_name, avatar_url, headline, follower_count, is_verified
           FROM user_profiles
           ORDER BY follower_count DESC, created_at DESC LIMIT 8`
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

    // Cache-Control so Vercel CDN / browser can cache for 60s
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(data);
  } catch (err) {
    console.error('Trending error:', err);
    res.status(500).json({ error: 'Failed to fetch trending data' });
  }
});

// GET /api/warm — no auth required
// Pre-warms the Redis cache by triggering the same trending fetch as GET /.
// The frontend calls this on app load so subsequent page navigations get instant
// responses from the already-populated cache.
router.get('/warm', async (_req, res) => {
  try {
    // Re-use the same cached() call as GET / — on a cache miss this populates
    // Redis; on a hit it's a cheap no-op that returns in < 1 ms.
    await cached('trending:global', 300, async () => {
      const [posts, products, showrooms, tasks, users] = await Promise.all([
        pool.query(
          `SELECT p.id, p.author_id, p.author_name, p.author_avatar, p.content,
                  p.image_url, p.post_type, p.like_count, p.comment_count, p.created_at,
                  up.display_name, up.avatar_url
           FROM posts p
           LEFT JOIN user_profiles up ON up.user_id = p.author_id
           WHERE p.created_at > NOW() - INTERVAL '48 hours'
           ORDER BY p.like_count DESC, p.comment_count DESC
           LIMIT 10`
        ),
        pool.query(
          `SELECT id, seller_id, title, price, currency, images, category, view_count, average_rating
           FROM products WHERE status = 'active'
           ORDER BY view_count DESC LIMIT 8`
        ),
        pool.query(
          `SELECT id, owner_id, title, description, category, cover_image, logo_url, view_count
           FROM showrooms WHERE status = 'published'
           ORDER BY view_count DESC LIMIT 6`
        ),
        pool.query(
          `SELECT id, requester_id, title, task_type, offered_payment, currency, location, deadline
           FROM tasks WHERE status = 'open'
           ORDER BY created_at DESC LIMIT 8`
        ),
        pool.query(
          `SELECT user_id, display_name, avatar_url, headline, follower_count, is_verified
           FROM user_profiles
           ORDER BY follower_count DESC, created_at DESC LIMIT 8`
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

    res.json({ warmed: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Cache warm error:', err);
    res.status(500).json({ error: 'Failed to warm cache' });
  }
});

module.exports = router;
