'use client';
/** Pick a chat to forward a message to. */
import React, { useEffect, useRef, useState } from 'react';
import { Forward, X, Users, Radio } from 'lucide-react';
import client from '@/api/client';
import { chatTitle, chatAvatar, type ChatSummary } from '@/lib/chatDisplay';
import { messagePreview, type ChatMessage } from '@/lib/chatRules';

export default function ForwardDialog({ message, currentChatId, me, onForward, onClose }: {
  message: ChatMessage;
  currentChatId: string;
  me?: string | null;
  onForward: (targetId: string) => void;
  onClose: () => void;
}) {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [q, setQ] = useState('');
  const search = useRef<HTMLInputElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    let cancelled = false;
    client.get('/api/messages/conversations?box=chats')
      .then(({ data }) => { if (!cancelled) setChats(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setChats([]); });
    search.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    return () => { cancelled = true; document.removeEventListener('keydown', onKey); };
  }, []);

  const shown = (chats ?? [])
    .filter((c) => c.id !== currentChatId)
    .filter((c) => !q || chatTitle(c, me).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[65] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Forward message" onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-card shadow-xl sm:h-auto sm:max-h-[85dvh] sm:max-w-sm sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/30 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><Forward className="h-4 w-4 text-primary" aria-hidden="true" />Forward to…</p>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mx-4 mt-3 line-clamp-2 rounded-xl bg-secondary/50 px-3 py-2 text-sm">{messagePreview(message)}</p>
        <div className="px-4 pt-3">
          <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" aria-label="Search chats"
            className="h-10 w-full rounded-full bg-secondary/60 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {chats === null && <li className="py-6 text-center text-sm text-muted-foreground" role="status">Loading chats…</li>}
          {chats !== null && shown.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No other chats</li>}
          {shown.map((c) => {
            const title = chatTitle(c, me);
            const avatar = chatAvatar(c);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => onForward(c.id)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-secondary">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" />
                      : c.type === 'channel' ? <Radio className="h-4 w-4" aria-hidden="true" />
                      : c.type === 'group' ? <Users className="h-4 w-4" aria-hidden="true" />
                      : title.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
