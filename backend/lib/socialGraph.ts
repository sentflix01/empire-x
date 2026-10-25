/**
 * Who may see and interact with whom (migrate2 blocks, migrate67 mutes,
 * restricts, hidden posts and privacy settings). One place for the rules so
 * the feed, comments, reactions, follows, search and messages agree:
 *   - Blocks work both ways: neither person sees or interacts with the other.
 *   - Mutes and hidden posts only shape the viewer's own feed.
 *   - Restricted people's comments on your posts are seen only by them (and you).
 *   - Who sees my posts: public / followers / private (only me).
 *   - Who can comment on a post: everyone / followers / off.
 */
import pool from '../db/pool';
import { isEmoji } from './emoji';

/** The quick row shown first; any single emoji is accepted (lib/emoji.ts). */
export const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '👏', '🔥'] as const;
export type Reaction = string;
export const isReaction = (v: unknown): v is Reaction => isEmoji(v);

/** SQL: no block between the viewer ($viewer) and the user in `userCol`, either way. */
export function notBlockedSql(viewer: string, userCol: string): string {
  return `NOT EXISTS (SELECT 1 FROM blocks bl WHERE (bl.blocker_id=${viewer} AND bl.blocked_id=${userCol}) OR (bl.blocker_id=${userCol} AND bl.blocked_id=${viewer}))`;
}

/** SQL: the viewer may see posts by the user in `authorCol` under that user's "who sees my posts". */
export function authorVisibleSql(viewer: string | null, authorCol: string): string {
  const setting = `COALESCE((SELECT vis.profile_visibility FROM user_profiles vis WHERE vis.user_id=${authorCol} LIMIT 1), 'public')`;
  if (!viewer) return `${setting}='public'`;
  return `(${authorCol}=${viewer} OR ${setting}='public' OR (${setting}='followers' AND EXISTS (SELECT 1 FROM follows vf WHERE vf.follower_id=${viewer} AND vf.followed_id=${authorCol})))`;
}

/** SQL for a feed or post list: visibility, blocks, the viewer's mutes and hidden posts. */
export function feedFilterSql(viewer: string | null, alias = 'p'): string {
  const parts = [authorVisibleSql(viewer, `${alias}.author_id`)];
  if (viewer) {
    parts.push(notBlockedSql(viewer, `${alias}.author_id`));
    parts.push(`NOT EXISTS (SELECT 1 FROM user_mutes um WHERE um.muter_id=${viewer} AND um.muted_id=${alias}.author_id)`);
    parts.push(`NOT EXISTS (SELECT 1 FROM post_hidden ph WHERE ph.user_id=${viewer} AND ph.post_id=${alias}.id)`);
  }
  return parts.join(' AND ');
}

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false;
  const { rows } = await pool.query(
    'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1',
    [a, b],
  );
  return rows.length > 0;
}

export async function follows(follower: string, followed: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM follows WHERE follower_id=$1 AND followed_id=$2 LIMIT 1', [follower, followed]);
  return rows.length > 0;
}

/** Why a user can't comment on a post, or null when they can. */
export async function commentRefusal(post: { author_id: string; comment_policy?: string | null }, userId: string): Promise<string | null> {
  if (post.author_id === userId) return null;
  if (await isBlockedEitherWay(post.author_id, userId)) return 'You can’t comment on this post.';
  const policy = post.comment_policy || 'everyone';
  if (policy === 'off') return 'Comments are turned off for this post.';
  if (policy === 'followers' && !(await follows(userId, post.author_id))) return 'Only people who follow this account can comment.';
  return null;
}

/** Whether `viewer` may message `target` under the target's "who can message me". */
export async function messageRefusal(viewer: string, target: string): Promise<string | null> {
  if (await isBlockedEitherWay(viewer, target)) return 'You can’t message this person.';
  const { rows } = await pool.query('SELECT message_policy FROM user_profiles WHERE user_id=$1 LIMIT 1', [target]);
  const policy = rows[0]?.message_policy ?? 'everyone';
  if (policy === 'nobody') return 'This person isn’t taking new messages.';
  if (policy === 'followers' && !(await follows(viewer, target))) return 'This person takes messages only from their followers.';
  return null;
}

/** Per-viewer extras for a page of posts: my reaction, top reactions, owner-hidden counts. */
export async function attachPostViewerState(viewer: string | undefined, rows: Array<Record<string, unknown>>): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => String(r.id));
  const [{ rows: mine }, { rows: top }] = await Promise.all([
    viewer
      ? pool.query("SELECT target_id, reaction FROM likes WHERE target_type='post' AND user_id=$1 AND target_id=ANY($2::uuid[])", [viewer, ids])
      : Promise.resolve({ rows: [] as Array<{ target_id: string; reaction: string }> }),
    pool.query(
      `SELECT target_id, reaction, COUNT(*)::int AS n FROM likes
        WHERE target_type='post' AND target_id=ANY($1::uuid[]) GROUP BY target_id, reaction`,
      [ids],
    ),
  ]);
  const myMap = new Map(mine.map((m: { target_id: string; reaction: string }) => [String(m.target_id), m.reaction]));
  const topMap = new Map<string, Array<{ reaction: string; n: number }>>();
  for (const t of top as Array<{ target_id: string; reaction: string; n: number }>) {
    const list = topMap.get(String(t.target_id)) ?? [];
    list.push({ reaction: t.reaction, n: t.n });
    topMap.set(String(t.target_id), list);
  }
  for (const r of rows) {
    const id = String(r.id);
    const isAuthor = viewer && String(r.author_id) === viewer;
    r.my_reaction = myMap.get(id) ?? null;
    r.liked_by_me = myMap.has(id);
    r.top_reactions = (topMap.get(id) ?? []).sort((a, b) => b.n - a.n).slice(0, 3).map((t) => t.reaction);
    r.is_pinned = Boolean(r.pinned_at);
    // Owner chose "hide like count": others see the reactions but not the number.
    if (r.hide_like_count && !isAuthor) r.like_count = null;
  }
}
