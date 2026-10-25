'use client';
/**
 * The chat list. Opens on Chats; Business (customers writing to your
 * businesses), Requests (first messages from people you don't follow),
 * Groups and Archived are tabs. Live: new messages, typing, ticks and unread
 * counts update without a refresh. Long-press or right-click a chat to mute,
 * archive or delete it for you.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Users, Radio, MessageCircle, Store, PenSquare, BellOff, Archive, Inbox as InboxIcon } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { getSocket, connectSocket } from '@/lib/socket';
import { useChatPresence } from '@/lib/useChatPresence';
import { isUserOnline, type PresenceData } from '@/lib/presence';
import { tickFor } from '@/lib/readReceipts';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { chatTitle, chatAvatar, chatOtherUserId, inboxTime, uniqueChats, uniquePeople, type ChatSummary } from '@/lib/chatDisplay';
import { cn } from '@/lib/utils';
import MessageTicks from '@/components/messaging/MessageTicks';
import MessageSearch from '@/components/messaging/MessageSearch';
import NewChatMenu from '@/components/messaging/NewChatMenu';
import NewMessageDialog from '@/components/messaging/NewMessageDialog';
import ChoiceDialog from '@/components/messaging/ChoiceDialog';

type Box = 'chats' | 'business' | 'requests' | 'archived';
type Tab = Box | 'groups';

type Row = ChatSummary & {
  last_message?: string;
  last_message_at?: string;
  last_message_id?: string | null;
  last_message_sender_id?: string | null;
  other_last_read_at?: string | null;
  other_last_delivered_at?: string | null;
  unread_count?: number | string;
  muted?: boolean;
  archived_at?: string | null;
  is_request?: boolean;
};

export default function Inbox({ selectedId }: { selectedId?: string | null }) {
  const { user } = useAuth();
  const me = user?.id ? String(user.id) : null;
  const [boxes, setBoxes] = useState<Partial<Record<Box, Row[]>>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('chats');
  const [q, setQ] = useState('');
  const [presence, setPresence] = useState<Record<string, PresenceData>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ user_id: string; display_name?: string; avatar_url?: string | string[] }>>([]);
  const [rowMenu, setRowMenu] = useState<Row | null>(null);
  const presenceLoaded = useRef(new Set<string>());

  useChatPresence(Boolean(user));

  const load = useCallback(async (which: Box[], quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const results = await Promise.all(which.map((box) => client.get('/api/messages/conversations', { params: { box } })
        .then(({ data }) => [box, Array.isArray(data) ? data : []] as const)
        .catch(() => [box, null] as const)));
      setBoxes((prev) => {
        const next = { ...prev };
        for (const [box, rows] of results) if (rows) next[box] = uniqueChats((rows as Row[]).filter((c) => c.type !== 'dm' || c.last_message_id || box === 'requests'));
        return next;
      });
    } finally { if (!quiet) setLoading(false); }
  }, []);

  const loadAll = useCallback((quiet = false) => load(tab === 'archived' ? ['chats', 'business', 'requests', 'archived'] : ['chats', 'business', 'requests'], quiet), [load, tab]);

  useEffect(() => { if (user) void loadAll(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'archived' && !boxes.archived) void load(['archived']); }, [tab, boxes.archived, load]);
  useEffect(() => {
    if (!user) return;
    entities.UserProfile.list('-created_at', 40).then((rows: Array<{ user_id: string }>) => setSuggestions(uniquePeople(rows).slice(0, 20))).catch(() => undefined);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live: the server sends list events to each person's own room.
  useEffect(() => {
    if (!user) return;
    connectSocket();
    const socket = getSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => void loadAll(true), 250); };
    const onPresence = (u: { user_id?: string; status: PresenceData['status']; last_seen?: string }) => {
      if (u?.user_id) setPresence((cur) => ({ ...cur, [String(u.user_id)]: { status: u.status, last_seen: u.last_seen || null } }));
    };
    const onTyping = (u: { conversation_id?: string; user_id?: string; is_typing?: boolean }) => {
      if (u?.conversation_id && String(u.user_id) !== String(me)) setTyping((cur) => ({ ...cur, [String(u.conversation_id)]: Boolean(u.is_typing) }));
    };
    const events: Array<[string, (...a: never[]) => void]> = [
      ['conversation_updated', refresh], ['unread_changed', refresh], ['conversation_read', refresh], ['conversation_delivered', refresh],
      ['presence_updated', onPresence], ['typing_updated', onTyping],
    ];
    for (const [n, f] of events) socket.on(n, f as (...a: unknown[]) => void);
    const poll = setInterval(() => void loadAll(true), 60_000);
    return () => { for (const [n, f] of events) socket.off(n, f as (...a: unknown[]) => void); if (timer) clearTimeout(timer); clearInterval(poll); };
  }, [user, me, loadAll]);

  // Presence for the people in your chats, once each; live updates keep it current.
  useEffect(() => {
    const ids = [...new Set(Object.values(boxes).flat().map((c) => chatOtherUserId(c as Row, me)).filter((x): x is string => Boolean(x)))]
      .filter((uid) => !presenceLoaded.current.has(uid)).slice(0, 30);
    ids.forEach((uid) => {
      presenceLoaded.current.add(uid);
      client.get(`/api/messages/presence/${uid}`)
        .then((r) => setPresence((cur) => ({ ...cur, [uid]: { status: r.data.status, last_seen: r.data.last_seen || null } })))
        .catch(() => undefined);
    });
  }, [boxes, me]);

  const counts = {
    business: (boxes.business ?? []).reduce((n, c) => n + (Number(c.unread_count) || 0), 0),
    requests: (boxes.requests ?? []).length,
  };
  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType; badge?: number; show: boolean }> = [
    { id: 'chats', label: 'Chats', icon: MessageCircle, show: true },
    { id: 'business', label: 'Business', icon: Store, badge: counts.business, show: (boxes.business ?? []).length > 0 || tab === 'business' },
    { id: 'requests', label: 'Requests', icon: InboxIcon, badge: counts.requests, show: counts.requests > 0 || tab === 'requests' },
    { id: 'groups', label: 'Groups', icon: Users, show: true },
    { id: 'archived', label: 'Archived', icon: Archive, show: true },
  ];

  const rows = useMemo(() => {
    const source = tab === 'groups' ? (boxes.chats ?? []).filter((c) => c.type === 'group' || c.type === 'channel') : (boxes[tab] ?? []);
    const query = q.trim().toLowerCase();
    return query ? source.filter((c) => chatTitle(c, me).toLowerCase().includes(query) || String(c.last_message ?? '').toLowerCase().includes(query)) : source;
  }, [boxes, tab, q, me]);

  const act = async (row: Row, action: string) => {
    setRowMenu(null);
    try {
      if (action === 'mute') await client.put(`/api/messages/conversations/${row.id}/mute`, { duration: 'always' });
      if (action === 'unmute') await client.put(`/api/messages/conversations/${row.id}/mute`, { duration: 'off' });
      if (action === 'archive') await client.put(`/api/messages/conversations/${row.id}/archive`, { archived: true });
      if (action === 'unarchive') await client.put(`/api/messages/conversations/${row.id}/archive`, { archived: false });
      if (action === 'delete') await client.delete(`/api/messages/conversations/${row.id}/for-me`);
      if (action === 'accept') await client.post(`/api/messages/conversations/${row.id}/accept`);
      await load(['chats', 'business', 'requests', ...(boxes.archived ? ['archived' as const] : [])], true);
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not update the chat')); }
  };

  const empty: Record<Tab, { title: string; text: string }> = {
    chats: { title: 'No chats yet', text: 'Tap New message to write to someone.' },
    business: { title: 'No customer messages', text: 'When customers message your business, they appear here.' },
    requests: { title: 'No message requests', text: 'First messages from people you don’t follow wait here.' },
    groups: { title: 'No groups or channels', text: 'Create one from the menu at the top.' },
    archived: { title: 'Nothing archived', text: 'Archived chats come back when a new message arrives, unless they’re muted.' },
  };

  return (
    <div data-page-guide="messages-header" className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 bg-background">
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
          <h1 className="text-xl font-bold">Messages</h1>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setShowSearch(true)} aria-label="Search in all messages"
              className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setShowNew(true)} aria-label="New message" data-page-guide="messages-new"
              className="inline-flex size-11 items-center justify-center rounded-full text-primary hover:bg-secondary">
              <PenSquare className="h-5 w-5" aria-hidden="true" />
            </button>
            <NewChatMenu user={user} contacts={suggestions} onCreated={() => void loadAll(true)} />
          </div>
        </div>
        <div data-page-guide="messages-search" className="px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" aria-label="Search chats"
              className="h-10 w-full rounded-xl border border-border bg-secondary ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div role="tablist" aria-label="Chat lists" className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {tabs.filter((t) => t.show).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.id)}
                className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />{t.label}
                {Boolean(t.badge) && (
                  <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold', active ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground')}>
                    {t.badge! > 99 ? '99+' : t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="h-px bg-border" />
      </div>

      <ul data-page-guide="messages-list" className="min-h-0 flex-1 overflow-y-auto pb-2" aria-busy={loading}>
        {loading && rows.length === 0 && Array.from({ length: 7 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-secondary" />
            <div className="flex-1 space-y-2"><div className="h-3.5 w-32 animate-pulse rounded-full bg-secondary" /><div className="h-3 w-48 animate-pulse rounded-full bg-secondary" /></div>
          </li>
        ))}
        {!loading && rows.length === 0 && (
          <li className="flex flex-col items-center px-6 py-20 text-center">
            <p className="text-sm font-semibold">{q ? `No chats match “${q}”` : empty[tab].title}</p>
            {!q && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{empty[tab].text}</p>}
            {!q && tab === 'chats' && (
              <button type="button" onClick={() => setShowNew(true)} className="mt-4 h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">New message</button>
            )}
          </li>
        )}
        {rows.map((c) => (
          <ChatRow key={c.id} c={c} me={me} selected={selectedId === c.id} typing={Boolean(typing[c.id])}
            online={isUserOnline(presence[chatOtherUserId(c, me) ?? ''] ?? null)}
            onMenu={() => setRowMenu(c)} />
        ))}
      </ul>

      {rowMenu && (
        <ChoiceDialog
          title={chatTitle(rowMenu, me)}
          onClose={() => setRowMenu(null)}
          onChoose={(v) => void act(rowMenu, v)}
          choices={[
            ...(rowMenu.is_request ? [{ label: 'Accept', value: 'accept' }] : []),
            rowMenu.muted ? { label: 'Unmute notifications', value: 'unmute' } : { label: 'Mute notifications', value: 'mute' },
            ...(!rowMenu.is_request ? [rowMenu.archived_at ? { label: 'Unarchive', value: 'unarchive' } : { label: 'Archive', value: 'archive' }] : []),
            { label: rowMenu.is_request ? 'Delete request' : 'Delete chat for me', value: 'delete', destructive: true },
          ]}
        />
      )}
      {showNew && <NewMessageDialog suggestions={suggestions} me={me} onClose={() => setShowNew(false)} />}
      {showSearch && <MessageSearch conversationId={undefined} onClose={() => setShowSearch(false)} />}
    </div>
  );
}

function ChatRow({ c, me, selected, typing, online, onMenu }: {
  c: Row; me: string | null; selected: boolean; typing: boolean; online: boolean; onMenu: () => void;
}) {
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const cancel = () => { if (press.current) clearTimeout(press.current); press.current = null; };
  const title = chatTitle(c, me);
  const unread = Number(c.unread_count) || 0;
  const isDm = c.type === 'dm';
  const mineLast = Boolean(c.last_message_id) && String(c.last_message_sender_id) === String(me);
  const preview = typing ? 'typing…' : c.last_message || (c.is_request ? 'Message request' : 'No messages yet');

  return (
    <li>
      <Link
        href={`/messages/${c.id}`}
        aria-current={selected ? 'page' : undefined}
        onContextMenu={(e) => { e.preventDefault(); onMenu(); }}
        onTouchStart={() => { longPressed.current = false; cancel(); press.current = setTimeout(() => { longPressed.current = true; navigator.vibrate?.(30); onMenu(); }, 450); }}
        onTouchEnd={cancel}
        onTouchMove={cancel}
        onClick={(e) => { if (longPressed.current) { e.preventDefault(); longPressed.current = false; } }}
        className={cn('flex min-h-[72px] items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-secondary/50 active:bg-secondary/80',
          selected && 'bg-primary/10 hover:bg-primary/10')}
      >
        {isDm ? (
          <span className="relative h-12 w-12 shrink-0" aria-hidden="true">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-base font-bold text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {chatAvatar(c) ? <img src={chatAvatar(c)!} alt="" className="h-full w-full object-cover" /> : title.charAt(0).toUpperCase()}
            </span>
            {online && !(c.business_id && !c.is_business_side) && (
              <span className="absolute bottom-0 end-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
            )}
          </span>
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-white"
            style={{ background: c.type === 'channel' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {chatAvatar(c) ? <img src={chatAvatar(c)!} alt="" className="h-full w-full object-cover" /> : c.type === 'channel' ? <Radio className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={cn('flex min-w-0 items-center gap-1.5 truncate text-sm', unread ? 'font-bold' : 'font-semibold')}>
              <span className="truncate">{title}</span>
              {c.is_business_side && c.business_name && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  <Store className="h-2.5 w-2.5" aria-hidden="true" />{c.business_name}
                </span>
              )}
              {c.muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Muted" />}
            </span>
            <span className={cn('shrink-0 text-[11px]', unread ? 'font-semibold text-primary' : 'text-muted-foreground')}>{inboxTime(c.last_message_at)}</span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={cn('flex min-w-0 items-center gap-1 truncate text-xs', typing ? 'italic text-primary' : 'text-muted-foreground', unread && !typing && 'font-semibold text-foreground')}>
              {mineLast && isDm && !typing && (
                <MessageTicks tick={tickFor({ created_at: String(c.last_message_at) }, me ?? undefined, [{
                  user_id: String(c.other_user_id), last_read_at: c.other_last_read_at, last_delivered_at: c.other_last_delivered_at,
                }])} />
              )}
              <span className="truncate">{preview}</span>
            </span>
            {unread > 0 && (
              <span className={cn('flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold', c.muted ? 'bg-muted-foreground/40 text-background' : 'bg-primary text-primary-foreground')}
                aria-label={`${unread} unread`}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
