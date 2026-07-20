// @ts-nocheck
'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from "@/lib/AuthContext";
import { getSocket } from "@/lib/socket";
import client from "@/api/client";
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Send, Radio, Users, MoreVertical, X, Pencil, Trash2,
  CornerUpLeft, Check, CheckCheck, ShieldOff, History,
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";

const TG_BLUE = "#0088cc";
const TG_BLUE_LIGHT = "#effdde";

export default function ChatRoom() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages]       = useState([]);
  const [conversation, setConversation] = useState(null);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);

  // Edit / reply mode
  const [editingMsg, setEditingMsg]   = useState(null); // { id, content }
  const [replyingTo, setReplyingTo]   = useState(null); // message object
  const [editText, setEditText]       = useState("");

  // Per-message hover actions
  const [hoveredMsg, setHoveredMsg]   = useState(null);
  const [deletingMsg, setDeletingMsg] = useState(null); // waiting for confirm

  // Header menu
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Block status & online status
  const [isBlocked, setIsBlocked]     = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [isOnline, setIsOnline]       = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const deleteTimer = useRef(null);

  // ── Load conversation + messages ──────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const { data } = await client.get(`/api/messages/conversations/${id}/messages?limit=200`);
      setMessages(data);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [convRes] = await Promise.all([
          client.get(`/api/messages/conversations/${id}`),
          loadMessages(),
        ]);
        if (!cancelled) setConversation(convRes.data);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();

    const socket = getSocket();
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    socket.emit('join_conversation', id);

    const onNew = (msg) => {
      if (msg.conversation_id === id) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    };
    const onEdited = (msg) => {
      if (msg.conversation_id === id) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
      }
    };
    const onDeleted = ({ message_id }) => {
      setMessages(prev => prev.filter(m => m.id !== message_id));
    };

    socket.on('new_message', onNew);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);

    return () => {
      cancelled = true;
      socket.emit('leave_conversation', id);
      socket.off('new_message', onNew);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
    };
  }, [id, loadMessages]);

  // Resolve other user ID for DM features
  useEffect(() => {
    if (!conversation || !user) return;
    if (conversation.type === 'dm') {
      try {
        const ids = JSON.parse(conversation.participant_ids || '[]');
        const other = ids.find(uid => uid !== user.id);
        setOtherUserId(other || null);
      } catch { /* ignore */ }
    }
  }, [conversation, user]);

  // Check block status + online status when other user resolves
  useEffect(() => {
    if (!otherUserId) return;
    client.get(`/api/messages/block/${otherUserId}`)
      .then(r => setIsBlocked(r.data.blocked))
      .catch(() => {});
    const fetchPresence = () => {
      client.get(`/api/messages/presence/${otherUserId}`)
        .then(r => setIsOnline(r.data.status === 'online'))
        .catch(() => {});
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 60_000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  // Set own presence online
  useEffect(() => {
    client.put('/api/messages/presence', { status: 'online' }).catch(() => {});
    return () => { client.put('/api/messages/presence', { status: 'offline' }).catch(() => {}); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when reply/edit changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [replyingTo, editingMsg]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (editingMsg) { await handleSaveEdit(); return; }
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText('');
    const replyId = replyingTo?.id || null;
    setReplyingTo(null);
    try {
      await client.post(`/api/messages/conversations/${id}/messages`, {
        content,
        type: 'text',
        ...(replyId ? { reply_to_id: replyId } : {}),
      });
    } catch { toast.error('Failed to send'); setText(content); }
    setSending(false);
  };

  const startEdit = (msg) => {
    setEditingMsg(msg);
    setEditText(msg.content);
    setReplyingTo(null);
    setHoveredMsg(null);
    inputRef.current?.focus();
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingMsg) return;
    try {
      await client.put(`/api/messages/${editingMsg.id}`, { content: editText.trim() });
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: editText.trim(), edited: true } : m));
    } catch { toast.error('Failed to edit message'); }
    setEditingMsg(null);
    setEditText('');
    setText('');
  };

  const handleDelete = (msg) => {
    if (deletingMsg?.id === msg.id) {
      // Confirmed
      clearTimeout(deleteTimer.current);
      client.delete(`/api/messages/${msg.id}`)
        .then(() => setMessages(prev => prev.filter(m => m.id !== msg.id)))
        .catch(() => toast.error('Failed to delete'));
      setDeletingMsg(null);
    } else {
      setDeletingMsg(msg);
      deleteTimer.current = setTimeout(() => setDeletingMsg(null), 3000);
    }
  };

  const handleClearHistory = async () => {
    setHeaderMenuOpen(false);
    try {
      await client.delete(`/api/messages/conversations/${id}/history`);
      setMessages([]);
      toast.success('Chat history cleared');
    } catch { toast.error('Failed to clear history'); }
  };

  const handleBlock = async () => {
    setHeaderMenuOpen(false);
    if (!otherUserId) return;
    try {
      if (isBlocked) {
        await client.delete(`/api/messages/block/${otherUserId}`);
        setIsBlocked(false);
        toast.success('User unblocked');
      } else {
        await client.post(`/api/messages/block/${otherUserId}`);
        setIsBlocked(true);
        toast.success('User blocked');
      }
    } catch { toast.error('Failed to update block status'); }
  };

  const handleBack = async () => {
    // Delete empty conversation created < 5 min ago
    if (messages.length === 0 && conversation) {
      const age = Date.now() - new Date(conversation.created_at).getTime();
      if (age < 5 * 60 * 1000) {
        try { await client.delete(`/api/messages/conversations/${id}`); } catch { /* ignore */ }
      }
    }
    router.push('/messages');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDisplayName = () => {
    if (!conversation) return 'Chat';
    if (conversation.type === 'group' || conversation.type === 'channel') {
      return conversation.name || (conversation.type === 'channel' ? 'Channel' : 'Group');
    }
    try {
      const names = JSON.parse(conversation.participant_names || '[]');
      const ids   = JSON.parse(conversation.participant_ids   || '[]');
      const idx   = ids.indexOf(user?.id);
      return names[idx === 0 ? 1 : 0] || names[0] || 'Chat';
    } catch { return 'Chat'; }
  };

  const getSubtitle = () => {
    if (!conversation) return '';
    if (conversation.type === 'channel' || conversation.type === 'group') {
      try {
        const count = JSON.parse(conversation.participant_ids || '[]').length;
        return `${count} ${conversation.type === 'channel' ? 'subscriber' : 'member'}${count !== 1 ? 's' : ''}`;
      } catch { return ''; }
    }
    if (isOnline) return 'online';
    return 'last seen recently';
  };

  const isAdmin   = conversation?.admin_id === user?.id;
  const isChannel = conversation?.type === 'channel';
  const isGroup   = conversation?.type === 'group';
  const isDm      = conversation?.type === 'dm';
  const canSend   = !isBlocked && (!isChannel || isAdmin);

  // Group messages by date
  const grouped = (() => {
    const groups = {};
    messages.forEach(msg => {
      const key = moment(msg.created_at).format('YYYY-MM-DD');
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return Object.entries(groups);
  })();

  const dateLabel = (key) => {
    const d = moment(key);
    if (d.isSame(moment(), 'day')) return 'Today';
    if (d.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
    return d.format('MMMM D');
  };

  const avatarLetter = getDisplayName().charAt(0).toUpperCase();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm z-10" style={{ backgroundColor: TG_BLUE }}>
        <button onClick={handleBack} className="p-1 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {isChannel ? <Radio className="w-5 h-5" /> : isGroup ? <Users className="w-5 h-5" /> : avatarLetter}
          </div>
          {isDm && isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#0088cc] rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{getDisplayName()}</p>
          <p className="text-xs text-white/70">{getSubtitle()}</p>
        </div>

        {/* "..." menu */}
        <div className="relative">
          <button onClick={() => setHeaderMenuOpen(v => !v)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
          {headerMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-card rounded-2xl shadow-lg border border-border/30 z-50 overflow-hidden">
              <button onClick={handleClearHistory} className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-secondary/50 transition-colors text-left">
                <History className="w-4 h-4 text-muted-foreground" /> Clear History
              </button>
              {isDm && otherUserId && (
                <button onClick={handleBlock} className={`flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-secondary/50 transition-colors text-left ${isBlocked ? 'text-green-600' : 'text-red-500'}`}>
                  <ShieldOff className="w-4 h-4" /> {isBlocked ? 'Unblock User' : 'Block User'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5"
        style={{ backgroundColor: '#cfd7dc' }}
        onClick={() => { setHeaderMenuOpen(false); setHoveredMsg(null); }}
      >
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!loading && grouped.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="bg-black/10 backdrop-blur-sm rounded-2xl px-6 py-3 text-center">
              <p className="text-sm text-foreground/80">
                {isBlocked ? 'You have blocked this user.' : 'No messages yet. Say hello!'}
              </p>
            </div>
          </div>
        )}

        {grouped.map(([dateKey, msgs]) => (
          <div key={dateKey}>
            <div className="flex justify-center my-3">
              <span className="bg-black/10 backdrop-blur-sm text-foreground/80 text-xs font-medium px-3 py-1 rounded-full">
                {dateLabel(dateKey)}
              </span>
            </div>

            {msgs.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              const prev = msgs[idx - 1];
              const showSender = (isGroup || isChannel) && !isMe && (!prev || prev.sender_id !== msg.sender_id);
              const isHovered  = hoveredMsg === msg.id;
              const isConfirming = deletingMsg?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-0.5 relative group`}
                  onMouseEnter={() => setHoveredMsg(msg.id)}
                  onMouseLeave={() => { setHoveredMsg(null); }}
                >
                  {/* Action buttons — appear on hover */}
                  {isHovered && (
                    <div className={`absolute top-0 flex items-center gap-1 z-10 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                      {/* Reply */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setEditingMsg(null); setText(''); }}
                        className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                        title="Reply"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5 text-white" />
                      </button>
                      {/* Edit (own only) */}
                      {isMe && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(msg); }}
                          className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                      {/* Delete (own only) */}
                      {isMe && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(msg); }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isConfirming ? 'bg-red-500 hover:bg-red-600' : 'bg-black/20 hover:bg-black/40'}`}
                          title={isConfirming ? 'Tap again to confirm' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className={`relative max-w-[80%] px-3 py-1.5 text-sm shadow-sm ${
                      isMe
                        ? 'rounded-2xl rounded-br-md'
                        : 'rounded-2xl rounded-bl-md bg-card'
                    }`}
                    style={isMe ? { backgroundColor: TG_BLUE_LIGHT } : {}}
                  >
                    {showSender && (
                      <p className="text-xs font-semibold mb-0.5" style={{ color: TG_BLUE }}>
                        {msg.sender_name}
                      </p>
                    )}

                    {/* Reply quote */}
                    {msg.reply_to_id && (
                      <div className={`border-l-2 pl-2 mb-1 rounded-r ${isMe ? 'border-amber-500' : 'border-blue-400'}`}>
                        <p className="text-[10px] text-muted-foreground italic truncate">
                          {messages.find(m => m.id === msg.reply_to_id)?.content || 'Quoted message'}
                        </p>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>

                    <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                      {msg.edited && (
                        <span className="text-[10px] text-muted-foreground italic">edited</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {moment(msg.created_at).format('HH:mm')}
                      </span>
                      {isMe && (
                        <CheckCheck className="w-3.5 h-3.5" style={{ color: TG_BLUE, opacity: 0.7 }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!canSend ? (
        <div className="bg-card border-t border-border/30 px-4 py-4 flex items-center justify-center shrink-0">
          <p className="text-sm text-muted-foreground">
            {isBlocked ? '🚫 You have blocked this user.' : '🔊 Only admins can post in this channel.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border-t border-border/30 shrink-0">

          {/* Reply preview */}
          {replyingTo && !editingMsg && (
            <div className="flex items-start gap-2 px-4 py-2 border-b border-border/20 bg-secondary/30">
              <div className="border-l-2 border-blue-500 pl-2 flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: TG_BLUE }}>Reply to {replyingTo.sender_name || 'message'}</p>
                <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-secondary rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Edit mode banner */}
          {editingMsg && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20 bg-amber-50 dark:bg-amber-900/20">
              <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-700 flex-1">Editing message</p>
              <button onClick={() => { setEditingMsg(null); setEditText(''); }} className="p-1 hover:bg-amber-100 rounded">
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          )}

          {/* Text input row */}
          <div className="px-3 py-2 flex items-end gap-2">
            <div className="flex-1 bg-secondary rounded-2xl px-4 py-2 flex items-center">
              <textarea
                ref={inputRef}
                value={editingMsg ? editText : text}
                onChange={e => editingMsg ? setEditText(e.target.value) : setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  if (e.key === 'Escape') {
                    if (editingMsg) { setEditingMsg(null); setEditText(''); }
                    if (replyingTo) setReplyingTo(null);
                  }
                }}
                placeholder={editingMsg ? 'Edit message...' : 'Message'}
                rows={1}
                className="flex-1 bg-transparent text-sm outline-none resize-none max-h-24 self-center"
                style={{ minHeight: '20px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!(editingMsg ? editText.trim() : text.trim()) || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-30 shrink-0 transition-transform active:scale-90"
              style={{ backgroundColor: TG_BLUE }}
            >
              {editingMsg ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
