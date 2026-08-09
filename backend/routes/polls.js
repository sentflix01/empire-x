const router = require('express').Router();
const logger = require('../lib/logger');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// Vote on a poll
router.post('/:postId/vote', requireAuth, async (req, res) => {
  const { option_id } = req.body;
  if (!option_id) return res.status(400).json({ error: 'option_id is required' });

  try {
    // Check post has a poll
    const { rows: posts } = await pool.query(
      'SELECT id, poll_options, poll_ends_at FROM posts WHERE id = $1',
      [req.params.postId]
    );
    if (!posts.length) return res.status(404).json({ error: 'Post not found' });
    const post = posts[0];
    if (!post.poll_options) return res.status(400).json({ error: 'This post has no poll' });
    if (post.poll_ends_at && new Date() > new Date(post.poll_ends_at)) {
      return res.status(400).json({ error: 'Poll has ended' });
    }

    // Record vote (upsert — user can change vote)
    const existing = await pool.query(
      'SELECT option_id FROM poll_votes WHERE post_id = $1 AND user_id = $2',
      [req.params.postId, req.user.id]
    );

    let options = JSON.parse(post.poll_options);

    if (existing.rows.length) {
      const oldOptionId = existing.rows[0].option_id;
      // Decrement old option
      options = options.map(o => o.id === oldOptionId ? { ...o, vote_count: Math.max(0, (o.vote_count || 0) - 1) } : o);
      await pool.query(
        'UPDATE poll_votes SET option_id = $1 WHERE post_id = $2 AND user_id = $3',
        [option_id, req.params.postId, req.user.id]
      );
    } else {
      await pool.query(
        'INSERT INTO poll_votes (post_id, user_id, option_id) VALUES ($1, $2, $3)',
        [req.params.postId, req.user.id, option_id]
      );
    }

    // Increment new option
    options = options.map(o => o.id === option_id ? { ...o, vote_count: (o.vote_count || 0) + 1 } : o);
    await pool.query(
      'UPDATE posts SET poll_options = $1 WHERE id = $2',
      [JSON.stringify(options), req.params.postId]
    );

    res.json({ options, voted: option_id });
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Error');
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Get poll results
router.get('/:postId/results', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT poll_options, poll_ends_at FROM posts WHERE id = $1',
      [req.params.postId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });
    const options = JSON.parse(rows[0].poll_options || '[]');
    const total = options.reduce((sum, o) => sum + (o.vote_count || 0), 0);
    res.json({ options, total, ended: rows[0].poll_ends_at && new Date() > new Date(rows[0].poll_ends_at) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get poll results' });
  }
});

module.exports = router;
