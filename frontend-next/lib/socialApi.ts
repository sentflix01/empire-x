/**
 * Calls for people-first interactions: reactions, "who reacted", not
 * interested, owner post settings, mute / restrict / block, report, comment
 * edits and reactions. Rules are enforced by the backend (lib/socialGraph.ts).
 */
import client from '@/api/client';

export const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '👏', '🔥'] as const;
export type Reaction = typeof REACTIONS[number];
export const REACTION_LABEL: Record<Reaction, string> = {
  '❤️': 'Love', '👍': 'Like', '😂': 'Haha', '😮': 'Wow', '😢': 'Sad', '👏': 'Clap', '🔥': 'Fire',
};

export interface ReactionSummary {
  my_reaction: Reaction | null;
  like_count: number | null;
  top_reactions: Reaction[];
  counts?: Partial<Record<Reaction, number>>;
}
export interface Reactor { user_id: string; reaction: Reaction; display_name?: string | null; avatar_url?: string | null }
export interface Relationship { following: boolean; muted: boolean; restricted: boolean; blocked: boolean; blocked_me: boolean }
export type CommentPolicy = 'everyone' | 'followers' | 'off';
export interface PostSettings { pinned?: boolean; comment_policy?: CommentPolicy; hide_like_count?: boolean; notifications_off?: boolean }

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'fake_business', label: 'Fake business or pretending to be someone' },
  { value: 'hate', label: 'Hate or harassment' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence or dangerous acts' },
  { value: 'other', label: 'Something else' },
] as const;

export async function react(postId: string, reaction: Reaction): Promise<ReactionSummary> {
  return (await client.put(`/api/posts/${postId}/reaction`, { reaction })).data;
}
export async function unreact(postId: string): Promise<ReactionSummary> {
  return (await client.delete(`/api/posts/${postId}/reaction`)).data;
}
export async function whoReacted(postId: string, reaction?: Reaction): Promise<ReactionSummary & { people: Reactor[] }> {
  return (await client.get(`/api/posts/${postId}/reactions`, { params: reaction ? { reaction } : {} })).data;
}
export async function hidePost(postId: string): Promise<void> { await client.post(`/api/posts/${postId}/hide`); }
export async function unhidePost(postId: string): Promise<void> { await client.delete(`/api/posts/${postId}/hide`); }
export async function updatePostSettings(postId: string, settings: PostSettings) {
  return (await client.put(`/api/posts/${postId}/settings`, settings)).data as Required<Omit<PostSettings, 'pinned'>> & { is_pinned: boolean };
}
export async function relationship(userId: string): Promise<Relationship> {
  return (await client.get(`/api/social/relationship/${userId}`)).data;
}
export async function setMuted(userId: string, on: boolean): Promise<void> {
  await (on ? client.put(`/api/social/mute/${userId}`) : client.delete(`/api/social/mute/${userId}`));
}
export async function setRestricted(userId: string, on: boolean): Promise<void> {
  await (on ? client.put(`/api/social/restrict/${userId}`) : client.delete(`/api/social/restrict/${userId}`));
}
export async function setBlocked(userId: string, on: boolean): Promise<void> {
  await (on ? client.put(`/api/social/block/${userId}`) : client.delete(`/api/social/block/${userId}`));
}
export async function toggleFollow(userId: string): Promise<boolean> {
  return Boolean((await client.post(`/api/profiles/follow/${userId}`)).data?.following);
}
export async function toggleSave(postId: string): Promise<boolean> {
  return Boolean((await client.post('/api/saves/toggle', { target_id: postId, target_type: 'post' })).data?.saved);
}
export async function report(targetType: 'post' | 'comment' | 'user', targetId: string, reason: string, details?: string): Promise<void> {
  await client.post('/api/moderation/report', { target_type: targetType, target_id: targetId, reason, details: details || undefined });
}
export async function editComment(postId: string, commentId: string, content: string) {
  return (await client.put(`/api/posts/${postId}/comments/${commentId}`, { content })).data;
}
export async function reactToComment(postId: string, commentId: string, reaction: Reaction | null): Promise<{ my_reaction: Reaction | null; reaction_count: number }> {
  return (reaction
    ? await client.put(`/api/posts/${postId}/comments/${commentId}/reaction`, { reaction })
    : await client.delete(`/api/posts/${postId}/comments/${commentId}/reaction`)).data;
}
export function postLink(postId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nodbusiness.vercel.app';
  return `${origin}/feed?post=${postId}`;
}
