'use client';
/**
 * The post's "More" button (bottom-right of the action bar). It opens a
 * reaction row and the actions that fit who you are:
 *   - your own post: edit, pin, who can comment, hide like count,
 *     notifications, copy link, share, delete;
 *   - someone else's: reply, save, copy link, share, save photo, follow,
 *     not interested, mute, block, report.
 */
import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Ban, Bell, BellOff, Bookmark, Copy, Download, EyeOff, Flag, MessageCircle, MoreHorizontal, Pencil, Pin, PinOff,
  Share2, Trash2, UserMinus, UserPlus, VolumeX, MessageSquareOff, Users,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ReactionPicker from '@/components/feed/ReactionPicker';
import ReportDialog from '@/components/feed/ReportDialog';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import {
  hidePost, postLink, relationship, setBlocked, setMuted, toggleFollow, toggleSave, updatePostSettings,
  type CommentPolicy, type Reaction, type Relationship,
} from '@/lib/socialApi';

export interface MenuPost {
  id: string;
  author_id: string;
  author_name?: string | null;
  content?: string | null;
  image_url?: string | null;
  comment_policy?: CommentPolicy | null;
  hide_like_count?: boolean | null;
  notifications_off?: boolean | null;
  is_pinned?: boolean | null;
}

const item = 'flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm hover:bg-secondary/70 disabled:opacity-50';
const POLICY_LABEL: Record<CommentPolicy, string> = { everyone: 'Everyone', followers: 'Followers', off: 'No one (comments off)' };

export default function PostMoreMenu({ post, isAuthor, isAdmin, signedIn, myReaction, onReact, onReply, onEdit, onDelete, onHidden, onRemoved, onSettings }: {
  post: MenuPost;
  isAuthor: boolean;
  isAdmin: boolean;
  signedIn: boolean;
  myReaction: Reaction | null;
  onReact: (r: Reaction) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** "Not interested": the card shows a hidden note with Undo. */
  onHidden: () => void;
  /** Muted or blocked: the card leaves the feed. */
  onRemoved: (why: 'muted' | 'blocked') => void;
  onSettings: (changes: Partial<MenuPost>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rel, setRel] = useState<Relationship | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const name = post.author_name || 'this person';

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) { setConfirmBlock(false); setShowPolicy(false); return; }
    if (signedIn && !isAuthor && !rel) relationship(post.author_id).then(setRel).catch(() => undefined);
  };
  const close = () => onOpenChange(false);
  const run = (fn: () => Promise<void> | void) => async () => {
    try { await fn(); } catch (err) { toast.error(apiErrorMessage(err, 'That didn’t work. Try again.')); }
  };

  const copyLink = run(async () => { await navigator.clipboard?.writeText(postLink(post.id)); toast.success('Link copied'); close(); });
  const share = run(async () => {
    const url = postLink(post.id);
    if (navigator.share) await navigator.share({ title: `${post.author_name ?? 'NodBusiness'} on NodBusiness`, text: (post.content ?? '').slice(0, 100), url }).catch(() => undefined);
    else { await navigator.clipboard?.writeText(url); toast.success('Link copied'); }
    close();
  });
  const setting = (changes: Parameters<typeof updatePostSettings>[1], done: string) => run(async () => {
    const saved = await updatePostSettings(post.id, changes);
    onSettings({ comment_policy: saved.comment_policy, hide_like_count: saved.hide_like_count, notifications_off: saved.notifications_off, is_pinned: saved.is_pinned });
    toast.success(done);
  });

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="More options for this post"
            className="post-action-btn ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0">
          {signedIn && (
            <div className="border-b border-border/60 px-2 py-2">
              <ReactionPicker current={myReaction} onPick={(r) => { onReact(r); close(); }} size="sm" />
            </div>
          )}
          <div role="menu" aria-label="Post actions" className="max-h-[60dvh] overflow-y-auto py-1">
            {isAuthor ? (
              <>
                {onEdit && <button role="menuitem" type="button" className={item} onClick={() => { close(); onEdit(); }}><Pencil className="h-4 w-4" aria-hidden="true" />Edit post</button>}
                <button role="menuitem" type="button" className={item} onClick={setting({ pinned: !post.is_pinned }, post.is_pinned ? 'Unpinned from your profile' : 'Pinned to the top of your profile')}>
                  {post.is_pinned ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}
                  {post.is_pinned ? 'Unpin from profile' : 'Pin to profile'}
                </button>
                <button role="menuitem" type="button" className={item} aria-expanded={showPolicy} onClick={() => setShowPolicy((v) => !v)}>
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span className="flex-1">Who can comment</span>
                  <span className="text-xs text-muted-foreground">{POLICY_LABEL[post.comment_policy || 'everyone']}</span>
                </button>
                {showPolicy && (
                  <div role="radiogroup" aria-label="Who can comment" className="space-y-0.5 bg-secondary/30 px-4 py-1">
                    {(['everyone', 'followers', 'off'] as CommentPolicy[]).map((p) => (
                      <button key={p} type="button" role="radio" aria-checked={(post.comment_policy || 'everyone') === p}
                        onClick={setting({ comment_policy: p }, p === 'off' ? 'Comments turned off' : `Now ${POLICY_LABEL[p].toLowerCase()} can comment`)}
                        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-sm hover:bg-secondary">
                        <span aria-hidden="true" className={`h-3 w-3 rounded-full border ${(post.comment_policy || 'everyone') === p ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                        {POLICY_LABEL[p]}
                      </button>
                    ))}
                  </div>
                )}
                <button role="menuitemcheckbox" aria-checked={Boolean(post.hide_like_count)} type="button" className={item}
                  onClick={setting({ hide_like_count: !post.hide_like_count }, post.hide_like_count ? 'Others can see the count again' : 'Only you see the reaction count')}>
                  <EyeOff className="h-4 w-4" aria-hidden="true" />{post.hide_like_count ? 'Show reaction count' : 'Hide reaction count'}
                </button>
                <button role="menuitemcheckbox" aria-checked={Boolean(post.notifications_off)} type="button" className={item}
                  onClick={setting({ notifications_off: !post.notifications_off }, post.notifications_off ? 'Notifications on for this post' : 'Notifications off for this post')}>
                  {post.notifications_off ? <Bell className="h-4 w-4" aria-hidden="true" /> : <BellOff className="h-4 w-4" aria-hidden="true" />}
                  {post.notifications_off ? 'Turn on notifications' : 'Turn off notifications'}
                </button>
              </>
            ) : (
              <>
                <button role="menuitem" type="button" className={item} onClick={() => { close(); onReply(); }}><MessageCircle className="h-4 w-4" aria-hidden="true" />Reply in comments</button>
                {signedIn && (
                  <button role="menuitem" type="button" className={item} onClick={run(async () => { const saved = await toggleSave(post.id); toast.success(saved ? 'Saved to your bookmarks' : 'Removed from bookmarks'); close(); })}>
                    <Bookmark className="h-4 w-4" aria-hidden="true" />Save or unsave post
                  </button>
                )}
              </>
            )}
            <button role="menuitem" type="button" className={item} onClick={copyLink}><Copy className="h-4 w-4" aria-hidden="true" />Copy link</button>
            <button role="menuitem" type="button" className={item} onClick={share}><Share2 className="h-4 w-4" aria-hidden="true" />Share</button>
            {post.image_url && (
              <a role="menuitem" href={post.image_url} download target="_blank" rel="noopener noreferrer" className={item} onClick={close}>
                <Download className="h-4 w-4" aria-hidden="true" />Save photo
              </a>
            )}

            {!isAuthor && signedIn && (
              <div className="mt-1 border-t border-border/60 pt-1">
                {rel && !rel.blocked && (
                  <button role="menuitem" type="button" className={item} onClick={run(async () => {
                    const following = await toggleFollow(post.author_id);
                    setRel({ ...rel, following });
                    toast.success(following ? `Following ${name}` : `Unfollowed ${name}`);
                  })}>
                    {rel.following ? <UserMinus className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
                    {rel.following ? `Unfollow ${name}` : `Follow ${name}`}
                  </button>
                )}
                <button role="menuitem" type="button" className={item} onClick={run(async () => { await hidePost(post.id); close(); onHidden(); })}>
                  <EyeOff className="h-4 w-4" aria-hidden="true" /><span>Not interested<span className="block text-xs text-muted-foreground">Show fewer posts like this</span></span>
                </button>
                <button role="menuitem" type="button" className={item} onClick={run(async () => { await setMuted(post.author_id, true); close(); onRemoved('muted'); })}>
                  <VolumeX className="h-4 w-4" aria-hidden="true" /><span>Mute {name}<span className="block text-xs text-muted-foreground">Hide their posts. They won’t know.</span></span>
                </button>
                {confirmBlock ? (
                  <div className="mx-3 my-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-500/30 dark:bg-red-500/10">
                    <p className="font-medium text-red-900 dark:text-red-100">Block {name}? You won’t see each other’s posts, comments or messages, and you’ll stop following each other.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={run(async () => { await setBlocked(post.author_id, true); close(); onRemoved('blocked'); })}
                        className="min-h-10 flex-1 rounded-full bg-red-600 px-3 font-semibold text-white">Block</button>
                      <button type="button" onClick={() => setConfirmBlock(false)} className="min-h-10 flex-1 rounded-full border border-border bg-background px-3">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button role="menuitem" type="button" className={`${item} text-red-600`} onClick={() => setConfirmBlock(true)}>
                    <Ban className="h-4 w-4" aria-hidden="true" />Block {name}
                  </button>
                )}
                <button role="menuitem" type="button" className={`${item} text-red-600`} onClick={() => { close(); setReportOpen(true); }}>
                  <Flag className="h-4 w-4" aria-hidden="true" />Report post
                </button>
              </div>
            )}
            {(isAuthor || isAdmin) && onDelete && (
              <div className="mt-1 border-t border-border/60 pt-1">
                <button role="menuitem" type="button" className={`${item} text-red-600`} onClick={() => { close(); onDelete(); }}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />Delete post
                </button>
              </div>
            )}
            {isAuthor && post.comment_policy === 'off' && (
              <p className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"><MessageSquareOff className="h-3.5 w-3.5" aria-hidden="true" />Comments are off for this post.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="post" targetId={post.id} what="post" />
    </>
  );
}
