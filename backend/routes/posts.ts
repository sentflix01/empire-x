/**
 * routes/posts.ts — Social feed posts
 *
 * Phase improvements:
 *   - Replaced ORDER BY RANDOM() with scoring CTE + keyset cursor
 *   - Social graph boost for followed users
 *   - SAFE_SORTS allowlist prevents injection via sort param
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../lib/logger';
import pool from '../db/pool';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { announcementLiveSql, guestPostSql, SIGN_IN_REQUIRED } from '../lib/siteVisibility';
import { getRecord, createRecord, updateRecord, deleteRecord } from '../utils/crud';
import { syncHashtags, resyncHashtags, unlinkHashtags } from './hashtags';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { attachPostViewerState, commentRefusal, feedFilterSql, isBlockedEitherWay, isReaction, notBlockedSql, authorVisibleSql, REACTIONS } from '../lib/socialGraph';

const router = Router();
// ── GET / — smart feed with scoring + keyset cursor ──────────────────────────
// varyByUser is REQUIRED here: feed=true responses embed per-user social
// boosts and following=true filters on the caller's follow graph. Caching
// those under a shared key served one user's personalized feed to another.
/** Guests may open only announcement posts of live, public business sites. */
/**
 * The ranked feed orders by a score, not by time, so it cannot page by
 * created_at. Its cursor is "<snapshot ISO>|<offset>": every page scores posts
 * against the same snapshot time and only includes posts created before it, so
 * the order is stable and no post is skipped or repeated.
 */
export function parseFeedCursor(cursor: string | undefined, now = new Date()): { snapshot: Date; offset: number } | null {
  if (!cursor) return { snapshot: now, offset: 0 };
  const [iso, rawOffset] = cursor.split('|');
  const snapshot = new Date(iso);
  const offset = rawOffset === undefined ? 0 : Number(rawOffset);
  if (Number.isNaN(snapshot.getTime()) || !Number.isInteger(offset) || offset < 0 || offset > 10_000) return null;
  return { snapshot, offset };
}

/** Visibility and blocks for one post (mutes and "not interested" only shape feeds). */
async function viewerMaySeePost(postId: string, viewer?: string): Promise<boolean> {
  const params: unknown[] = [postId];
  const viewerRef = viewer ? (params.push(viewer), '$2') : null;
  const conds = [authorVisibleSql(viewerRef, 'p.author_id')];
  if (viewerRef) conds.push(notBlockedSql(viewerRef, 'p.author_id'));
  const { rows } = await pool.query(`SELECT 1 FROM posts p WHERE p.id=$1 AND ${conds.join(' AND ')}`, params);
  return rows.length > 0;
}

async function guestMaySeePost(postId: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM posts p WHERE p.id=$1 AND ${guestPostSql('p')}`, [postId]);
  return rows.length > 0;
}

router.get('/', optionalAuth, cacheMiddleware('posts:list', 60, { varyByUser: true }), async (req: Request, res: Response) => {
  try {
    const { sort='-created_at', limit='15', author_id, post_type, feed='false', cursor } = req.query as Record<string,string>;
    const lim = Math.min(parseInt(limit)||15, 50);
    // Announcements of sites that are no longer live are hidden; guests see
    // only announcements of public businesses (decision §7).
    const realFilter = (req.realOnly ? `AND p.author_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)` : '')
      + ` AND ${req.user ? announcementLiveSql('p') : guestPostSql('p')}`;

    // Smart feed mode
    if (feed==='true' && !author_id && !post_type) {
      const page = parseFeedCursor(cursor);
      if (!page) { res.status(400).json({ error: 'Invalid cursor value' }); return; }
      let followedIds: string[] = [];
      if (req.user?.id) {
        const { rows: fw } = await pool.query('SELECT followed_id FROM follows WHERE follower_id=$1 LIMIT 500', [req.user.id]);
        followedIds = fw.map((r: {followed_id:string}) => r.followed_id);
      }
      const idList = `{${followedIds.map(id=>`"${id}"`).join(',')}}`;
      const { rows } = await pool.query(
        `SELECT p.*,
           CASE WHEN p.author_id=ANY($3::uuid[]) THEN 30 ELSE 0 END AS social_boost,
           GREATEST(0, 168-EXTRACT(EPOCH FROM ($2::timestamptz-p.created_at))/3600.0) AS recency_score,
           (p.like_count*0.4 + p.comment_count*0.3) AS engagement_score
         FROM posts p WHERE p.created_at < $2 ${realFilter} AND ${feedFilterSql(req.user?.id ? '$5' : null)}
         ORDER BY
           (CASE WHEN p.author_id=ANY($3::uuid[]) THEN 30 ELSE 0 END
            + GREATEST(0, 168-EXTRACT(EPOCH FROM ($2::timestamptz-p.created_at))/3600.0)
            + p.like_count*0.4 + p.comment_count*0.3) DESC,
           p.created_at DESC, p.id DESC LIMIT $1 OFFSET $4`,
        [lim, page.snapshot, idList, page.offset, ...(req.user?.id ? [req.user.id] : [])],
      );
      await attachPostViewerState(req.user?.id, rows as Array<Record<string,unknown>>);
      res.json({
        posts: rows,
        next_cursor: rows.length===lim ? `${page.snapshot.toISOString()}|${page.offset + rows.length}` : null,
      });
      return;
    }

    // Default list with keyset pagination (time-ordered, so the cursor is a timestamp)
    const cursorTs = cursor ? new Date(cursor) : new Date();
    if (isNaN(cursorTs.getTime())) { res.status(400).json({ error: 'Invalid cursor value' }); return; }
    const conditions = [`p.created_at < $1`];
    const params: unknown[] = [cursorTs];
    if (author_id) { params.push(author_id); conditions.push(`p.author_id=$${params.length}`); }
    if (post_type) { params.push(post_type); conditions.push(`p.post_type=$${params.length}`); }
    if (req.realOnly) conditions.push(`p.author_id IN (SELECT id FROM users WHERE is_seed=FALSE AND is_demo=FALSE)`);
    conditions.push(req.user ? announcementLiveSql('p') : guestPostSql('p'));
    if (req.user?.id) { params.push(req.user.id); conditions.push(feedFilterSql(`$${params.length}`)); }
    else conditions.push(feedFilterSql(null));
    const pinnedFirst = Boolean(author_id && !cursor);
    if (author_id) conditions.push('p.pinned_at IS NULL');
    if (req.query.following==='true' && req.user?.id) {
      params.push(req.user.id);
      conditions.push(`p.author_id IN (SELECT followed_id FROM follows WHERE follower_id=$${params.length})`);
    }
    const SAFE_SORTS = new Set(['created_at','like_count','comment_count']);
    const rawSort = sort?.startsWith('-') ? sort.slice(1) : sort;
    const sortCol = SAFE_SORTS.has(rawSort) ? rawSort : 'created_at';
    const sortDir = sort?.startsWith('-') ? 'DESC' : 'ASC';
    params.push(lim);
    const { rows } = await pool.query(
      `SELECT p.* FROM posts p WHERE ${conditions.join(' AND ')} ORDER BY p.${sortCol} ${sortDir} LIMIT $${params.length}`,
      params,
    );
    let pinned: Array<Record<string, unknown>> = [];
    if (pinnedFirst) {
      const pinParams: unknown[] = [author_id];
      const viewerRef = req.user?.id ? (pinParams.push(req.user.id), '$2') : null;
      ({ rows: pinned } = await pool.query(
        `SELECT p.* FROM posts p WHERE p.author_id=$1 AND p.pinned_at IS NOT NULL AND ${feedFilterSql(viewerRef)}
          ${req.user ? '' : `AND ${guestPostSql('p')}`} ORDER BY p.pinned_at DESC LIMIT 3`,
        pinParams,
      ));
    }
    const all = [...pinned, ...rows] as Array<Record<string,unknown>>;
    await attachPostViewerState(req.user?.id, all);
    res.json({ posts: all, next_cursor: rows.length===lim ? rows[rows.length-1].created_at : null });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to fetch posts');
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const post = await getRecord('posts', req.params.id, { realOnly: req.realOnly });
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    if (!req.user && !(await guestMaySeePost(req.params.id))) { res.status(401).json({ error: 'Sign in to see this post.', code: SIGN_IN_REQUIRED }); return; }
    if (!(await viewerMaySeePost(req.params.id, req.user?.id))) { res.status(404).json({ error: 'Post not found' }); return; }
    await attachPostViewerState(req.user?.id, [post as unknown as Record<string,unknown>]);
    res.json(post);
  } catch { res.status(500).json({ error: 'Failed to fetch post' }); }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { content, image_url, post_type, poll_options, poll_ends_at } = req.body as Record<string,unknown>;
  if (typeof content !== 'string' || !content.trim()) { res.status(400).json({ error: 'Content is required' }); return; }
  if (post_type !== undefined && !['text', 'image', 'product', 'task', 'event', 'poll'].includes(String(post_type))) {
    res.status(422).json({ error: 'Invalid post_type' }); return;
  }
  try {
    const { rows: profiles } = await pool.query('SELECT display_name, avatar_url, default_comment_policy FROM user_profiles WHERE user_id=$1', [req.user!.id]);
    const profile = (profiles[0] ?? {}) as Record<string,string>;
    const post = await createRecord('posts', {
      author_id:    req.user!.id,
      author_name:  profile.display_name ?? null,
      author_avatar: profile.avatar_url ?? null,
      content,
      image_url: image_url ?? null,
      post_type: poll_options ? 'poll' : (post_type ?? 'text'),
      poll_options: poll_options ? JSON.stringify(
        Array.isArray(poll_options)
          ? (poll_options as string[]).map((text,i)=>({id:String(i+1),text,vote_count:0}))
          : poll_options
      ) : null,
      poll_ends_at: poll_ends_at ?? null,
      // New posts start with the owner's default "who can comment" (Privacy settings).
      comment_policy: ['everyone', 'followers', 'off'].includes(profile.default_comment_policy) ? profile.default_comment_policy : 'everyone',
    });
    syncHashtags(post.id as string, content as string).catch(()=>undefined);
    invalidateCache('posts:list').catch(()=>undefined);
    res.status(201).json(post);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to create post');
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{author_id:string; image_url:string|null}>('posts', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Post not found' }); return; }
    if (existing.author_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const body = req.body as Record<string, unknown>;
    const allowed = ['content', 'image_url', 'post_type'] as const;
    const updates = Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable post fields provided' }); return; }
    if (updates.image_url !== undefined && updates.image_url !== null && typeof updates.image_url !== 'string') {
      res.status(422).json({ error: 'image_url must be a string or null' }); return;
    }
    // A photo post may have an empty caption; a post with no photo needs text.
    const imageAfterEdit = updates.image_url !== undefined ? updates.image_url : existing.image_url;
    if (updates.content !== undefined && (typeof updates.content !== 'string' || (!updates.content.trim() && !imageAfterEdit))) {
      res.status(422).json({ error: 'content must be a non-empty string' }); return;
    }
    if (updates.content === undefined && updates.image_url === null && !String((existing as Record<string,unknown>).content ?? '').trim()) {
      res.status(422).json({ error: 'A post needs text or a photo' }); return;
    }
    if (updates.post_type !== undefined && !['text', 'image', 'product', 'task', 'event', 'poll'].includes(String(updates.post_type))) {
      res.status(422).json({ error: 'Invalid post_type' }); return;
    }
    if (updates.content !== undefined || updates.image_url !== undefined) (updates as Record<string, unknown>).edited_at = new Date().toISOString();
    const updated = await updateRecord('posts', req.params.id, updates);
    if (typeof updates.content === 'string') await resyncHashtags(req.params.id, updates.content).catch(() => undefined);
    invalidateCache('posts:list').catch(() => undefined);
    res.json(updated);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to update post');
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{author_id:string}>('posts', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Post not found' }); return; }
    if (existing.author_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    // Likes and saves point at posts by target_id without a foreign key, and
    // hashtag post counts are denormalised, so tidy them before the delete.
    const { rows: tagRows } = await pool.query<{ hashtag_id: string }>('SELECT hashtag_id FROM post_hashtags WHERE post_id = $1', [req.params.id]);
    await unlinkHashtags(req.params.id, tagRows.map((row) => row.hashtag_id));
    await pool.query("DELETE FROM likes WHERE target_type = 'post' AND target_id = $1", [req.params.id]);
    await pool.query("DELETE FROM saves WHERE target_type = 'post' AND target_id = $1", [req.params.id]);
    await deleteRecord('posts', req.params.id);
    invalidateCache('posts:list').catch(()=>undefined);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to delete post');
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Like toggle — atomic CTE (single round-trip)
router.get('/:id/like', optionalAuth, async (req: Request, res: Response) => {
  if (!req.user?.id) { res.json({ liked: false }); return; }
  try {
    const { rows } = await pool.query(`SELECT EXISTS(SELECT 1 FROM likes WHERE target_id=$1 AND target_type='post' AND user_id=$2) AS liked`, [req.params.id, req.user.id]);
    res.json({ liked: rows[0]?.liked ?? false });
  } catch { res.status(500).json({ error: 'Failed to fetch like status' }); }
});

router.post('/:id/like', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (!(await viewerMaySeePost(id, req.user!.id))) { res.status(404).json({ error: 'Post not found' }); return; }
    const { rows: likeResult } = await pool.query(
      `WITH del AS (DELETE FROM likes WHERE target_id=$1 AND user_id=$2 RETURNING id),
            ins AS (INSERT INTO likes (target_id,target_type,user_id) SELECT $1,'post',$2 WHERE NOT EXISTS (SELECT 1 FROM del) RETURNING id)
       SELECT CASE WHEN EXISTS (SELECT 1 FROM ins) THEN true ELSE false END AS liked`,
      [id, req.user!.id],
    );
    const liked = likeResult[0]?.liked ?? false;
    const [countResult, postResult] = await Promise.all([
      pool.query(`UPDATE posts SET like_count=GREATEST(0,like_count+$1) WHERE id=$2 RETURNING like_count`, [liked?1:-1, id]),
      liked ? pool.query('SELECT author_id,author_name,notifications_off FROM posts WHERE id=$1', [id]) : Promise.resolve({ rows: [] }),
    ]);
    invalidateCache('posts:list').catch(()=>undefined);
    if (liked && postResult.rows.length && postResult.rows[0].author_id !== req.user!.id && !postResult.rows[0].notifications_off) {
      const authorId = postResult.rows[0].author_id as string;
      pool.query('SELECT display_name FROM user_profiles WHERE user_id=$1', [req.user!.id])
        .then(async ({rows:[liker]}) => {
          const name = (liker as Record<string,string>)?.display_name ?? 'Someone';
          const { rows:[notif] } = await pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'like',$2,'','/feed?post='||$3,false) RETURNING *`, [authorId, `${name} liked your post`, id]);
          emitNotification(authorId, notif as Record<string,unknown>);
          sendPushToUser(authorId, `${name} liked your post`, '', `/feed?post=${id}`).catch(()=>undefined);
        }).catch(()=>undefined);
    }
    res.json({ liked, like_count: countResult.rows[0]?.like_count ?? 0 });
  } catch { res.status(500).json({ error: 'Failed to toggle like' }); }
});

// ── Reactions: one per person per post (❤️ 👍 😂 😮 😢 👏 🔥) ─────────────────
async function reactionSummary(postId: string, viewer?: string) {
  const [{ rows: counts }, { rows: mine }, { rows: post }] = await Promise.all([
    pool.query("SELECT reaction, COUNT(*)::int AS n FROM likes WHERE target_type='post' AND target_id=$1 GROUP BY reaction ORDER BY n DESC", [postId]),
    viewer ? pool.query("SELECT reaction FROM likes WHERE target_type='post' AND target_id=$1 AND user_id=$2", [postId, viewer]) : Promise.resolve({ rows: [] }),
    pool.query('SELECT author_id, hide_like_count FROM posts WHERE id=$1', [postId]),
  ]);
  const total = (counts as Array<{ n: number }>).reduce((sum, c) => sum + c.n, 0);
  const hidden = post[0]?.hide_like_count && post[0]?.author_id !== viewer;
  return {
    my_reaction: (mine[0] as { reaction?: string } | undefined)?.reaction ?? null,
    like_count: hidden ? null : total,
    top_reactions: (counts as Array<{ reaction: string }>).slice(0, 3).map((c) => c.reaction),
    counts: hidden ? undefined : Object.fromEntries((counts as Array<{ reaction: string; n: number }>).map((c) => [c.reaction, c.n])),
  };
}

router.put('/:id/reaction', requireAuth, async (req: Request, res: Response) => {
  const { reaction } = req.body as { reaction?: unknown };
  if (!isReaction(reaction)) { res.status(422).json({ error: 'invalid_reaction', allowed: REACTIONS }); return; }
  try {
    if (!(await viewerMaySeePost(req.params.id, req.user!.id))) { res.status(404).json({ error: 'Post not found' }); return; }
    const { rows } = await pool.query(
      `INSERT INTO likes (target_id, target_type, user_id, reaction) VALUES ($1, 'post', $2, $3)
       ON CONFLICT (target_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction
       RETURNING (xmax = 0) AS inserted`,
      [req.params.id, req.user!.id, reaction],
    );
    if (rows[0]?.inserted) {
      await pool.query('UPDATE posts SET like_count = like_count + 1 WHERE id = $1', [req.params.id]);
      const { rows: [post] } = await pool.query('SELECT author_id, notifications_off FROM posts WHERE id=$1', [req.params.id]);
      if (post && post.author_id !== req.user!.id && !post.notifications_off) {
        pool.query('SELECT display_name FROM user_profiles WHERE user_id=$1', [req.user!.id]).then(async ({ rows: [who] }) => {
          const name = (who as Record<string, string> | undefined)?.display_name ?? 'Someone';
          const { rows: [notif] } = await pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'like',$2,'','/feed?post='||$3,false) RETURNING *`, [post.author_id, `${name} reacted ${reaction} to your post`, req.params.id]);
          emitNotification(post.author_id, notif as Record<string, unknown>);
        }).catch(() => undefined);
      }
    }
    invalidateCache('posts:list').catch(() => undefined);
    res.json(await reactionSummary(req.params.id, req.user!.id));
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to react');
    res.status(500).json({ error: 'Failed to react' });
  }
});

router.delete('/:id/reaction', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM likes WHERE target_type='post' AND target_id=$1 AND user_id=$2", [req.params.id, req.user!.id]);
    if (rowCount) await pool.query('UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = $1', [req.params.id]);
    invalidateCache('posts:list').catch(() => undefined);
    res.json(await reactionSummary(req.params.id, req.user!.id));
  } catch { res.status(500).json({ error: 'Failed to remove reaction' }); }
});

/** Who reacted, with a tab per reaction. People who hide their reactions are counted but not listed. */
router.get('/:id/reactions', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!(await viewerMaySeePost(req.params.id, req.user!.id))) { res.status(404).json({ error: 'Post not found' }); return; }
    const summary = await reactionSummary(req.params.id, req.user!.id);
    if (summary.like_count === null) { res.json({ ...summary, people: [] }); return; }
    const filter = isReaction(req.query.reaction) ? req.query.reaction : null;
    const { rows } = await pool.query(
      `SELECT l.user_id, l.reaction, up.display_name, up.avatar_url FROM likes l
         LEFT JOIN user_profiles up ON up.user_id = l.user_id
        WHERE l.target_type='post' AND l.target_id=$1 AND ($2::text IS NULL OR l.reaction=$2)
          AND (l.user_id=$3 OR COALESCE(up.show_reactions, TRUE))
          AND ${notBlockedSql('$3', 'l.user_id')}
        ORDER BY l.created_at DESC LIMIT 200`,
      [req.params.id, filter, req.user!.id],
    );
    res.json({ ...summary, people: rows });
  } catch { res.status(500).json({ error: 'Failed to load reactions' }); }
});

/** "Not interested": the post leaves this viewer's feed (Undo with DELETE). */
router.post('/:id/hide', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('INSERT INTO post_hidden (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user!.id, req.params.id]);
    invalidateCache('posts:list').catch(() => undefined);
    res.json({ hidden: true });
  } catch { res.status(500).json({ error: 'Failed to hide post' }); }
});
router.delete('/:id/hide', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM post_hidden WHERE user_id=$1 AND post_id=$2', [req.user!.id, req.params.id]);
    invalidateCache('posts:list').catch(() => undefined);
    res.json({ hidden: false });
  } catch { res.status(500).json({ error: 'Failed to unhide post' }); }
});

/** Owner settings: pin to profile, who can comment, hide like count, notifications off. */
router.put('/:id/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows: [post] } = await pool.query('SELECT author_id FROM posts WHERE id=$1', [req.params.id]);
    if (!post) { res.status(404).json({ error: 'Post not found' }); return; }
    if (post.author_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    const body = req.body as Record<string, unknown>;
    const sets: string[] = []; const values: unknown[] = [];
    if (body.pinned !== undefined) {
      if (typeof body.pinned !== 'boolean') { res.status(422).json({ error: 'pinned must be true or false' }); return; }
      if (body.pinned) {
        const { rows: [c] } = await pool.query('SELECT COUNT(*)::int AS n FROM posts WHERE author_id=$1 AND pinned_at IS NOT NULL AND id<>$2', [req.user!.id, req.params.id]);
        if (c.n >= 3) { res.status(422).json({ error: 'pin_limit', message: 'You can pin up to 3 posts. Unpin one first.' }); return; }
      }
      sets.push(`pinned_at = ${body.pinned ? 'COALESCE(pinned_at, NOW())' : 'NULL'}`);
    }
    if (body.comment_policy !== undefined) {
      if (!['everyone', 'followers', 'off'].includes(String(body.comment_policy))) { res.status(422).json({ error: 'comment_policy must be everyone, followers or off' }); return; }
      values.push(body.comment_policy); sets.push(`comment_policy = $${values.length}`);
    }
    for (const key of ['hide_like_count', 'notifications_off'] as const) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== 'boolean') { res.status(422).json({ error: `${key} must be true or false` }); return; }
      values.push(body[key]); sets.push(`${key} = $${values.length}`);
    }
    if (!sets.length) { res.status(400).json({ error: 'No settings provided' }); return; }
    values.push(req.params.id);
    const { rows: [updated] } = await pool.query(
      `UPDATE posts SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING id, pinned_at, comment_policy, hide_like_count, notifications_off`,
      values,
    );
    invalidateCache('posts:list').catch(() => undefined);
    res.json({ ...updated, is_pinned: Boolean(updated.pinned_at) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to update post settings');
    res.status(500).json({ error: 'Failed to update post settings' });
  }
});

// Comments
router.get('/:id/comments', optionalAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user && !(await guestMaySeePost(req.params.id))) { res.status(401).json({ error: 'Sign in to see these comments.', code: SIGN_IN_REQUIRED }); return; }
    const realFilter = req.realOnly ? 'AND comment_author.is_seed=FALSE AND comment_author.is_demo=FALSE' : '';
    const realReplyFilter = req.realOnly ? 'AND reply_author.is_seed=FALSE AND reply_author.is_demo=FALSE' : '';
    if (!(await viewerMaySeePost(req.params.id, req.user?.id))) { res.status(404).json({ error: 'Post not found' }); return; }
    const viewer = req.user?.id ?? null;
    const viewerFilter = viewer
      ? `AND ${notBlockedSql('$2', 'c.author_id')}
         AND (c.author_id=$2 OR p.author_id=$2 OR NOT EXISTS (SELECT 1 FROM user_restricts ur WHERE ur.owner_id=p.author_id AND ur.restricted_id=c.author_id))`
      : 'AND NOT EXISTS (SELECT 1 FROM user_restricts ur WHERE ur.owner_id=p.author_id AND ur.restricted_id=c.author_id)';
    const { rows } = await pool.query(
      `SELECT c.*,(SELECT COUNT(*)::int FROM comments r JOIN users reply_author ON reply_author.id=r.author_id WHERE r.parent_id=c.id ${realReplyFilter}) AS reply_count,
         (SELECT COUNT(*)::int FROM comment_reactions cr WHERE cr.comment_id=c.id) AS reaction_count,
         (SELECT ARRAY(SELECT cr.reaction FROM comment_reactions cr WHERE cr.comment_id=c.id GROUP BY cr.reaction ORDER BY COUNT(*) DESC LIMIT 3)) AS top_reactions,
         ${viewer ? '(SELECT cr.reaction FROM comment_reactions cr WHERE cr.comment_id=c.id AND cr.user_id=$2)' : 'NULL'} AS my_reaction
       FROM comments c JOIN users comment_author ON comment_author.id=c.author_id JOIN posts p ON p.id=c.post_id
       WHERE c.post_id=$1 ${realFilter} ${viewerFilter}
       ORDER BY COALESCE(c.parent_id,c.id) ASC, c.parent_id IS NOT NULL ASC, c.created_at ASC`,
      viewer ? [req.params.id, viewer] : [req.params.id],
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Failed to fetch comments' }); }
});

router.post('/:id/comments', requireAuth, async (req: Request, res: Response) => {
  const { content, parent_id } = req.body as { content?: string; parent_id?: string };
  if (!content?.trim()) { res.status(400).json({ error: 'Content is required' }); return; }
  try {
    let parentId: string | null = null;
    if (parent_id) {
      const { rows: parents } = await pool.query('SELECT id,parent_id FROM comments WHERE id=$1 AND post_id=$2', [parent_id, req.params.id]);
      if (!parents.length) { res.status(400).json({ error: 'Reply target not found' }); return; }
      parentId = (parents[0].parent_id as string|null) || (parents[0].id as string);
    }
    const [profileResult, postResult] = await Promise.all([
      pool.query('SELECT display_name, avatar_url FROM user_profiles WHERE user_id=$1', [req.user!.id]),
      pool.query('SELECT author_id, comment_policy, notifications_off FROM posts WHERE id=$1', [req.params.id]),
    ]);
    if (!postResult.rows.length || !(await viewerMaySeePost(req.params.id, req.user!.id))) { res.status(404).json({ error: 'Post not found' }); return; }
    const refusal = await commentRefusal(postResult.rows[0], req.user!.id);
    if (refusal) { res.status(403).json({ error: 'comments_not_allowed', message: refusal }); return; }
    const profile = (profileResult.rows[0] ?? {}) as Record<string,string>;
    const [commentResult] = await Promise.all([
      pool.query(
        `INSERT INTO comments (post_id,author_id,author_name,author_avatar,content,parent_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *,0::int AS reply_count`,
        [req.params.id, req.user!.id, profile.display_name??null, profile.avatar_url??null, content.trim(), parentId],
      ),
      pool.query('UPDATE posts SET comment_count=comment_count+1 WHERE id=$1', [req.params.id]),
    ]);
    invalidateCache('posts:list').catch(()=>undefined);
    const commenterName = profile.display_name ?? 'Someone';
    if (postResult.rows.length && postResult.rows[0].author_id !== req.user!.id && !postResult.rows[0].notifications_off) {
      const authorId = postResult.rows[0].author_id as string;
      pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'comment',$2,$3,'/feed?post='||$4,false) RETURNING *`,
        [authorId, `${commenterName} ${parentId?'replied to a comment on':'commented on'} your post`, content.trim().slice(0,80), req.params.id]
      ).then(({rows:[notif]}) => {
        emitNotification(authorId, notif as Record<string,unknown>);
        sendPushToUser(authorId, notif.title as string, notif.body as string, `/feed?post=${req.params.id}`).catch(()=>undefined);
      }).catch(()=>undefined);
    }
    if (parentId) {
      pool.query('SELECT author_id FROM comments WHERE id=$1', [parentId])
        .then(async ({rows}) => {
          const parentAuthor = rows[0]?.author_id as string|undefined;
          if (parentAuthor && parentAuthor!==req.user!.id && parentAuthor!==postResult.rows[0]?.author_id) {
            const { rows:[notif] } = await pool.query(`INSERT INTO notifications (user_id,type,title,body,link,is_read) VALUES ($1,'comment',$2,$3,'/feed?post='||$4,false) RETURNING *`,
              [parentAuthor, `${commenterName} replied to your comment`, content.trim().slice(0,80), req.params.id]);
            emitNotification(parentAuthor, notif as Record<string,unknown>);
            sendPushToUser(parentAuthor, notif.title as string, notif.body as string, `/feed?post=${req.params.id}`).catch(()=>undefined);
          }
        }).catch(()=>undefined);
    }
    res.status(201).json(commentResult.rows[0]);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Failed to create comment');
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.delete('/:postId/comments/:commentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT c.author_id, c.parent_id, p.author_id AS post_author_id FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=$1 AND c.post_id=$2', [req.params.commentId, req.params.postId]);
    if (!rows.length) { res.status(404).json({ error: 'Comment not found' }); return; }
    const mayDelete = rows[0].author_id === req.user!.id || rows[0].post_author_id === req.user!.id || req.user!.role === 'admin';
    if (!mayDelete) { res.status(403).json({ error: 'Forbidden' }); return; }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS n FROM comments WHERE id=$1 OR parent_id=$1`, [req.params.commentId]);
    await pool.query('DELETE FROM comments WHERE id=$1 OR parent_id=$1', [req.params.commentId]);
    await pool.query('UPDATE posts SET comment_count=GREATEST(0,comment_count-$1) WHERE id=$2', [countRows[0].n, req.params.postId]);
    invalidateCache('posts:list').catch(()=>undefined);
    res.json({ success: true, deleted: countRows[0].n });
  } catch { res.status(500).json({ error: 'Failed to delete comment' }); }
});

/** Edit your own comment; it then shows "edited". */
router.put('/:postId/comments/:commentId', requireAuth, async (req: Request, res: Response) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content) { res.status(422).json({ error: 'content must be a non-empty string' }); return; }
  if (content.length > 2000) { res.status(422).json({ error: 'content is too long' }); return; }
  try {
    const { rows: [comment] } = await pool.query('SELECT author_id FROM comments WHERE id=$1 AND post_id=$2', [req.params.commentId, req.params.postId]);
    if (!comment) { res.status(404).json({ error: 'Comment not found' }); return; }
    if (comment.author_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    const { rows: [updated] } = await pool.query('UPDATE comments SET content=$1, edited_at=NOW(), updated_at=NOW() WHERE id=$2 RETURNING *', [content, req.params.commentId]);
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to edit comment' }); }
});

router.put('/:postId/comments/:commentId/reaction', requireAuth, async (req: Request, res: Response) => {
  const { reaction } = req.body as { reaction?: unknown };
  if (!isReaction(reaction)) { res.status(422).json({ error: 'invalid_reaction', allowed: REACTIONS }); return; }
  try {
    const { rows: [comment] } = await pool.query('SELECT author_id FROM comments WHERE id=$1 AND post_id=$2', [req.params.commentId, req.params.postId]);
    if (!comment || !(await viewerMaySeePost(req.params.postId, req.user!.id)) || await isBlockedEitherWay(comment.author_id, req.user!.id)) {
      res.status(404).json({ error: 'Comment not found' }); return;
    }
    await pool.query(
      `INSERT INTO comment_reactions (comment_id, user_id, reaction) VALUES ($1, $2, $3)
       ON CONFLICT (comment_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction`,
      [req.params.commentId, req.user!.id, reaction],
    );
    const { rows: [sum] } = await pool.query('SELECT COUNT(*)::int AS reaction_count FROM comment_reactions WHERE comment_id=$1', [req.params.commentId]);
    res.json({ my_reaction: reaction, reaction_count: sum.reaction_count });
  } catch { res.status(500).json({ error: 'Failed to react' }); }
});

router.delete('/:postId/comments/:commentId/reaction', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM comment_reactions WHERE comment_id=$1 AND user_id=$2', [req.params.commentId, req.user!.id]);
    const { rows: [sum] } = await pool.query('SELECT COUNT(*)::int AS reaction_count FROM comment_reactions WHERE comment_id=$1', [req.params.commentId]);
    res.json({ my_reaction: null, reaction_count: sum.reaction_count });
  } catch { res.status(500).json({ error: 'Failed to remove reaction' }); }
});

module.exports = router;
module.exports.parseFeedCursor = parseFeedCursor;
