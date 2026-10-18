'use client';
/**
 * A comment's menu (tap ⋯, long-press or right-click the comment): reactions
 * that are saved, then actions for who you are. Your own comment: edit,
 * delete. Someone else's: reply, copy, report, mute or block them. On your
 * own post you can also restrict a commenter and delete any comment.
 */
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Ban, Copy, Flag, MoreHorizontal, Pencil, Reply, ShieldOff, Trash2, VolumeX } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ReactionPicker from '@/components/feed/ReactionPicker';
import ReportDialog from '@/components/feed/ReportDialog';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { reactToComment, setBlocked, setMuted, setRestricted, type Reaction } from '@/lib/socialApi';

export interface MenuComment { id: string; author_id?: string; author_name?: string; content?: string; my_reaction?: Reaction | null; reaction_count?: number }

const item = 'flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm hover:bg-secondary/70';

export default function CommentMenu({ comment, postId, viewerId, isPostAuthor, isAdmin, open, onOpenChange, onReply, onEdit, onDelete, onReacted, onAuthorHidden }: {
  comment: MenuComment;
  postId: string;
  viewerId?: string;
  isPostAuthor: boolean;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReacted: (r: { my_reaction: Reaction | null; reaction_count: number }) => void;
  /** Muted or blocked the commenter: hide their comments here. */
  onAuthorHidden: (authorId: string) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const mine = Boolean(viewerId && comment.author_id === viewerId);
  const name = comment.author_name || 'this person';
  const close = () => onOpenChange(false);
  const run = (fn: () => Promise<void>) => async () => {
    try { await fn(); } catch (err) { toast.error(apiErrorMessage(err, 'That didn’t work. Try again.')); }
  };
  const pick = (r: Reaction) => run(async () => {
    onReacted(await reactToComment(postId, comment.id, comment.my_reaction === r ? null : r));
    close();
  })();

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={`More options for ${name}'s comment`} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 overflow-hidden rounded-2xl p-0">
          {viewerId && (
            <div className="border-b border-border/60 px-1 py-1.5"><ReactionPicker current={comment.my_reaction ?? null} onPick={pick} size="sm" /></div>
          )}
          <div role="menu" aria-label="Comment actions" className="py-1">
            <button role="menuitem" type="button" className={item} onClick={() => { close(); onReply(); }}><Reply className="h-4 w-4" aria-hidden="true" />Reply</button>
            <button role="menuitem" type="button" className={item} onClick={run(async () => { await navigator.clipboard?.writeText(comment.content ?? ''); toast.success('Copied'); close(); })}>
              <Copy className="h-4 w-4" aria-hidden="true" />Copy text
            </button>
            {mine && <button role="menuitem" type="button" className={item} onClick={() => { close(); onEdit(); }}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>}
            {!mine && viewerId && comment.author_id && (
              <>
                {isPostAuthor && (
                  <button role="menuitem" type="button" className={item} onClick={run(async () => { await setRestricted(comment.author_id!, true); toast.success(`Restricted ${name}. Their new comments on your posts are seen only by them and you.`); close(); })}>
                    <ShieldOff className="h-4 w-4" aria-hidden="true" /><span>Restrict {name}<span className="block text-xs text-muted-foreground">Their comments stay hidden from others</span></span>
                  </button>
                )}
                <button role="menuitem" type="button" className={item} onClick={run(async () => { await setMuted(comment.author_id!, true); toast.success(`Muted ${name}`); close(); onAuthorHidden(comment.author_id!); })}>
                  <VolumeX className="h-4 w-4" aria-hidden="true" />Mute {name}
                </button>
                <button role="menuitem" type="button" className={`${item} text-red-600`} onClick={run(async () => { await setBlocked(comment.author_id!, true); toast.success(`Blocked ${name}`); close(); onAuthorHidden(comment.author_id!); })}>
                  <Ban className="h-4 w-4" aria-hidden="true" />Block {name}
                </button>
                <button role="menuitem" type="button" className={`${item} text-red-600`} onClick={() => { close(); setReportOpen(true); }}>
                  <Flag className="h-4 w-4" aria-hidden="true" />Report comment
                </button>
              </>
            )}
            {(mine || isPostAuthor || isAdmin) && (
              <button role="menuitem" type="button" className={`${item} text-red-600`} onClick={() => { close(); onDelete(); }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />Delete
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="comment" targetId={comment.id} what="comment" />
    </>
  );
}
