'use client'
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import client from "@/api/client";
import { useTranslation } from 'react-i18next';
import { useRealMode } from "@/lib/RealModeContext";

import {
  Search, Users, Radio, User as UserIcon, Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import moment from "moment";
import NewChatMenu from "@/components/messaging/NewChatMenu";

export default function Messages() {
  const { t } = useTranslation();
  const { realMode } = useRealMode();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | groups | channels | contacts
  // Online presence: map userId → 'online'|'offline'
  const [presence, setPresence] = useState({});

  useEffect(() => {
    auth.me().then(u => { setUser(u); loadConversations(u); loadContacts(u); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    // Poll for new conversations every 10 seconds
    const interval = setInterval(() => loadConversations(), 10000);
    return () => clearInterval(interval);
  }, [user]);

  const loadConversations = async (currentUser?) => {
    const u = currentUser || user;
    if (!u) return;
    setLoading(true);
    try {
      const data = await entities.Conversation.list("-updated_at", 100);
      const myConvos = data.filter(c => {
        try {
          const ids = JSON.parse(c.participant_ids || "[]");
          return ids.includes(u.id);
        } catch { return false; }
      });

      // Filter out empty DM conversations older than 5 minutes
      const now = Date.now();
      const cleaned = myConvos.filter(c => {
        if (c.type === 'dm' && !c.last_message) {
          const age = now - new Date(c.created_at).getTime();
          if (age > 5 * 60 * 1000) return false; // discard empty old DMs
        }
        return true;
      });

      setConversations(cleaned);

      // Fetch presence for DM participants
      const dmPartnerIds = cleaned
        .filter(c => c.type === 'dm')
        .map(c => {
          try {
            const ids = JSON.parse(c.participant_ids || '[]');
            return ids.find(id => id !== u.id);
          } catch { return null; }
        })
        .filter(Boolean);

      if (dmPartnerIds.length > 0) {
        const presenceResults = await Promise.all(
          dmPartnerIds.map(uid =>
            client.get(`/api/messages/presence/${uid}`)
              .then(r => ({ uid, status: r.data.status }))
              .catch(() => ({ uid, status: 'offline' }))
          )
        );
        const presenceMap = {};
        presenceResults.forEach(({ uid, status }) => { presenceMap[uid] = status; });
        setPresence(presenceMap);
      }
    } catch {
      // silently keep existing conversations on poll failure
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async (u) => {
    try {
      const allUsers = await entities.UserProfile.list("-created_at", 50);
      setContacts(allUsers.filter(c => c.user_id !== u.id));
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

  const getAvatarLetter = (conv) => {
    const name = getDisplayName(conv);
    return name.charAt(0).toUpperCase();
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
    // Real-mode: exclude DMs with seed users
    if (realMode && c.type === 'dm') {
      try {
        const ids = JSON.parse(c.participant_ids || '[]');
        const otherIds = ids.filter(id => id !== user?.id);
        const hasSeed = otherIds.some(oid => {
          const contact = contacts.find(ct => ct.user_id === oid || ct.id === oid);
          return contact?.is_seed === true;
        });
        if (hasSeed) return false;
      } catch { /* ignore */ }
    }
    if (!search) return true;
    return getDisplayName(c).toLowerCase().includes(search.toLowerCase());
  });

  const filteredContacts = contacts.filter(c => {
    if (!search) return true;
    return (c.display_name || c.headline || "").toLowerCase().includes(search.toLowerCase());
  });

  const tabs = [
    { id: "all", label: "All" },
    { id: "groups", label: "Groups", icon: Users },
    { id: "channels", label: "Channels", icon: Radio },
    { id: "contacts", label: "Contacts", icon: UserIcon },
  ];

  return (
      <div className="max-w-xl mx-auto">
        {/* Telegram-style Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h1 className="font-display text-2xl font-bold text-primary">Empire Chat</h1>
          <NewChatMenu user={user} contacts={contacts} onCreated={() => loadConversations()} />
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="pl-9 rounded-full bg-secondary border-0 h-10"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
      {/* Spinner: only show on initial load, not on polls */}
      {loading && conversations.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-border/50 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === "contacts" ? (
          /* Contacts List */
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 mb-2">
              {filteredContacts.length} Contacts
            </p>
            <div className="space-y-0.5">
              {filteredContacts.map(contact => (
                <ContactItem
                  key={contact.id}
                  contact={contact}
                  user={user}
                  existingConv={conversations.find(c => {
                    try {
                      const ids = JSON.parse(c.participant_ids || "[]");
                      return c.type === "dm" && ids.length === 2 && ids.includes(contact.id);
                    } catch { return false; }
                  })}
                />
              ))}
              {filteredContacts.length === 0 && (
                <div className="text-center py-16">
                  <UserIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No contacts found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Conversations List */
          <div>
            {filteredConvs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  {tab === "channels" ? <Radio className="w-7 h-7 text-muted-foreground" /> : tab === "groups" ? <Users className="w-7 h-7 text-muted-foreground" /> : <UserIcon className="w-7 h-7 text-muted-foreground" />}
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tab === "channels" ? "No channels yet" : tab === "groups" ? "No groups yet" : "No chats yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tab === "channels" ? "Create a channel to broadcast messages" : tab === "groups" ? "Create a group to chat with multiple people" : "Tap the menu to start a new chat"}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredConvs.map(conv => {
                  const name = getDisplayName(conv);
                  const isChannel = conv.type === "channel";
                  const isGroup = conv.type === "group";
                  const isDm = conv.type === "dm";

                  // For DM conversations, try to resolve the other participant's avatar
                  // by matching against loaded contacts
                  let dmAvatarUrl = "";
                  if (isDm && !conv.avatar_url) {
                    try {
                      const ids = JSON.parse(conv.participant_ids || "[]");
                      const otherId = ids.find((id: string) => id !== user?.id);
                      if (otherId) {
                        const match = contacts.find(c => c.id === otherId || c.user_id === otherId);
                        if (match) {
                          dmAvatarUrl = Array.isArray(match.avatar_url)
                            ? (match.avatar_url[0] ?? "")
                            : (match.avatar_url ?? "");
                        }
                      }
                    } catch { /* ignore */ }
                  }

                  const resolvedAvatarUrl = conv.avatar_url || dmAvatarUrl;

                  return (
                    <Link
                      key={conv.id}
                      href={`/messages/${conv.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      {/* Avatar with optional online dot */}
                      <div className="relative shrink-0">
                        {resolvedAvatarUrl ? (
                          <img src={resolvedAvatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                            style={{ backgroundColor: getAvatarColor(conv) }}
                          >
                            {isChannel ? <Radio className="w-5 h-5" /> : isGroup ? <Users className="w-5 h-5" /> : getAvatarLetter(conv)}
                          </div>
                        )}
                        {/* Online dot for DM conversations */}
                        {isDm && (() => {
                          try {
                            const ids = JSON.parse(conv.participant_ids || '[]');
                            const otherId = ids.find(i => i !== user?.id);
                            return otherId && presence[otherId] === 'online';
                          } catch { return false; }
                        })() && (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-background rounded-full" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 border-b border-border/20 pb-2.5 -mb-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-semibold truncate text-foreground">{name}</p>
                            {isChannel && <Radio className="w-3 h-3 text-muted-foreground shrink-0" />}
                            {isGroup && <Users className="w-3 h-3 text-muted-foreground shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground shrink-0 ml-2">
                            {conv.last_message_at ? moment(conv.last_message_at).format("HH:mm") : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate flex-1">
                              {isChannel && conv.last_message}
                              {!isChannel && conv.last_message}
                            </p>
                          )}
                          {!conv.last_message && (
                            <p className="text-xs text-muted-foreground italic flex-1">No messages yet</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
  );
}

function ContactItem({ contact, user, existingConv }) {
  const [creating, setCreating] = useState(false);
  const name = contact.display_name || contact.headline || "Unknown";

  // Resolve avatar_url — may be array or string
  const avatarUrl = Array.isArray(contact.avatar_url)
    ? (contact.avatar_url[0] ?? "")
    : (contact.avatar_url ?? "");

  const handleStartChat = async () => {
    if (existingConv) return;
    setCreating(true);
    try {
      const conv = await entities.Conversation.create({
        participant_ids: JSON.stringify([user.id, contact.id]),
        participant_names: JSON.stringify([user.full_name || "User", name]),
        type: "dm",
        last_message: "",
      });
      window.location.href = `/messages/${conv.id}`;
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  };

  return (
    <Link
      href={existingConv ? `/messages/${existingConv.id}` : "#"}
      onClick={(e) => { if (!existingConv) { e.preventDefault(); handleStartChat(); } }}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
    >
      {/* Avatar with image fallback */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-11 h-11 rounded-full object-cover shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('style'); }}
        />
      ) : null}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0 bg-primary"
        style={{ display: avatarUrl ? 'none' : 'flex' }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 border-b border-border/20 pb-2.5 -mb-2.5">
        <p className="text-sm font-medium truncate text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{creating ? "Starting chat..." : contact.email || "Tap to chat"}</p>
      </div>
    </Link>
  );
}



