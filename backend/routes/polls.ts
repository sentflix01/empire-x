import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/:postId/vote', requireAuth, async (req: Request, res: Response) => {
  const { option_id } = req.body as { option_id?: string };
  if (!option_id) { res.status(400).json({ error: 'option_id is required' }); return; }
  try {
    const { rows: posts } = await pool.query(
      `SELECT p.id, p.poll_options, p.poll_ends_at FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=$1 AND p.post_type='poll' ${req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : ''}`,
      [req.params.postId],
    );
    if (!posts.length) { res.status(404).json({ error: 'Poll not found' }); return; }
    const post = posts[0] as { id: string; poll_options: string; poll_ends_at: Date | null };
    if (post.poll_ends_at && new Date() > new Date(post.poll_ends_at)) {
      res.status(400).json({ error: 'This poll has ended' }); return;
    }
    const { rows: existing } = await pool.query(
      'SELECT id FROM poll_votes WHERE post_id=$1 AND user_id=$2',
      [req.params.postId, req.user!.id],
    );
    if (existing.length) {
      res.status(409).json({ error: 'You have already voted on this poll' }); return;
    }
    let options: Array<{ id: string; vote_count: number }>;
    try {
      options = JSON.parse(post.poll_options) as Array<{ id: string; vote_count: number }>;
    } catch {
      res.status(400).json({ error: 'Invalid poll data' }); return;
    }
    const opt = options.find((o) => o.id === option_id);
    if (!opt) { res.status(400).json({ error: 'Invalid option_id' }); return; }
    opt.vote_count = (opt.vote_count ?? 0) + 1;
    await pool.query('INSERT INTO poll_votes (post_id,user_id,option_id) VALUES ($1,$2,$3)', [req.params.postId, req.user!.id, option_id]);
    await pool.query('UPDATE posts SET poll_options=$1 WHERE id=$2', [JSON.stringify(options), req.params.postId]);
    res.json({ voted: true, poll_options: options });
  } catch { res.status(500).json({ error: 'Failed to vote' }); }
});

router.get('/:postId/results', optionalAuth, async (req: Request, res: Response) => {
  try {
    const realAuthorFilter = req.realOnly ? 'AND u.is_seed=FALSE AND u.is_demo=FALSE' : '';
    const voteJoin = req.realOnly ? 'JOIN users voter ON voter.id=pv.user_id AND voter.is_seed=FALSE AND voter.is_demo=FALSE' : '';
    const { rows } = await pool.query(
      `SELECT p.post_type,p.poll_options,
              (SELECT COUNT(*) FROM poll_votes pv ${voteJoin} WHERE pv.post_id=p.id)::int AS total_votes
       FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=$1 ${realAuthorFilter}`,
      [req.params.postId],
    );
    if (!rows.length) { res.status(404).json({ error: 'Poll not found' }); return; }
    const post = rows[0] as { post_type: string; poll_options: string; total_votes: number };
    if (post.post_type !== 'poll') { res.status(400).json({ error: 'Post is not a poll' }); return; }
    const userVote = req.user
      ? (await pool.query('SELECT option_id FROM poll_votes WHERE post_id=$1 AND user_id=$2', [req.params.postId, req.user.id])).rows[0]?.option_id ?? null
      : null;
    let options = JSON.parse(post.poll_options || '[]') as Array<{ id: string; vote_count?: number }>;
    if (req.realOnly) {
      const { rows: counts } = await pool.query<{ option_id: string; vote_count: number }>(
        `SELECT pv.option_id,COUNT(*)::int AS vote_count FROM poll_votes pv
         JOIN users voter ON voter.id=pv.user_id
         WHERE pv.post_id=$1 AND voter.is_seed=FALSE AND voter.is_demo=FALSE GROUP BY pv.option_id`,
        [req.params.postId],
      );
      const byOption = new Map(counts.map((row) => [row.option_id, row.vote_count]));
      options = options.map((option) => ({ ...option, vote_count: byOption.get(option.id) ?? 0 }));
    }
    res.json({
      poll_options: options,
      total_votes: post.total_votes,
      user_vote: userVote,
    });
  } catch { res.status(500).json({ error: 'Failed to fetch poll results' }); }
});

module.exports = router;
