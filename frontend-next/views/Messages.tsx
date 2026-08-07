'use client'
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import client from "@/api/client";
import { useTranslation } from 'react-i18next';
import { useRealMode } from "@/lib/RealModeContext";
import { Search, Users, Radio, User as UserIcon, MessageCircle, GripVertical, ArrowDownAZ, Clock3 } from "lucide-react";
import moment from "moment";
import NewChatMenu from "@/components/messaging/NewChatMenu";
import { formatLastSeen, isUserOnline } from "@/lib/presence";
import type { PresenceData } from "@/lib/presence";
import { getSocket, connectSocket } from "@/lib/socket";
import { useChatPresence } from "@/lib/useChatPresence";

// ── Default tab order: Contacts first ──────────────────────────────────────
const DEFAULT_TAB_ORDER = ["contacts", "all", "groups", "channels"];
const STORAGE_KEY = "empire_chat_tab_order";

function loadTabOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_TAB_ORDER;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: string[] = JSON.parse(saved);
      // Validate — make sure all default tabs are present
      if (DEFAULT_TAB_ORDER.every(id => parsed.includes(id))) return parsed;
    }
  } catch {}
  return DEFAULT_TAB_ORDER;
}

function saveTabOrder(order: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch {}
}

export default function Messages() {
  const router = useRouter();
  const { t } = useTranslation();
  const { realMode } = useRealMode();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("contacts"); // default = contacts
  const [presence, setPresence] = useState<Record<string, PresenceData>>({});
  const [typingConversations, setTypingConversations] = useState<Record<string, boolean>>({});
  const [contactSort, setContactSort] = useState<'recent' | 'name'>('recent');

  useChatPresence(Boolean(user));

  // ── Tab order state — persisted in localStorage ──────────────────────────
  const [tabOrder, setTabOrder] = useState<string[]>(DEFAULT_TAB_ORDER);
  const dragSrc = useRef<string | null>(null);

  // Load saved tab order on mount
  useEffect(() => {
    setTabOrder(loadTabOrder());
  }, []);

  // All available tab definitions
  const ALL_TABS = [
    { id: "contacts", label: "Contacts", icon: UserIcon },
    { id: "all",      label: "All",      icon: null },
    { id: "groups",   label: "Groups",   icon: Users },
    { id: "channels", label: "Channels", icon: Radio },
  ];

  // Ordered tabs based on tabOrder state
  const tabs = tabOrder
    .map(id => ALL_TABS.find(t => t.id === id))
    .filter(Boolean) as typeof ALL_TABS;

  // ── Drag-to-reorder handlers ──────────────────────────────────────────────
  const onDragStart = (id: string) => { dragSrc.current = id; };
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); };
  const onDrop      = (targetId: string) => {
    if (!dragSrc.current || dragSrc.current === targetId) return;
    const newOrder = [...tabOrder];
    const fromIdx = newOrder.indexOf(dragSrc.current);
    const toIdx   = newOrder.indexOf(targetId);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragSrc.current);
    setTabOrder(newOrder);
    saveTabOrder(newOrder);
    dragSrc.current = null;
  };

  useEffect(() => {
    auth.me().then(u => { setUser(u); loadConversations(u); loadContacts(u); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    // Replace 10s polling with socket event — update conversations when
    // a new message arrives so last_message and timestamp update live
    connectSocket();
    const socket = getSocket();
    const onNewMessage = () => { loadConversations(); };
    const onPresenceUpdated = (update: PresenceData) => {
      if (!update?.user_id) return;
      setPresence(current => ({
        ...current,
        [update.user_id as string]: { status: update.status, last_seen: update.last_seen || null },
      }));
    };
    socket.on('new_message', onNewMessage);
    socket.on('presence_updated', onPresenceUpdated);
    const onTypingUpdated = (update: { conversation_id?: string; user_id?: string; is_typing?: boolean }) => {
      if (!update.conversation_id || String(update.user_id) === String(user.id)) return;
      setTypingConversations(current => ({ ...current, [update.conversation_id!]: Boolean(update.is_typing) }));
    };
    socket.on('typing_updated', onTypingUpdated);

    // Refresh presence every 60s so online dots stay accurate
    const presenceInterval = setInterval(() => {
      loadConversations();
    }, 60_000);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('presence_updated', onPresenceUpdated);
      socket.off('typing_updated', onTypingUpdated);
      clearInterval(presenceInterval);
    };
  }, [user]);

  const loadConversations = async (currentUser?) => {
    const u = currentUser || user;
    if (!u) return;
    setLoading(true);
    try {
      const data = await entities.Conversation.list("-updated_at", 100);
      const myConvos = data.filter(c => {
        try { return JSON.parse(c.participant_ids || "[]").includes(u.id); } catch { return false; }
      });
      const now = Date.now();
      const cleaned = myConvos.filter(c => {
        if (c.type === 'dm' && !c.last_message) {
          if (now - new Date(c.created_at).getTime() > 5 * 60 * 1000) return false;
        }
        return true;
      });
      setConversations(cleaned);

      const dmPartnerIds = cleaned
        .filter(c => c.type === 'dm')
        .map(c => {
          try {
            return JSON.parse(c.participant_ids || '[]').find(id => String(id) !== String(u.id));
          } catch { return null; }
        })
        .filter(Boolean);

      if (dmPartnerIds.length > 0) {
        const results = await Promise.all(
          dmPartnerIds.map(uid =>
            client.get(`/api/messages/presence/${uid}`)
              .then(r => ({ uid, data: { status: r.data.status, last_seen: r.data.last_seen || null } as PresenceData }))
              .catch(() => ({ uid, data: { status: 'offline', last_seen: null } as PresenceData }))
          )
        );
        const map: Record<string, PresenceData> = {};
        results.forEach(({ uid, data }) => { map[uid] = data; });
        setPresence(map);
      }
    } catch {} finally { setLoading(false); }
  };

  const loadContacts = async (u) => {
    try {
      const all = await entities.UserProfile.list("-created_at", 50);
      const visibleContacts = all.filter(c => String(c.user_id) !== String(u.id));
      setContacts(visibleContacts);
      const results = await Promise.all(visibleContacts.map(contact =>
        client.get(`/api/messages/presence/${contact.user_id || contact.id}`)
          .then(r => ({ id: contact.user_id || contact.id, data: r.data as PresenceData }))
          .catch(() => ({ id: contact.user_id || contact.id, data: { status: 'offline', last_seen: null } as PresenceData }))
      ));
      setPresence(current => ({ ...current, ...Object.fromEntries(results.map(({ id, data }) => [id, data])) }));
    } catch {}
  };

  const getDisplayName = (conv) => {
    if (conv.type === "group" || conv.type === "channel") return conv.name || (conv.type === "channel" ? "Channel" : "Group");
    if (!conv.participant_names) return "Unknown";
    try {
      const names = JSON.parse(conv.participant_names);
      const ids = JSON.parse(conv.participant_ids);
      const idx = ids.indexOf(user?.id);
      return names[idx === 0 ? 1 : 0] || names[0] || "Unknown";
    } catch { return "Chat"; }
  };

  const getAvatarColor = (conv) => {
    if (conv.type === "channel") return "var(--ex-blue)";
    if (conv.type === "group") return "var(--ex-purple)";
    return "var(--ex-blue)";
  };

  const filteredConvs = conversations.filter(c => {
    if (tab === "groups") return c.type === "group";
    if (tab === "channels") return c.type === "channel";
    return true;
  }).filter(c => {
    if (realMode && c.type === 'dm') {
      try {
        const ids = JSON.parse(c.participant_ids || '[]');
        const hasSeed = ids.filter(id => id !== user?.id).some(oid => {
          const contact = contacts.find(ct => ct.user_id === oid || ct.id === oid);
          return contact?.is_seed === true;
        });
        if (hasSeed) return false;
      } catch {}
    }
    if (!search) return true;
    return getDisplayName(c).toLowerCase().includes(search.toLowerCase());
  });

  const filteredContacts = contacts.filter(c =>
    !search || (c.display_name || c.headline || "").toLowerCase().includes(search.toLowerCase())
  );

  const sortedContacts = useMemo(() => [...filteredContacts].sort((a, b) => {
    const aName = a.display_name || a.headline || '';
    const bName = b.display_name || b.headline || '';
    if (contactSort === 'name') return aName.localeCompare(bName, undefined, { sensitivity: 'base' });

    const aPresence = presence[a.user_id || a.id];
    const bPresence = presence[b.user_id || b.id];
    const onlineDelta = Number(isUserOnline(bPresence || null)) - Number(isUserOnline(aPresence || null));
    if (onlineDelta) return onlineDelta;
    const aLastSeen = aPresence?.last_seen ? new Date(aPresence.last_seen).getTime() : 0;
    const bLastSeen = bPresence?.last_seen ? new Date(bPresence.last_seen).getTime() : 0;
    return bLastSeen - aLastSeen || aName.localeCompare(bName, undefined, { sensitivity: 'base' });
  }), [filteredContacts, contactSort, presence]);

  // (tabs and tabOrder defined above)

  return (
    <div className="max-w-xl mx-auto -mt-4 -mx-4 md:mx-auto md:mt-0">

      {/* ── Gradient Header ── */}
      <div
        className="px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(135deg, var(--ex-blue) 0%, var(--ex-purple) 100%)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">Empire Chat</h1>
            <p className="text-white/70 text-xs mt-0.5">{filteredConvs.length} conversation{filteredConvs.length !== 1 ? 's' : ''}</p>
          </div>
          <NewChatMenu user={user} contacts={contacts} onCreated={() => loadConversations()} />
        </div>

        {/* Search bar — white pill inside gradient header */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-10 pr-4 h-10 rounded-full text-sm outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: '#fff',
              caretColor: '#fff',
            }}
          />
        </div>
      </div>

      {/* ── Tab Pills — draggable to reorder ── */}
      <div className="flex gap-1.5 px-4 py-3 bg-card border-b border-border/30 overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              draggable
              onDragStart={() => onDragStart(t.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(t.id)}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-grab active:cursor-grabbing select-none ${
                tab === t.id
                  ? "text-white shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              }`}
              style={tab === t.id ? { background: 'linear-gradient(135deg, var(--ex-blue), var(--ex-purple))' } : {}}
            >
              <GripVertical className="w-3 h-3 opacity-40 shrink-0" />
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="bg-card min-h-[60vh]">
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading chats…</p>
          </div>

        ) : tab === "contacts" ? (
          <div className="px-2 pt-2">
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {sortedContacts.length} Contacts
              </p>
              <div className="flex items-center rounded-lg bg-secondary p-0.5" aria-label="Sort contacts">
                <button onClick={() => setContactSort('recent')} aria-pressed={contactSort === 'recent'} title="Sort by recently online"
                  className={`p-1.5 rounded-md transition-colors ${contactSort === 'recent' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Clock3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setContactSort('name')} aria-pressed={contactSort === 'name'} title="Sort by name"
                  className={`p-1.5 rounded-md transition-colors ${contactSort === 'name' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {sortedContacts.length === 0 ? (
              <EmptyState icon={UserIcon} title="No contacts found" />
            ) : (
              sortedContacts.map(contact => (
                <ContactItem key={contact.id} contact={contact} user={user} presence={presence[contact.user_id || contact.id]}
                  existingConv={conversations.find(c => {
                    try {
                      const ids = JSON.parse(c.participant_ids || "[]");
                      const contactUserId = contact.user_id || contact.id;
                      return c.type === "dm" && ids.length === 2 && ids.some(id => String(id) === String(contactUserId));
                    }
                    catch { return false; }
                  })}
                />
              ))
            )}
          </div>

        ) : filteredConvs.length === 0 ? (
          <EmptyState
            icon={tab === "channels" ? Radio : tab === "groups" ? Users : MessageCircle}
            title={tab === "channels" ? "No channels yet" : tab === "groups" ? "No groups yet" : "No conversations yet"}
            subtitle={tab === "channels" ? "Create a channel to broadcast messages" : tab === "groups" ? "Start a group chat" : "Tap the + button to start a chat"}
          />
        ) : (
          <div className="px-2 pt-2 space-y-0.5">
            {filteredConvs.map(conv => {
              const name = getDisplayName(conv);
              const isChannel = conv.type === "channel";
              const isGroup   = conv.type === "group";
              const isDm      = conv.type === "dm";

              let dmAvatarUrl = "";
              if (isDm && !conv.avatar_url) {
                try {
                  const ids = JSON.parse(conv.participant_ids || "[]");
                  const otherId = ids.find((id: string) => String(id) !== String(user?.id));
                  if (otherId) {
                    const match = contacts.find(c => c.id === otherId || c.user_id === otherId);
                    if (match) dmAvatarUrl = Array.isArray(match.avatar_url) ? (match.avatar_url[0] ?? "") : (match.avatar_url ?? "");
                  }
                } catch {}
              }
              const resolvedAvatar = conv.avatar_url || dmAvatarUrl;

              let isOnline = false;
              let presenceData: PresenceData | null = null;
              if (isDm) {
                try {
                  const ids = JSON.parse(conv.participant_ids || '[]');
                  const otherId = ids.find((i: string) => String(i) !== String(user?.id));
                  if (otherId && presence[otherId]) {
                    presenceData = presence[otherId];
                    isOnline = isUserOnline(presenceData);
                  }
                } catch {}
              }

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  prefetch
                  onPointerEnter={() => router.prefetch(`/messages/${conv.id}`)}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-secondary/40 active:bg-secondary/60 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {resolvedAvatar ? (
                      <div
                        className="relative w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden"
                        style={{ background: 'linear-gradient(135deg,var(--ex-blue),var(--ex-purple))' }}
                      >
                        {name.charAt(0).toUpperCase()}
                        <Image
                          src={resolvedAvatar}
                          alt={name}
                          width={48}
                          height={48}
                          className="absolute inset-0 w-12 h-12 rounded-full object-cover ring-2 ring-border/20"
                          onError={event => { event.currentTarget.style.display = 'none'; }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                        style={{ background: isChannel ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : isGroup ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,var(--ex-blue),var(--ex-purple))' }}
                      >
                        {isChannel ? <Radio className="w-5 h-5" /> : isGroup ? <Users className="w-5 h-5" /> : name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-card rounded-full" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate text-foreground">{name}</p>
                      {conv.last_message_at && (
                        <p className="text-[11px] text-muted-foreground shrink-0">
                          {moment(conv.last_message_at).format("HH:mm")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs truncate flex-1">
                        {isDm && typingConversations[conv.id] ? (
                          <span className="text-blue-500 font-medium">typing…</span>
                        ) : isDm && presenceData ? (
                          <span className={isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground'}>
                            {formatLastSeen(presenceData)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {conv.last_message || <span className="italic">No messages yet</span>}
                          </span>
                        )}
                      </p>
                      {(isChannel || isGroup) && (
                        <span
                          className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: isChannel ? 'var(--ex-blue)' : 'var(--ex-purple)', opacity: 0.15 }}
                        />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, var(--ex-blue) 0%, var(--ex-purple) 100%)' }}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

/* ── Contact Item ── */
function ContactItem({ contact, user, existingConv, presence }: { contact: any; user: any; existingConv: any; presence?: PresenceData }) {
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const name = contact.display_name || contact.headline || "Unknown";
  const avatarUrl = Array.isArray(contact.avatar_url) ? (contact.avatar_url[0] ?? "") : (contact.avatar_url ?? "");
  const online = isUserOnline(presence || null);

  const handleStartChat = async () => {
    if (existingConv) return;
    setCreating(true);
    try {
      const { data: conv } = await client.post('/api/messages/conversations/find-or-create', {
        target_user_id: contact.user_id || contact.id,
      });
      router.push(`/messages/${conv.id}`);
    } catch {}
    setCreating(false);
  };

  return (
    <Link
      href={existingConv ? `/messages/${existingConv.id}` : "#"}
      prefetch={Boolean(existingConv)}
      onPointerEnter={() => { if (existingConv) router.prefetch(`/messages/${existingConv.id}`); }}
      onClick={e => { if (!existingConv) { e.preventDefault(); handleStartChat(); } }}
      className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-secondary/40 transition-colors"
    >
      <div className="relative shrink-0">
        {avatarUrl ? (
          <div
          className="relative w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--ex-blue), var(--ex-purple))' }}
        >
          {name.charAt(0).toUpperCase()}
          <Image
            src={avatarUrl}
            alt={name}
            width={44}
            height={44}
            className="absolute inset-0 w-11 h-11 rounded-full object-cover ring-2 ring-border/20"
            onError={event => { event.currentTarget.style.display = 'none'; }}
            unoptimized
          />
          </div>
        ) : (
          <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--ex-blue), var(--ex-purple))' }}
        >
          {name.charAt(0).toUpperCase()}
          </div>
        )}
        {online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-card" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-foreground">{name}</p>
        <p className={`text-xs truncate ${online ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
          {creating ? 'Starting chat…' : (presence ? formatLastSeen(presence) : 'last seen a while ago')}
        </p>
      </div>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm"
        style={{ background: 'linear-gradient(135deg, var(--ex-blue), var(--ex-purple))' }}
      >
        →
      </div>
    </Link>
  );
}
