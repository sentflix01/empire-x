'use client';
/**
 * The conversation: messages grouped by day, a "New messages" line where your
 * unread part starts, older messages that load when you scroll to the top
 * (keeping your place), a typing indicator and a "Jump to latest" button.
 * New messages scroll into view only when you're already at the bottom.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { parseISO, isToday, isYesterday, format } from 'date-fns';
import { fmtLongDate } from '@/lib/date';
import type { ChatMessage } from '@/lib/chatRules';

export function dayKey(iso: string): string {
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? 'unknown' : format(d, 'yyyy-MM-dd');
}

export function dayLabel(key: string): string {
  const d = parseISO(key);
  if (Number.isNaN(d.getTime())) return '';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return fmtLongDate(d);
}

export default function MessageList({
  messages, loading, hasOlder, loadingOlder, onLoadOlder, firstUnreadId, typing, empty, renderMessage, newFromOthers, scrollSignal = 0, onAtBottom,
}: {
  messages: ChatMessage[];
  loading: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  /** Where the "New messages" line goes (the first unread message when the chat opened). */
  firstUnreadId?: string | null;
  typing: boolean;
  empty: React.ReactNode;
  renderMessage: (msg: ChatMessage, prev: ChatMessage | undefined) => React.ReactNode;
  /** How many messages from others arrived while you were scrolled up. */
  newFromOthers: number;
  /** Changes when you send: always go to the bottom then. */
  scrollSignal?: number;
  /** You reached the latest message (clears the new-messages count). */
  onAtBottom?: () => void;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const atBottom = useRef(true);
  const firstOpen = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const onAtBottomRef = useRef(onAtBottom);
  onAtBottomRef.current = onAtBottom;
  const lastId = messages[messages.length - 1]?.id;
  const firstId = messages[0]?.id;

  const toBottom = useCallback((smooth: boolean) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    atBottom.current = true;
    setShowJump(false);
    onAtBottomRef.current?.();
  }, []);

  // Opening a chat: go to the "New messages" line if there is one, otherwise the bottom.
  useLayoutEffect(() => {
    if (loading || !firstOpen.current || messages.length === 0) return;
    firstOpen.current = false;
    const line = firstUnreadId ? document.getElementById('chat-unread-line') : null;
    if (line && scroller.current) { line.scrollIntoView({ block: 'start' }); return; }
    toBottom(false);
  }, [loading, messages.length, firstUnreadId, toBottom]);

  // Older messages were added on top: keep what you were looking at in place.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !anchor.current) return;
    el.scrollTop = el.scrollHeight - anchor.current.height + anchor.current.top;
    anchor.current = null;
  }, [firstId]);

  // A new message at the bottom: follow it only if you were already there.
  useEffect(() => {
    if (firstOpen.current) return;
    if (atBottom.current) toBottom(true);
    else setShowJump(true);
  }, [lastId, toBottom]);
  useEffect(() => { if (typing && atBottom.current) toBottom(true); }, [typing, toBottom]);
  useEffect(() => { if (scrollSignal) toBottom(true); }, [scrollSignal, toBottom]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowJump(!atBottom.current);
    if (atBottom.current) onAtBottomRef.current?.();
    if (el.scrollTop < 200 && hasOlder && !loadingOlder) {
      anchor.current = { height: el.scrollHeight, top: el.scrollTop };
      onLoadOlder();
    }
  };

  let lastDay = '';
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        data-page-guide="chat-messages"
        onScroll={onScroll}
        role="log"
        aria-label="Messages"
        aria-busy={loading || loadingOlder}
        className="h-full overflow-y-auto overscroll-contain bg-[hsl(var(--chat-bg))] px-2 py-3 sm:px-4"
      >
        {loadingOlder && <p className="py-2 text-center text-xs text-muted-foreground" role="status">Loading earlier messages…</p>}
        {!hasOlder && !loading && messages.length > 0 && (
          <p className="py-2 text-center text-[11px] text-muted-foreground">Start of the conversation</p>
        )}
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-8" role="status" aria-label="Loading messages">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        )}
        {!loading && messages.length === 0 && <div className="flex h-full items-center justify-center">{empty}</div>}

        {messages.map((msg, i) => {
          const day = dayKey(msg.created_at);
          const newDay = day !== lastDay;
          lastDay = day;
          return (
            <React.Fragment key={msg.id}>
              {newDay && (
                <div className="sticky top-0 z-[1] flex justify-center py-2">
                  <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">{dayLabel(day)}</span>
                </div>
              )}
              {firstUnreadId === msg.id && (
                <div id="chat-unread-line" className="my-2 flex items-center gap-2" role="separator" aria-label="New messages">
                  <span className="h-px flex-1 bg-primary/40" />
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">New messages</span>
                  <span className="h-px flex-1 bg-primary/40" />
                </div>
              )}
              {renderMessage(msg, messages[i - 1])}
            </React.Fragment>
          );
        })}

        {typing && (
          <div className="flex justify-start py-px">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-card px-3 py-2">
              {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d}ms` }} />)}
              <span className="sr-only">typing…</span>
            </div>
          </div>
        )}
      </div>

      {showJump && (
        <button type="button" onClick={() => toBottom(true)} aria-label={newFromOthers > 0 ? `Jump to latest, ${newFromOthers} new` : 'Jump to latest'}
          className="absolute bottom-3 end-3 z-10 flex size-11 items-center justify-center rounded-full border border-border bg-card shadow-lg">
          <ChevronDown className="h-5 w-5" aria-hidden="true" />
          {newFromOthers > 0 && (
            <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {newFromOthers > 99 ? '99+' : newFromOthers}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
