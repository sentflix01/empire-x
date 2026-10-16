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
import { syncHashtags } from './hashtags';
import { emitNotification } from '../socket';
import { sendPushToUser } from './push';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';

const router = Router();
/** Attach per-user liked_by_me to a page of posts (single query, no N+1). */
async function attachLikedByMe(userId: string | undefined, rows: Array<Record<string,unknown>>): Promise<void> {
  if (!userId || !rows.length) return;
  const ids = rows.map(r => String(r.id));
  const { rows: liked } = await pool.query(
    "SELECT target_id FROM likes WHERE target_type='post' AND user_id=$1 AND target_id=ANY($2::uuid[])",
    [userId, ids],
  );
  const set = new Set(liked.map((l: { target_id: string }) => String(l.target_id)));
  for (const r of rows) r.liked_by_me = set.has(String(r.id));
}


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
         FROM posts p WHERE p.created_at < $2 ${realFilter}
         ORDER BY
           (CASE WHEN p.author_id=ANY($3::uuid[]) THEN 30 ELSE 0 END
            + GREATEST(0, 168-EXTRACT(EPOCH FROM ($2::timestamptz-p.created_at))/3600.0)
            + p.like_count*0.4 + p.comment_count*0.3) DESC,
           p.created_at DESC, p.id DESC LIMIT $1 OFFSET $4`,
        [lim, page.snapshot, idList, page.offset],
      );
      await attachLikedByMe(req.user?.id, rows as Array<Record<string,unknown>>);
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
    await attachLikedByMe(req.user?.id, rows as Array<Record<string,unknown>>);
    res.json({ posts: rows, next_cursor: rows.length===lim ? rows[rows.length-1].created_at : null });
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
    await attachLikedByMe(req.user?.id, [post as unknown as Record<string,unknown>]);
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
    const { rows: profiles } = await pool.query('SELECT display_name, avatar_url FROM user_profiles WHERE user_id=$1', [req.user!.id]);
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
    const existing = await getRecord<{author_id:string}>('posts', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Post not found' }); return; }
    if (existing.author_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const body = req.body as Record<string, unknown>;
    const allowed = ['content', 'image_url', 'post_type'] as const;
    const updates = Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
    if (!Object.keys(updates).length) { res.status(400).json({ error: 'No updatable post fields provided' }); return; }
    if (updates.content !== undefined && (typeof updates.content !== 'string' || !updates.content.trim())) {
      res.status(422).json({ error: 'content must be a non-empty string' }); return;
    }
    if (updates.post_type !== undefined && !['text', 'image', 'product', 'task', 'event', 'poll'].includes(String(updates.post_type))) {
      res.status(422).json({ error: 'Invalid post_type' }); return;
    }
    const updated = await updateRecord('posts', req.params.id, updates);
    invalidateCache('posts:list').catch(() => undefined);
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to update post' }); }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await getRecord<{author_id:string}>('posts', req.params.id);
    if (!existing) { res.status(404).json({ error: 'Post not found' }); return; }
    if (existing.author_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    await deleteRecord('posts', req.params.id);
    invalidateCache('posts:list').catch(()=>undefined);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete post' }); }
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
    const { rows: likeResult } = await pool.query(
      `WITH del AS (DELETE FROM likes WHERE target_id=$1 AND user_id=$2 RETURNING id),
            ins AS (INSERT INTO likes (target_id,target_type,user_id) SELECT $1,'post',$2 WHERE NOT EXISTS (SELECT 1 FROM del) RETURNING id)
       SELECT CASE WHEN EXISTS (SELECT 1 FROM ins) THEN true ELSE false END AS liked`,
      [id, req.user!.id],
    );
    const liked = likeResult[0]?.liked ?? false;
    const [countResult, postResult] = await Promise.all([
      pool.query(`UPDATE posts SET like_count=GREATEST(0,like_count+$1) WHERE id=$2 RETURNING like_count`, [liked?1:-1, id]),
      liked ? pool.query('SELECT author_id,author_name FROM posts WHERE id=$1', [id]) : Promise.resolve({ rows: [] }),
    ]);
    invalidateCache('posts:list').catch(()=>undefined);
    if (liked && postResult.rows.length && postResult.rows[0].author_id !== req.user!.id) {
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

// Comments
router.get('/:id/comments', optionalAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user && !(await guestMaySeePost(req.params.id))) { res.status(401).json({ error: 'Sign in to see these comments.', code: SIGN_IN_REQUIRED }); return; }
    const realFilter = req.realOnly ? 'AND comment_author.is_seed=FALSE AND comment_author.is_demo=FALSE' : '';
    const realReplyFilter = req.realOnly ? 'AND reply_author.is_seed=FALSE AND reply_author.is_demo=FALSE' : '';
    const { rows } = await pool.query(
      `SELECT c.*,(SELECT COUNT(*)::int FROM comments r JOIN users reply_author ON reply_author.id=r.author_id WHERE r.parent_id=c.id ${realReplyFilter}) AS reply_count
       FROM comments c JOIN users comment_author ON comment_author.id=c.author_id WHERE c.post_id=$1 ${realFilter}
       ORDER BY COALESCE(c.parent_id,c.id) ASC, c.parent_id IS NOT NULL ASC, c.created_at ASC`,
      [req.params.id],
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
      pool.query('SELECT author_id FROM posts WHERE id=$1', [req.params.id]),
    ]);
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
    if (postResult.rows.length && postResult.rows[0].author_id !== req.user!.id) {
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
    const { rows } = await pool.query('SELECT author_id,parent_id FROM comments WHERE id=$1 AND post_id=$2', [req.params.commentId, req.params.postId]);
    if (!rows.length) { res.status(404).json({ error: 'Comment not found' }); return; }
    if (rows[0].author_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS n FROM comments WHERE id=$1 OR parent_id=$1`, [req.params.commentId]);
    await pool.query('DELETE FROM comments WHERE id=$1 OR parent_id=$1', [req.params.commentId]);
    await pool.query('UPDATE posts SET comment_count=GREATEST(0,comment_count-$1) WHERE id=$2', [countRows[0].n, req.params.postId]);
    invalidateCache('posts:list').catch(()=>undefined);
    res.json({ success: true, deleted: countRows[0].n });
  } catch { res.status(500).json({ error: 'Failed to delete comment' }); }
});

module.exports = router;
module.exports.parseFeedCursor = parseFeedCursor;
