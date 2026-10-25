'use client';
/**
 * What you can do with one message: react, Reply, Copy, Forward, Pin, Edit,
 * Delete (for me / for everyone) and Report. A sheet from the bottom on
 * phones, a centred panel on larger screens. Escape or the backdrop closes it
 * and focus goes back to the message.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CornerUpLeft, Copy, Forward, Pin, PinOff, Pencil, Trash2, Flag, ChevronLeft } from 'lucide-react';
import ReactionPicker from '@/components/feed/ReactionPicker';
import { cn } from '@/lib/utils';
import { messageActions, messagePreview, type ChatMessage } from '@/lib/chatRules';

export interface MessageActionHandlers {
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: (scope: 'me' | 'everyone') => void;
  onReport: () => void;
  onClose: () => void;
}

export default function MessageActions({ message, me, pinned, reducedMotion = false, ...h }: MessageActionHandlers & {
  message: ChatMessage | null;
  me?: string | null;
  pinned: boolean;
  reducedMotion?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panel = useRef<HTMLDivElement | null>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!message) return;
    setConfirmDelete(false);
    opener.current = document.activeElement;
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('button')?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); h.onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id]);

  const can = message ? messageActions(message, me) : null;
  const mine = Boolean(message && me && String(message.sender_id) === String(me));

  return (
    <AnimatePresence>
      {message && can && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.15 }}
            onClick={h.onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Message actions"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[61] mx-auto max-w-lg md:inset-0 md:flex md:items-center md:justify-center md:px-4"
            initial={reducedMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="pointer-events-auto max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-card text-foreground shadow-2xl md:max-w-lg md:rounded-3xl">
              <p className={cn('mx-4 mt-4 mb-1 line-clamp-2 rounded-2xl px-4 py-3 text-sm', mine ? 'bg-primary/15' : 'bg-secondary')}>
                {messagePreview(message)}
              </p>

              {confirmDelete ? (
                <div className="py-1">
                  <Item icon={<ChevronLeft className="h-5 w-5" />} label="Back" onClick={() => setConfirmDelete(false)} />
                  <p className="px-5 pb-1 pt-2 text-xs text-muted-foreground">Delete this message?</p>
                  {can.deleteForEveryone && (
                    <Item icon={<Trash2 className="h-5 w-5" />} label="Delete for everyone" destructive onClick={() => h.onDelete('everyone')} />
                  )}
                  <Item icon={<Trash2 className="h-5 w-5" />} label="Delete for me" destructive onClick={() => h.onDelete('me')} />
                </div>
              ) : (
                <>
                  {can.react && (
                    <div className="border-b border-border/20 px-3 py-3">
                      <ReactionPicker onPick={h.onReact} />
                    </div>
                  )}
                  <div className="py-1">
                    {can.reply && <Item icon={<CornerUpLeft className="h-5 w-5" />} label="Reply" onClick={h.onReply} />}
                    {can.copy && <Item icon={<Copy className="h-5 w-5" />} label="Copy" onClick={h.onCopy} />}
                    {can.forward && <Item icon={<Forward className="h-5 w-5" />} label="Forward" onClick={h.onForward} />}
                    {can.pin && <Item icon={pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />} label={pinned ? 'Unpin' : 'Pin'} onClick={h.onPin} />}
                    {can.edit && <Item icon={<Pencil className="h-5 w-5" />} label="Edit" onClick={h.onEdit} />}
                    {can.deleteForMe && <Item icon={<Trash2 className="h-5 w-5" />} label="Delete" destructive onClick={() => setConfirmDelete(true)} />}
                    {can.report && <Item icon={<Flag className="h-5 w-5" />} label="Report" destructive onClick={h.onReport} />}
                  </div>
                </>
              )}
              <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Item({ icon, label, onClick, destructive = false }: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex min-h-12 w-full items-center gap-4 px-5 text-left text-sm font-medium hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none', destructive && 'text-destructive')}>
      <span className={destructive ? 'text-destructive' : 'text-muted-foreground'} aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
