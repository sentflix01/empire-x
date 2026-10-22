'use client'
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from 'framer-motion';
import { entities } from "@/api/entities";
import client from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useRealMode } from "@/lib/RealModeContext";
import { Search, Users, Radio, User as UserIcon, MessageCircle, ArrowUpDown } from "lucide-react";
import MessageTicks from "@/components/messaging/MessageTicks";
import { tickFor } from "@/lib/readReceipts";
import { fmtTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { parseISO, isToday, isYesterday, isAfter, subDays, format as dfFormat } from "date-fns";
import NewChatMenu from "@/components/messaging/NewChatMenu";
import MessageSearch from "@/components/messaging/MessageSearch";
import { isUserOnline } from "@/lib/presence";
import type { PresenceData } from "@/lib/presence";
import { getSocket, connectSocket } from "@/lib/socket";
import { useChatPresence } from "@/lib/useChatPresence";
import ErrorBoundary from '@/components/ErrorBoundary';
import UserIdentity from "@/components/ui/UserIdentity";

type Tab = 'all' | 'dm' | 'groups' | 'channels';

function Messages() {
  const router = useRouter();
  const { realMode } = useRealMode();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [tab, setTab]                     = useState<Tab>('all');
  const [unreadByConv, setUnreadByConv]   = useState<Record<string, number>>({});
  const [presence, setPresence]           = useState<Record<string, PresenceData>>({});
  const [typingConvs, setTypingConvs]     = useState<Record<string, boolean>>({});
  const [showSearch, setShowSearch]       = useState(false);
  // Sort contacts: 'time' = online-first then last_seen (default), 'name' = A-Z
  const [contactSort, setContactSort]     = useState<'name' | 'time'>('time');
  const loadConversationsRef = useRef<((currentUser?: any, quiet?: boolean) => Promise<void>) | null>(null);

  useChatPresence(Boolean(user));

  // ── Init — load data once user is resolved ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadConversations(user);
    loadContacts(user);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    connectSocket();
    const socket = getSocket();

    // Chat list events reach every member's own room, so the list is live
    // without joining every chat (new message, read, delivered, muted...).
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const onNewMessage = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { void loadConversationsRef.current?.(undefined, true); }, 250);
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

    socket.on('conversation_updated', onNewMessage);
    socket.on('unread_changed', onNewMessage);
    socket.on('conversation_read', onNewMessage);
    socket.on('conversation_delivered', onNewMessage);
    socket.on('presence_updated', onPresenceUpdated);
    socket.on('typing_updated', onTyping);

    const interval = setInterval(() => { void loadConversationsRef.current?.(); }, 60_000);
    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      socket.off('conversation_updated', onNewMessage);
      socket.off('unread_changed', onNewMessage);
      socket.off('conversation_read', onNewMessage);
      socket.off('conversation_delivered', onNewMessage);
      socket.off('presence_updated', onPresenceUpdated);
      socket.off('typing_updated', onTyping);
      clearInterval(interval);
    };
  }, [user]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadConversations = async (currentUser?: any, quiet = false) => {
    const u = currentUser || user;
    if (!u) return;
    if (!quiet) setLoading(true);
    try {
      // ?box=chats only returns accepted, non-archived chats — no empty requests or ghost DMs.
      const { data } = await client.get('/api/messages/conversations?box=chats');
      // Extra client-side guard: drop DMs with no messages (empty find-or-create shells).
      const cleaned = (Array.isArray(data) ? data : []).filter((c: any) => c.type !== 'dm' || c.last_message_id);
      setConversations(cleaned);
      setUnreadByConv(Object.fromEntries(cleaned.map((c: any) => [c.id, Number(c.unread_count) || 0])));

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
    } catch {} finally { if (!quiet) setLoading(false); }
  };
  loadConversationsRef.current = loadConversations;

  const loadContacts = async (u: any) => {
    try {
      // followers/following only — people the current user actually knows
      const all = await entities.UserProfile.list("-created_at", 50);
      const visible = all.filter((c: any) => String(c.user_id) !== String(u.id));
      setContacts(visible);
      // Fetch presence for all contacts in parallel
      const results = await Promise.all(visible.map((c: any) => {
        const uid = c.user_id || c.id;
        return client.get(`/api/messages/presence/${uid}`)
          .then(r => ({ uid, data: { status: r.data.status, last_seen: r.data.last_seen || null } as PresenceData }))
          .catch(() => ({ uid, data: { status: 'offline', last_seen: null } as PresenceData }));
      }));
      const map: Record<string, PresenceData> = {};
      results.forEach(({ uid, data }) => { map[uid] = data; });
      setPresence(prev => ({ ...prev, ...map }));
    } catch {}
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDisplayName = useCallback((conv: any) => {
    if (conv.type === "group" || conv.type === "channel")
      return conv.name || (conv.type === "channel" ? "Channel" : "Group");
    // Prefer server-resolved other_name (from listConversations JOIN); fall back to
    // parsing the legacy JSON columns only when the JOIN field is absent.
    if (conv.other_name) return conv.other_name;
    try {
      const names = JSON.parse(conv.participant_names || '[]');
      const ids   = JSON.parse(conv.participant_ids   || '[]');
      const idx   = ids.findIndex((id: string) => String(id) === String(user?.id));
      // idx === -1 means the legacy column is stale; pick the non-empty name
      if (idx === -1) return names.find((n: string) => n) || "Chat";
      return names[idx === 0 ? 1 : 0] || names[0] || "Chat";
    } catch { return "Chat"; }
  }, [user?.id]);

  const getDmAvatarUrl = (conv: any) => {
    if (conv.avatar_url) return conv.avatar_url;
    if (conv.type !== 'dm') return '';
    // Prefer server-resolved other_avatar
    if (conv.other_avatar) return conv.other_avatar;
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
    // Prefer server-resolved other_user_id (from listConversations JOIN)
    if (conv.other_user_id) return String(conv.other_user_id);
    try {
      const ids = JSON.parse(conv.participant_ids || '[]');
      return ids.find((id: string) => String(id) !== String(user?.id)) || null;
    } catch { return null; }
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = parseISO(ts);
    if (isToday(d)) return fmtTime(d);
    if (isYesterday(d)) return 'Yesterday';
    if (isAfter(d, subDays(new Date(), 7))) return dfFormat(d, 'EEE');
    return dfFormat(d, 'dd/MM/yy');
  };

  /** Find the DM conversation for a given contact user id. */
  const getContactConv = useCallback((contactUserId: string) => {
    return conversations.find(c => {
      if (c.type !== 'dm') return false;
      try {
        const ids: string[] = JSON.parse(c.participant_ids || '[]');
        return ids.some(id => String(id) === String(contactUserId));
      } catch { return false; }
    }) || null;
  }, [conversations]);

  /** Navigate to a conversation (instant; no exit animation). */
  const handleConvClick = useCallback((href: string) => {
    router.push(href);
  }, [router]);

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
      // Sort by name or by online-first then last_seen time
      if (contactSort === 'name') {
        list = [...list].sort((a, b) =>
          (a.display_name || '').localeCompare(b.display_name || '')
        );
      } else {
        // time: online first, then by last_seen descending
        list = [...list].sort((a, b) => {
          const pa = presence[a.user_id || a.id];
          const pb = presence[b.user_id || b.id];
          const aOnline = pa?.status === 'online' ? 2 : pa?.status === 'away' ? 1 : 0;
          const bOnline = pb?.status === 'online' ? 2 : pb?.status === 'away' ? 1 : 0;
          if (aOnline !== bOnline) return bOnline - aOnline;
          const aTime = pa?.last_seen ? new Date(pa.last_seen).getTime() : 0;
          const bTime = pb?.last_seen ? new Date(pb.last_seen).getTime() : 0;
          return bTime - aTime;
        });
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
  }, [conversations, contacts, tab, realMode, search, user, getDisplayName, contactSort, presence]);

  const TABS: { id: Tab; label: string; icon?: any }[] = [
    { id: 'all',      label: 'All' },
    { id: 'dm',       label: 'Chats',    icon: UserIcon },
    { id: 'groups',   label: 'Groups',   icon: Users },
    { id: 'channels', label: 'Channels', icon: Radio },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    <div data-page-guide="messages-header" className="max-w-2xl mx-auto flex flex-col h-full -mx-4 md:mx-auto bg-background">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 shrink-0 bg-background">

        {/* Title row */}
        <div data-page-guide="messages-header" className="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-foreground">
            Messages
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-secondary text-muted-foreground"
              aria-label="Search messages"
            >
              <Search className="w-5 h-5" />
            </button>
            <NewChatMenu data-page-guide="messages-new" user={user} contacts={contacts} onCreated={() => loadConversations()} />
          </div>
        </div>

        {/* Search bar */}
        <div data-page-guide="messages-search" className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full h-10 ps-10 pe-4 rounded-xl text-sm outline-none bg-secondary text-foreground border border-border"
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
                className={cn(
                  'relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                  active ? 'text-primary-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="messages-tab-indicator"
                    className="absolute inset-0 rounded-full bg-primary"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  />
                )}
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />
      </div>

      {/* ── List ── */}
      <div data-page-guide="messages-list" className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4">
        {loading && conversations.length === 0 ? (
          <div className="px-4 py-2 space-y-1">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-12 h-12 rounded-full shrink-0 animate-pulse bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-full w-32 animate-pulse bg-secondary" />
                  <div className="h-3 rounded-full w-48 animate-pulse bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={tab === 'channels' ? Radio : tab === 'groups' ? Users : tab === 'all' ? UserIcon : MessageCircle}
            title={search ? `No results for "${search}"` : tab === 'channels' ? 'No channels yet' : tab === 'groups' ? 'No groups yet' : tab === 'dm' ? 'No chats yet' : 'No contacts found'}
            subtitle={!search ? (tab === 'all' ? 'People you follow will appear here' : 'Tap the pencil icon to start a new chat') : undefined}
          />
        ) : tab === 'all' ? (
          /* ── All tab: contacts list ── */
          <div key={tab} className="transition-opacity duration-150">
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  People · {filtered.length}
                </p>
                <button
                  onClick={() => setContactSort(s => s === 'name' ? 'time' : 'name')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Sort by ${contactSort === 'name' ? 'time' : 'name'}`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  {contactSort === 'name' ? 'A–Z' : 'Activity'}
                </button>
              </div>
              {(filtered as any[]).map((contact: any) => {
                const avatarUrl = Array.isArray(contact.avatar_url) ? contact.avatar_url[0] : contact.avatar_url;
                const name = contact.display_name || 'User';
                const uid = contact.user_id || contact.id;
                const conv = getContactConv(uid);
                const unread = conv ? (unreadByConv[conv.id] || 0) : 0;
                const hasUnread = unread > 0;
                const lastMsgTime = conv?.last_message_at ? formatTime(conv.last_message_at) : null;
                const presenceData = presence[uid] ?? null;
                const isOnlineContact = isUserOnline(presenceData);
                return (
                  <button
                    key={uid}
                    onClick={async () => {
                      try {
                        const { findOrCreateConversation } = await import('@/lib/messaging');
                        const foundConv = await findOrCreateConversation(user, contact.user_id, name);
                        if (foundConv) handleConvClick(`/messages/${foundConv.id}`);
                      } catch {}
                    }}
                    onPointerEnter={async () => {
                      // Only prefetch if a conv already exists — don't create one on hover
                      try {
                        const existing = getContactConv(uid);
                        if (existing) router.prefetch(`/messages/${existing.id}`);
                      } catch {}
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 min-h-[68px] text-left transition-colors hover:bg-secondary/50 active:bg-secondary/80 border-b border-border/40"
                  >
                    <UserIdentity
                      displayName={name}
                      avatarUrl={avatarUrl ?? null}
                      businessName={(contact as any).business_name ?? null}
                      businessSlug={(contact as any).business_slug ?? null}
                      showBusinessLink={false}
                      onlineIndicator={isOnlineContact}
                      size="sm"
                      className="flex-1 min-w-0"
                    />
                    <div className="flex flex-col items-center gap-0.5 shrink-0 ml-2">
                      <div className="relative">
                        <MessageCircle className={cn('w-5 h-5', hasUnread ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                        {hasUnread && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                      {lastMsgTime && <span className="text-[10px] text-muted-foreground whitespace-nowrap">{lastMsgTime}</span>}
                    </div>
                  </button>
                );
              })}
          </div>
        ) : (
          <div key={tab} className="transition-opacity duration-150">
              {filtered.map(conv => {
                const name        = getDisplayName(conv);
                const isChannel   = conv.type === 'channel';
                const isDm        = conv.type === 'dm';
                const avatarUrl   = getDmAvatarUrl(conv);
                const otherId     = isDm ? getDmOtherId(conv) : null;
                const presenceData = otherId ? presence[otherId] : null;
                const online      = isDm && isUserOnline(presenceData);
                const unread      = unreadByConv[conv.id] || 0;
                const isTyping    = isDm && typingConvs[conv.id];
                const timeStr     = formatTime(conv.last_message_at || conv.updated_at);
                // Look up the other person's profile for business name (DMs only)
                const otherProfile = otherId
                  ? contacts.find((c: any) => String(c.user_id) === String(otherId) || String(c.id) === String(otherId))
                  : null;
                const otherBusinessName: string | null = otherProfile?.business_name ?? null;

                return (
                  <Link
                    key={conv.id}
                    href={`/messages/${conv.id}`}
                    prefetch
                    onPointerEnter={() => router.prefetch(`/messages/${conv.id}`)}
                    onClick={() => {
                      setUnreadByConv(prev => { const n = { ...prev }; delete n[conv.id]; return n; });
                      handleConvClick(`/messages/${conv.id}`);
                    }}
                    className="flex items-center gap-3 px-4 py-3 min-h-[68px] transition-colors hover:bg-secondary/50 active:bg-secondary/80 border-b border-border/40"
                  >
                    {/* Avatar (groups/channels keep the gradient+icon; DMs use UserIdentity avatar) */}
                    {isDm ? (
                      /* DM: full UserIdentity for avatar + name + business name */
                      <div className="flex flex-1 min-w-0 items-center gap-3">
                        <UserIdentity
                          displayName={name}
                          avatarUrl={avatarUrl || null}
                          businessName={otherBusinessName}
                          showBusinessLink={false}
                          onlineIndicator={online}
                          size="md"
                          className="flex-1 min-w-0"
                        />
                        {/* Right column: ticks + time + unread */}
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <div className="flex items-center gap-1">
                            {conv.last_message_id && String(conv.last_message_sender_id) === String(user?.id) && (
                              <MessageTicks tick={tickFor({ created_at: conv.last_message_at }, user?.id, [{
                                user_id: conv.other_user_id, last_read_at: conv.other_last_read_at, last_delivered_at: conv.other_last_delivered_at,
                              }])} />
                            )}
                            <span className={cn('text-[11px] whitespace-nowrap', unread > 0 ? 'text-primary' : 'text-muted-foreground')}>
                              {timeStr}
                            </span>
                          </div>
                          {unread > 0 && (
                            <span className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-destructive-foreground bg-destructive px-1.5">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                          <p className={cn('text-xs truncate max-w-[120px] text-right', isTyping ? 'text-primary italic' : 'text-muted-foreground', unread > 0 ? 'font-semibold' : 'font-normal')}>
                            {isTyping ? 'typing…' : conv.last_message || ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Group / Channel: icon avatar + name row + last message row */
                      <>
                        <div className="relative shrink-0">
                          <div
                            className="w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg"
                            style={{ background: isChannel ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                          >
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarUrl} alt={name} width={52} height={52} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            ) : isChannel ? (
                              <Radio className="w-5 h-5" />
                            ) : (
                              <Users className="w-5 h-5" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className={cn('text-sm truncate text-foreground', unread > 0 ? 'font-bold' : 'font-semibold')}>{name}</p>
                            <span className={cn('text-[11px] whitespace-nowrap shrink-0', unread > 0 ? 'text-primary' : 'text-muted-foreground')}>{timeStr}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('text-xs truncate flex-1', isTyping ? 'text-primary italic' : 'text-muted-foreground', unread > 0 ? 'font-semibold' : 'font-normal')}>
                              {isTyping ? 'typing…' : conv.last_message || 'No messages yet'}
                            </p>
                            {unread > 0 && (
                              <span className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-destructive-foreground bg-destructive px-1.5 shrink-0">
                                {unread > 99 ? '99+' : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </Link>
                );
              })}
          </div>
        )}
      </div>
    </div>
    {showSearch && (
      <MessageSearch conversationId={undefined} onClose={() => setShowSearch(false)} />
    )}
    </>
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
