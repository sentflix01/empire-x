'use client'
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import client from "@/api/client";
import { useRealMode } from "@/lib/RealModeContext";
import { Search, Users, Radio, User as UserIcon, MessageCircle, Check, CheckCheck, Edit } from "lucide-react";
import moment from "moment";
import NewChatMenu from "@/components/messaging/NewChatMenu";
import { formatLastSeen, isUserOnline } from "@/lib/presence";
import type { PresenceData } from "@/lib/presence";
import { getSocket, connectSocket } from "@/lib/socket";
import { useChatPresence } from "@/lib/useChatPresence";
import ErrorBoundary from '@/components/ErrorBoundary';

type Tab = 'all' | 'dm' | 'groups' | 'channels';

function Messages() {
  const router = useRouter();
  const { realMode } = useRealMode();
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [user, setUser]                   = useState<any>(null);
  const [search, setSearch]               = useState("");
  const [tab, setTab]                     = useState<Tab>('all');
  const [unreadByConv, setUnreadByConv]   = useState<Record<string, number>>({});
  const [presence, setPresence]           = useState<Record<string, PresenceData>>({});
  const [typingConvs, setTypingConvs]     = useState<Record<string, boolean>>({});

  useChatPresence(Boolean(user));

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    auth.me()
      .then(u => { setUser(u); loadConversations(u); loadContacts(u); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    connectSocket();
    const socket = getSocket();

    const onNewMessage = (msg: any) => {
      loadConversations();
      if (msg?.conversation_id) {
        setUnreadByConv(prev => ({
          ...prev,
          [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
        }));
      }
    };
    const onPresenceUpdated = (update: any) => {
      if (!update?.user_id) return;
      setPresence(cur => ({
        ...cur,
        [update.user_id]: { status: update.status, last_seen: update.last_seen || null },
      }));
    };
    const onTyping = (update: any) => {
      if (!update.conversation_id || String(update.user_id) === String(user.id)) return;
      setTypingConvs(cur => ({ ...cur, [update.conversation_id]: Boolean(update.is_typing) }));
    };

    socket.on('new_message', onNewMessage);
    socket.on('presence_updated', onPresenceUpdated);
    socket.on('typing_updated', onTyping);

    const interval = setInterval(() => loadConversations(), 60_000);
    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('presence_updated', onPresenceUpdated);
      socket.off('typing_updated', onTyping);
      clearInterval(interval);
    };
  }, [user]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadConversations = async (currentUser?: any) => {
    const u = currentUser || user;
    if (!u) return;
    setLoading(true);
    try {
      const data = await entities.Conversation.list("-updated_at", 100);
      const mine = data.filter((c: any) => {
        try { return JSON.parse(c.participant_ids || "[]").includes(u.id); } catch { return false; }
      });
      const now = Date.now();
      const cleaned = mine.filter((c: any) => {
        if (c.type === 'dm' && !c.last_message) {
          if (now - new Date(c.created_at).getTime() > 5 * 60 * 1000) return false;
        }
        return true;
      });
      setConversations(cleaned);

      // Unread counts
      client.get('/api/notifications?limit=100').then(r => {
        const notifs = Array.isArray(r.data) ? r.data : [];
        const counts: Record<string, number> = {};
        notifs.forEach((n: any) => {
          if (n.type === 'message' && !n.is_read && n.link) {
            const convId = n.link.split('/messages/')[1];
            if (convId) counts[convId] = (counts[convId] || 0) + 1;
          }
        });
        setUnreadByConv(counts);
      }).catch(() => {});

      // DM presence
      const dmPartnerIds = cleaned
        .filter((c: any) => c.type === 'dm')
        .map((c: any) => {
          try { return JSON.parse(c.participant_ids || '[]').find((id: string) => String(id) !== String(u.id)); }
          catch { return null; }
        }).filter(Boolean);

      if (dmPartnerIds.length > 0) {
        const results = await Promise.all(dmPartnerIds.map((uid: string) =>
          client.get(`/api/messages/presence/${uid}`)
            .then(r => ({ uid, data: { status: r.data.status, last_seen: r.data.last_seen || null } as PresenceData }))
            .catch(() => ({ uid, data: { status: 'offline', last_seen: null } as PresenceData }))
        ));
        const map: Record<string, PresenceData> = {};
        results.forEach(({ uid, data }) => { map[uid] = data; });
        setPresence(map);
      }
    } catch {} finally { setLoading(false); }
  };

  const loadContacts = async (u: any) => {
    try {
      const all = await entities.UserProfile.list("-created_at", 50);
      const visible = all.filter((c: any) => String(c.user_id) !== String(u.id));
      setContacts(visible);
    } catch {}
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDisplayName = (conv: any) => {
    if (conv.type === "group" || conv.type === "channel")
      return conv.name || (conv.type === "channel" ? "Channel" : "Group");
    try {
      const names = JSON.parse(conv.participant_names || '[]');
      const ids   = JSON.parse(conv.participant_ids   || '[]');
      const idx   = ids.findIndex((id: string) => String(id) === String(user?.id));
      return names[idx === 0 ? 1 : 0] || names[0] || "Chat";
    } catch { return "Chat"; }
  };

  const getDmAvatarUrl = (conv: any) => {
    if (conv.avatar_url) return conv.avatar_url;
    if (conv.type !== 'dm') return '';
    try {
      const ids = JSON.parse(conv.participant_ids || '[]');
      const otherId = ids.find((id: string) => String(id) !== String(user?.id));
      if (!otherId) return '';
      const match = contacts.find((c: any) => c.id === otherId || c.user_id === otherId);
      if (!match) return '';
      return Array.isArray(match.avatar_url) ? (match.avatar_url[0] ?? '') : (match.avatar_url ?? '');
    } catch { return ''; }
  };

  const getDmOtherId = (conv: any) => {
    try {
      const ids = JSON.parse(conv.participant_ids || '[]');
      return ids.find((id: string) => String(id) !== String(user?.id)) || null;
    } catch { return null; }
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = moment(ts);
    const now = moment();
    if (d.isSame(now, 'day')) return d.format('HH:mm');
    if (d.isSame(now.clone().subtract(1, 'day'), 'day')) return 'Yesterday';
    if (d.isAfter(now.clone().subtract(7, 'days'))) return d.format('ddd');
    return d.format('DD/MM/YY');
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // "All" tab now shows contacts (people), not conversations
    if (tab === 'all') {
      let list = contacts;
      if (realMode) list = list.filter((c: any) => !c.is_seed);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((c: any) =>
          (c.display_name || '').toLowerCase().includes(q) ||
          (c.headline || '').toLowerCase().includes(q)
        );
      }
      return list; // contacts list, rendered differently below
    }

    let list = conversations;
    if (tab === 'dm')       list = list.filter(c => c.type === 'dm');
    if (tab === 'groups')   list = list.filter(c => c.type === 'group');
    if (tab === 'channels') list = list.filter(c => c.type === 'channel');
    if (realMode) {
      list = list.filter(c => {
        if (c.type !== 'dm') return true;
        try {
          const ids = JSON.parse(c.participant_ids || '[]');
          return !ids.filter((id: string) => id !== user?.id).some((oid: string) => {
            const ct = contacts.find((ct: any) => ct.user_id === oid || ct.id === oid);
            return ct?.is_seed === true;
          });
        } catch { return true; }
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => getDisplayName(c).toLowerCase().includes(q));
    }
    return list;
  }, [conversations, contacts, tab, realMode, search, user]);

  const TABS: { id: Tab; label: string; icon?: any }[] = [
    { id: 'all',      label: 'All' },
    { id: 'dm',       label: 'DMs',      icon: UserIcon },
    { id: 'groups',   label: 'Groups',   icon: Users },
    { id: 'channels', label: 'Channels', icon: Radio },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto flex flex-col h-full -mx-4 md:mx-auto"
      style={{ backgroundColor: 'hsl(var(--background))' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 shrink-0"
        style={{ backgroundColor: 'hsl(var(--background))' }}>

        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Messages
          </h1>
          <NewChatMenu user={user} contacts={contacts} onCreated={() => loadConversations()} />
        </div>

        {/* Search bar */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'hsl(var(--muted-foreground))' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full h-10 pl-10 pr-4 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              }}
            />
          </div>
        </div>

        {/* Tab filter row */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                style={{
                  backgroundColor: active ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                  color: active ? '#fff' : 'hsl(var(--muted-foreground))',
                }}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'hsl(var(--border))' }} />
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          /* Skeleton */
          <div className="px-4 py-2 space-y-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-12 h-12 rounded-full shrink-0 animate-pulse"
                  style={{ backgroundColor: 'hsl(var(--secondary))' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-full w-32 animate-pulse"
                    style={{ backgroundColor: 'hsl(var(--secondary))' }} />
                  <div className="h-3 rounded-full w-48 animate-pulse"
                    style={{ backgroundColor: 'hsl(var(--secondary))' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={tab === 'channels' ? Radio : tab === 'groups' ? Users : tab === 'all' ? UserIcon : MessageCircle}
            title={search ? `No results for "${search}"` : tab === 'channels' ? 'No channels yet' : tab === 'groups' ? 'No groups yet' : tab === 'dm' ? 'No DMs yet' : 'No contacts found'}
            subtitle={!search ? (tab === 'all' ? 'People you follow will appear here' : 'Tap the pencil icon to start a new chat') : undefined}
          />
        ) : tab === 'all' ? (
          /* ── All tab: contacts list ── */
          <div>
            <p className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              People · {filtered.length}
            </p>
            {(filtered as any[]).map((contact: any) => {
              const avatarUrl = Array.isArray(contact.avatar_url) ? contact.avatar_url[0] : contact.avatar_url;
              const name = contact.display_name || 'User';
              return (
                <button
                  key={contact.user_id || contact.id}
                  onClick={async () => {
                    try {
                      const { findOrCreateConversation } = await import('@/lib/messaging');
                      const conv = await findOrCreateConversation(user, contact.user_id, name);
                      if (conv) router.push(`/messages/${conv.id}`);
                    } catch {}
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:scale-[0.99]"
                  style={{ borderBottom: '1px solid hsl(var(--border)/0.4)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'hsl(var(--secondary)/0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)' }}>
                    {avatarUrl
                      ? <Image src={avatarUrl} alt={name} width={52} height={52} className="w-full h-full object-cover" unoptimized />
                      : name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>{name}</p>
                    {contact.headline && (
                      <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{contact.headline}</p>
                    )}
                  </div>
                  <MessageCircle className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
                </button>
              );
            })}
          </div>
        ) : (
          filtered.map(conv => {
            const name        = getDisplayName(conv);
            const isChannel   = conv.type === 'channel';
            const isGroup     = conv.type === 'group';
            const isDm        = conv.type === 'dm';
            const avatarUrl   = getDmAvatarUrl(conv);
            const otherId     = isDm ? getDmOtherId(conv) : null;
            const presenceData = otherId ? presence[otherId] : null;
            const online      = isDm && isUserOnline(presenceData);
            const unread      = unreadByConv[conv.id] || 0;
            const isTyping    = isDm && typingConvs[conv.id];
            const timeStr     = formatTime(conv.last_message_at || conv.updated_at);

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                prefetch
                onPointerEnter={() => router.prefetch(`/messages/${conv.id}`)}
                onClick={() => setUnreadByConv(prev => { const n = { ...prev }; delete n[conv.id]; return n; })}
                className="flex items-center gap-3 px-4 py-3 transition-colors active:scale-[0.99]"
                style={{ borderBottom: '1px solid hsl(var(--border)/0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'hsl(var(--secondary)/0.5)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg"
                    style={{
                      background: isChannel
                        ? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
                        : isGroup
                        ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
                        : 'linear-gradient(135deg,#3b82f6,#7c3aed)',
                    }}
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={name}
                        width={52}
                        height={52}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                        unoptimized
                      />
                    ) : isChannel ? (
                      <Radio className="w-5 h-5" />
                    ) : isGroup ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Online dot */}
                  {online && (
                    <span
                      className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2"
                      style={{
                        backgroundColor: '#22c55e',
                        borderColor: 'hsl(var(--background))',
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: name + time */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p
                      className="text-sm truncate"
                      style={{
                        fontWeight: unread > 0 ? 700 : 600,
                        color: 'hsl(var(--foreground))',
                      }}
                    >
                      {name}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Delivery tick — only for sent messages when no unread */}
                      {isDm && !unread && conv.last_message && (
                        <CheckCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                      )}
                      <span
                        className="text-[11px] whitespace-nowrap"
                        style={{ color: unread > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                      >
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: last message + unread badge */}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-xs truncate flex-1"
                      style={{
                        color: isTyping ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        fontStyle: isTyping ? 'italic' : 'normal',
                        fontWeight: unread > 0 ? 600 : 400,
                      }}
                    >
                      {isTyping
                        ? 'typing…'
                        : conv.last_message || 'No messages yet'}
                    </p>
                    {unread > 0 && (
                      <span
                        className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white px-1.5 shrink-0"
                        style={{ backgroundColor: '#ef4444' }}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg,#3b82f6,#7c3aed)' }}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{title}</p>
      {subtitle && (
        <p className="text-xs mt-1 max-w-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{subtitle}</p>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return <ErrorBoundary><Messages /></ErrorBoundary>;
}
