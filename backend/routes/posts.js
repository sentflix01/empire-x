const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listRecords, getRecord, createRecord, updateRecord, deleteRecord } = require('../utils/crud');
const { syncHashtags } = require('./hashtags');
const { emitNotification } = require('../socket');
const { sendPushToUser } = require('./push');

// List posts — supports smart feed with random offset for variety
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { sort = '-created_at', limit = 30, author_id, post_type, feed = 'false' } = req.query;

    // Smart feed mode: mix recent + popular + random for variety
    if (feed === 'true' && !author_id && !post_type) {
      const lim = Math.min(parseInt(limit) || 30, 50);
      const { rows } = await pool.query(
        `WITH ranked AS (
           SELECT DISTINCT ON (id) *
           FROM (
             (SELECT *, 1 AS feed_rank FROM posts
              WHERE created_at > NOW() - INTERVAL '3 days'
              ORDER BY RANDOM() LIMIT $1)
             UNION ALL
             (SELECT *, 2 AS feed_rank FROM posts
              WHERE like_count > 5
              ORDER BY like_count DESC LIMIT $2)
             UNION ALL
             (SELECT *, 3 AS feed_rank FROM posts
              ORDER BY RANDOM() LIMIT $3)
           ) combined
           ORDER BY id, feed_rank
         )
         SELECT * FROM ranked ORDER BY feed_rank ASC, created_at DESC LIMIT $4`,
        [Math.ceil(lim * 0.5), Math.ceil(lim * 0.3), lim, lim]
      );
      return res.json(rows);
    }

    // Default filtered/sorted list
    const conditions = [];
    const params = [];
    if (author_id) { params.push(author_id); conditions.push(`author_id = $${params.length}`); }
    if (post_type) { params.push(post_type); conditions.push(`post_type = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort?.startsWith('-') ? `${sort.slice(1)} DESC` : (sort || 'created_at DESC');
    params.push(Math.min(parseInt(limit) || 30, 100));
    const { rows } = await pool.query(
      `SELECT * FROM posts ${where} ORDER BY ${orderBy} LIMIT $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await getRecord('posts', req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Create post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content, image_url, post_type, poll_options, poll_ends_at } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    // Fetch author profile for denormalized fields
    const { rows: profiles } = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const profile = profiles[0] || {};

    const post = await createRecord('posts', {
      author_id: req.user.id,
      author_name: profile.display_name || null,
      author_avatar: profile.avatar_url || null,
      content,
      image_url: image_url || null,
      post_type: poll_options ? 'poll' : (post_type || 'text'),
      poll_options: poll_options ? JSON.stringify(
        Array.isArray(poll_options)
          ? poll_options.map((text, i) => ({ id: String(i + 1), text, vote_count: 0 }))
          : poll_options
      ) : null,
      poll_ends_at: poll_ends_at || null,
    });
    // Sync hashtags in background
    syncHashtags(post.id, content).catch(() => {});
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update post
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('posts', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await updateRecord('posts', req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete post
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getRecord('posts', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await deleteRecord('posts', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Like / unlike post
router.post('/:id/like', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(
      'SELECT id FROM likes WHERE target_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM likes WHERE target_id = $1 AND user_id = $2', [id, req.user.id]);
      await pool.query('UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = $1', [id]);
      return res.json({ liked: false });
    }
    await pool.query('INSERT INTO likes (target_id, target_type, user_id) VALUES ($1, $2, $3)', [id, 'post', req.user.id]);
    await pool.query('UPDATE posts SET like_count = like_count + 1 WHERE id = $1', [id]);

    // Notify post author (not the liker themselves)
    const { rows: postRows } = await pool.query('SELECT author_id, author_name FROM posts WHERE id = $1', [id]);
    if (postRows.length && postRows[0].author_id !== req.user.id) {
      const { rows: likerRows } = await pool.query('SELECT display_name FROM user_profiles WHERE user_id = $1', [req.user.id]);
      const likerName = likerRows[0]?.display_name || 'Someone';
      const { rows: [notif] } = await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link, is_read)
         VALUES ($1, 'like', $2, '', '/profile/' || $3, false) RETURNING *`,
        [postRows[0].author_id, `${likerName} liked your post`, req.user.id]
      );
      emitNotification(postRows[0].author_id, notif);
      sendPushToUser(postRows[0].author_id, `${likerName} liked your post`, '', '/notifications').catch(() => {});
    }

    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Comments on a post
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  try {
    const { rows: profiles } = await pool.query(
      'SELECT display_name, avatar_url FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const profile = profiles[0] || {};
    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, author_id, author_name, author_avatar, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.user.id, profile.display_name || null, profile.avatar_url || null, content]
    );
    await pool.query('UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1', [req.params.id]);

    // Notify post author
    const { rows: postRows } = await pool.query('SELECT author_id FROM posts WHERE id = $1', [req.params.id]);
    if (postRows.length && postRows[0].author_id !== req.user.id) {
      const commenterName = profile.display_name || 'Someone';
      const { rows: [notif] } = await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link, is_read)
         VALUES ($1, 'comment', $2, $3, '', false) RETURNING *`,
        [postRows[0].author_id, `${commenterName} commented on your post`, content.slice(0, 80)]
      );
      emitNotification(postRows[0].author_id, notif);
      sendPushToUser(postRows[0].author_id, `${commenterName} commented on your post`, content.slice(0, 80), '/notifications').catch(() => {});
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

module.exports = router;
