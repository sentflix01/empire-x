'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from "@/lib/AuthContext";
import { getSocket, joinConversation, leaveConversation } from "@/lib/socket";
import client from "@/api/client";
import { applyReceipt, tickFor, type MemberReadState } from "@/lib/readReceipts";
import MessageTicks from "@/components/messaging/MessageTicks";
import MessageReactions from "@/components/messaging/MessageReactions";
import MessageSearch from "@/components/messaging/MessageSearch";
import ProductMessageBubble from "@/components/messaging/ProductMessageBubble";
import OrderUpdateBubble from "@/components/messaging/OrderUpdateBubble";
import {
  ArrowLeft, Send, Radio, Users, MoreVertical, X, Pencil, Trash2,
  CornerUpLeft, Check, ShieldOff, History, ImagePlus, Forward,
  Copy, UserCircle, Pin, Bookmark, Languages, Search, ChevronDown,
} from "lucide-react";
import { fmtTime, fmtLongDate } from "@/lib/date";
import { parseISO, isToday, isYesterday, format as fmtDate } from "date-fns";
import { toast } from "sonner";
import { formatLastSeen, isUserOnline } from "@/lib/presence";
import type { PresenceData } from "@/lib/presence";
import { useChatPresence } from "@/lib/useChatPresence";
import SafeImage from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";
import { uploadFile } from '@/lib/uploadFile';
import ErrorBoundary from '@/components/ErrorBoundary';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import {
  enqueuePendingMessage,
  removePendingMessage,
  getPendingMessages,
  getAllPendingMessages,
  type PendingMessage,
} from '@/lib/messageSendQueue';



function ChatRoom() {
  const params = useParams();
  // Ensure id is always a plain string — Next.js can return string[] for catch-all routes
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages]       = useState([]);
  const [conversation, setConversation] = useState(null);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading]         = useState(true);

  // Edit / reply mode
  const [editingMsg, setEditingMsg]   = useState(null); // { id, content }
  const [replyingTo, setReplyingTo]   = useState(null); // message object
  const [editText, setEditText]       = useState("");

  // Long-press context menu
  const [selectedMsg, setSelectedMsg]   = useState(null);
  const [deletingMsg, setDeletingMsg]   = useState(null);
  const [forwardMsg, setForwardMsg]     = useState(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [pinnedMsgs, setPinnedMsgs]     = useState<Set<string>>(new Set());
  const [savedMsgs, setSavedMsgs]       = useState<Set<string>>(new Set());

  // Offline queue — pending messages awaiting a network connection.
  // The value is unused today; the setters still maintain pending-send bookkeeping.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [offlineQueue, setOfflineQueue] = useState<PendingMessage[]>([]);

  // Legacy hover state (desktop) — still used to determine visual selection
  const [hoveredMsg, setHoveredMsg]     = useState(null);

  // Header menu
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Block status & online status
  const [isBlocked, setIsBlocked]     = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [presence, setPresence]       = useState<PresenceData | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  // Everyone's "delivered" / "seen" (seen only when both people allow read receipts).
  const [members, setMembers] = useState<MemberReadState[]>([]);
  const otherUserIdRef = useRef<string | null>(null);
  useEffect(() => { otherUserIdRef.current = otherUserId; }, [otherUserId]);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const deleteTimer = useRef(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef    = useRef(""); // mirrors text state for reliable mobile access
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  useChatPresence(Boolean(user));

  const setTyping = useCallback((isTyping: boolean) => {
    if (!id) return;
    getSocket().emit('typing', { conversationId: id, isTyping });
  }, [id]);

  const handleMessagesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    nearBottomRef.current = near;
    setShowScrollBtn(!near);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    nearBottomRef.current = true;
    setShowScrollBtn(false);
  }, []);

  // ── Load conversation + messages ──────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await client.get(`/api/messages/conversations/${id}/messages?limit=200`);
      setMessages(Array.isArray(data) ? data : (data as any)?.messages ?? []);
    } catch { /* ignore */ }
  }, [id]);

  // Mark the chat read while it's on screen: on open, on each new message from
  // others, and when the tab comes back into view.
  const lastMarked = useRef<string | null>(null);
  const markRead = useCallback(() => {
    if (!id || document.visibilityState !== 'visible') return;
    client.post(`/api/messages/conversations/${id}/read`).catch(() => undefined);
  }, [id]);
  useEffect(() => {
    const last = messages[messages.length - 1] as any;
    if (!last || last._temp || String(last.sender_id) === String(user?.id) || lastMarked.current === last.id) return;
    lastMarked.current = last.id;
    markRead();
  }, [messages, markRead, user?.id]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') markRead(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [markRead]);

  useEffect(() => {
    let cancelled = false;
    const convId = id;

    async function init() {
      if (!convId) return;
      try {
        const [convRes] = await Promise.all([
          client.get(`/api/messages/conversations/${convId}`),
          loadMessages(),
        ]);
        if (!cancelled) {
          setConversation(convRes.data);
          setMembers(Array.isArray(convRes.data?.members) ? convRes.data.members : []);
          markRead();
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
          inputRef.current?.focus({ preventScroll: true });
        }
      }

      // Restore any messages that were queued while offline
      if (!cancelled) {
        getPendingMessages(convId).then((pending) => {
          if (cancelled) return;
          setOfflineQueue(pending);
          // Show queued messages as pending bubbles so the user sees what is
          // waiting to send.  They are replaced by real messages once the
          // socket reconnects and flushes the queue.
          if (pending.length > 0) {
            setMessages((prev: unknown[]) => [
              ...prev,
              ...pending.map((p) => ({
                id: p.id,
                conversation_id: p.conversationId,
                sender_id: user?.id,
                sender_name: user?.full_name || 'You',
                content: p.content,
                type: p.type,
                created_at: p.createdAt,
                edited: false,
                reply_to_id: p.replyToId,
                _temp: true,
                _pending: true,
              })),
            ]);
          }
        }).catch(() => {});
      }
    }
    init();

    if (!convId) { setLoading(false); return; }

    const socket = getSocket();
    joinConversation(convId);

    const onNew = (msg) => {
      if (msg.conversation_id === convId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const withoutTemp = prev.filter(m => !(m._temp && m.sender_id === msg.sender_id && m.content === msg.content));
          return [...withoutTemp, msg];
        });
        if (String(msg.sender_id) !== String(user?.id) && typeof document !== 'undefined' && document.visibilityState === 'visible') {
          const who = msg.sender_name || 'New message';
          const snippetText = msg.type === 'image' ? 'photo' : String(msg.content || '').slice(0, 60);
          setLiveAnnouncement(`${who}: ${snippetText}`);
        }
      }
    };
    const onEdited = (msg) => {
      if (msg.conversation_id === convId) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
      }
    };
    const onDeleted = (payload) => {
      const deletedId = payload.id || payload.message_id;
      setMessages(prev => prev.filter(m => m.id !== deletedId));
    };

    socket.on('new_message', onNew);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    const onReceipt = (event) => {
      if (event?.conversation_id === convId) setMembers(prev => applyReceipt(prev, event));
    };
    socket.on('conversation_read', onReceipt);
    socket.on('conversation_delivered', onReceipt);
    const onPresenceUpdated = (update) => {
      if (update?.user_id && String(update.user_id) === String(otherUserIdRef.current)) {
        setPresence({ status: update.status, last_seen: update.last_seen || null });
      }
    };
    socket.on('presence_updated', onPresenceUpdated);
    const onTypingUpdated = (update) => {
      if (update?.conversation_id === convId && String(update.user_id) !== String(user?.id)) {
        const isTyping = Boolean(update.is_typing);
        setOtherTyping(isTyping);
        if (remoteTypingTimer.current) clearTimeout(remoteTypingTimer.current);
        if (isTyping) {
          // Clear a stale indicator if a phone loses connectivity before it can
          // send its final typing=false event.
          remoteTypingTimer.current = setTimeout(() => setOtherTyping(false), 3000);
        }
      }
    };
    socket.on('typing_updated', onTypingUpdated);

    const onReactionUpdate = (payload: { message_id: string; reactions: Record<string, number> }) => {
      setMessages((prev: unknown[]) => prev.map((m: unknown) => {
        const message = m as { id: string };
        return message.id === payload.message_id ? { ...message, reactions: payload.reactions } : m;
      }));
    };
    socket.on('reaction_added', onReactionUpdate);
    socket.on('reaction_removed', onReactionUpdate);

    const onMessagePinned = (p: { message_id: string; conversation_id: string }) => {
      if (p.conversation_id === convId) {
        setPinnedMsgs(prev => new Set([...prev, p.message_id]));
      }
    };
    const onMessageUnpinned = (p: { message_id: string; conversation_id: string }) => {
      if (p.conversation_id === convId) {
        setPinnedMsgs(prev => {
          const s = new Set(prev);
          s.delete(p.message_id);
          return s;
        });
      }
    };
    socket.on('message_pinned', onMessagePinned);
    socket.on('message_unpinned', onMessageUnpinned);

    // On reconnect, flush any messages that were queued while offline
    const onReconnect = () => {
      getAllPendingMessages().then((pending) => {
        pending.forEach((qMsg) => {
          client
            .post(`/api/messages/conversations/${qMsg.conversationId}/messages`, {
              content: qMsg.content,
              type: qMsg.type,
              ...(qMsg.replyToId ? { reply_to_id: qMsg.replyToId } : {}),
            })
            .then(() => {
              removePendingMessage(qMsg.id).catch(() => {});
              setOfflineQueue((prev) => prev.filter((m) => m.id !== qMsg.id));
              // Remove the pending bubble from the messages list
              setMessages((prev: unknown[]) =>
                prev.filter((m) => (m as { id: string }).id !== qMsg.id),
              );
            })
            .catch(() => {
              // Leave in queue — will retry on next reconnect
            });
        });
      }).catch(() => {});
    };
    socket.on('connect', onReconnect);

    return () => {
      cancelled = true;
      leaveConversation(convId);
      socket.off('conversation_read', onReceipt);
      socket.off('conversation_delivered', onReceipt);
      socket.off('new_message', onNew);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('presence_updated', onPresenceUpdated);
      socket.off('typing_updated', onTypingUpdated);
      socket.off('reaction_added', onReactionUpdate);
      socket.off('reaction_removed', onReactionUpdate);
      socket.off('message_pinned', onMessagePinned);
      socket.off('message_unpinned', onMessageUnpinned);
      socket.off('connect', onReconnect);
      setTyping(false);
      if (remoteTypingTimer.current) clearTimeout(remoteTypingTimer.current);
    };
    // Only the chat id (and who is signed in) restarts this; it used to load three times per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Resolve other user ID for DM features
  useEffect(() => {
    if (!conversation || !user) return;
    if (conversation.type === 'dm') {
      try {
        const ids = JSON.parse(conversation.participant_ids || '[]');
        const other = ids.find(uid => String(uid) !== String(user.id));
        setOtherUserId(other || null);
      } catch { /* ignore */ }
    }
  }, [conversation, user]);

  // Check block status + presence when other user resolves
  useEffect(() => {
    if (!otherUserId) return;
    client.get(`/api/messages/block/${otherUserId}`)
      .then(r => setIsBlocked(r.data.blocked))
      .catch(() => {});
    const fetchPresence = () => {
      client.get(`/api/messages/presence/${otherUserId}`)
        .then(r => setPresence({ status: r.data.status, last_seen: r.data.last_seen || null }))
        .catch(() => {});
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, [otherUserId]);

  // Load the partner avatar independently of the conversation record. Older
  // conversations do not contain profile media, which used to leave only an
  // initial in the chat header.
  useEffect(() => {
    if (!otherUserId) { setOtherProfile(null); return; }
    let cancelled = false;
    client.get(`/api/profiles?user_id=${otherUserId}&limit=1`)
      .then(({ data }) => {
        const profile = Array.isArray(data) ? data[0] : data?.data?.[0];
        if (!cancelled) setOtherProfile(profile || null);
      })
      .catch(() => { if (!cancelled) setOtherProfile(null); });
    return () => { cancelled = true; };
  }, [otherUserId]);

  // Load pinned message IDs for this conversation
  useEffect(() => {
    if (!id) return;
    client.get(`/api/messages/conversations/${id}/pins`)
      .then(r => setPinnedMsgs(new Set((r.data as Array<{ message_id: string }>).map(p => p.message_id))))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (nearBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  // Focus input when reply/edit changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [replyingTo, editingMsg]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (editingMsg) { await handleSaveEdit(); return; }
    const content = (textRef.current || text).trim();
    if (!content) return;

    // Use conversation id from state as final fallback if params not yet hydrated
    const convId = id || conversation?.id;
    if (!convId) {
      toast.error('Chat not ready — please try again');
      return;
    }

    const replyId = replyingTo?.id || null;
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: convId,
      sender_id: user?.id,
      sender_name: user?.full_name || 'You',
      content,
      type: 'text',
      created_at: new Date().toISOString(),
      edited: false,
      reply_to_id: replyId,
      _temp: true,
    };

    // ── Offline path ───────────────────────────────────────────────────
    if (!navigator.onLine) {
      const pendingBubble = { ...tempMsg, _pending: true };
      setMessages(prev => [...prev, pendingBubble]);
      setText('');
      textRef.current = '';
      setReplyingTo(null);

      enqueuePendingMessage({
        conversationId: convId,
        content,
        type: 'text',
        replyToId: replyId,
        createdAt: pendingBubble.created_at,
      }).then((queuedId) => {
        // Replace the temp id with the durable queue id so we can remove it
        // from both the messages list and the queue when it is eventually sent.
        setMessages(prev =>
          prev.map(m => (m as { id: string }).id === tempId ? { ...pendingBubble, id: queuedId } : m),
        );
        setOfflineQueue(prev => [
          ...prev,
          {
            id: queuedId,
            conversationId: convId,
            content,
            type: 'text',
            replyToId: replyId,
            createdAt: pendingBubble.created_at,
          },
        ]);
      }).catch(() => {
        // Could not persist — leave as temp bubble, it will disappear on refresh
      });
      return;
    }

    // ── Online path (existing logic) ───────────────────────────────────
    // Optimistic update — add message to UI immediately
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    textRef.current = '';
    setReplyingTo(null);
    setSending(true);
    setTyping(false);

    try {
      const { data: sent } = await client.post(`/api/messages/conversations/${convId}/messages`, {
        content,
        type: 'text',
        ...(replyId ? { reply_to_id: replyId } : {}),
      });
      // Replace temp message with real one from server
      setMessages(prev => prev.map(m => m.id === tempId ? sent : m));
    } catch (err: unknown) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(content);
      textRef.current = content;
      const errMsg = apiErrorMessage(err, 'Failed to send');
      toast.error(errMsg);
      console.error('Send failed:', errMsg, err);
    }
    setSending(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Choose an image smaller than 10 MB');
      event.target.value = '';
      return;
    }
    const convId = id || conversation?.id;
    if (!convId) return;
    setUploadingImage(true);
    try {
      const url = await uploadFile(file);
      const { data: sent } = await client.post(`/api/messages/conversations/${convId}/messages`, {
        content: url,
        type: 'image',
      });
      setMessages(prev => prev.some(message => message.id === sent.id) ? prev : [...prev, sent]);
    } catch {
      toast.error('Could not send the picture. Please try again.');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const startEdit = (msg) => {
    setEditingMsg(msg);
    setEditText(msg.content);
    setReplyingTo(null);
    setHoveredMsg(null);
    setSelectedMsg(null);
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

  const handleForward = async (targetConvId: string) => {
    if (!forwardMsg) return;
    try {
      await client.post(`/api/messages/${forwardMsg.id}/forward`, {
        target_conversation_id: targetConvId,
      });
      toast.success('Message forwarded');
    } catch {
      toast.error('Failed to forward message');
    }
    setForwardMsg(null);
    setForwardSearch('');
  };

  // Load conversations for forward picker (lazy)
  useEffect(() => {
    if (forwardMsg && conversations.length === 0) {
      client.get('/api/messages/conversations').then(r => {
        setConversations(Array.isArray(r.data) ? r.data : []);
      }).catch(() => {});
    }
  }, [forwardMsg, conversations.length]);

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

  // ── Long-press / context menu helpers ────────────────────────────────────
  const startLongPress = (msg) => {
    longPressTimer.current = setTimeout(() => {
      // Haptic feedback on supported devices
      if (navigator?.vibrate) navigator.vibrate(40);
      setSelectedMsg(msg);
    }, 280);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const dismissContextMenu = () => {
    setSelectedMsg(null);
    setDeletingMsg(null);
  };
  const handleCopy = (msg) => {
    navigator.clipboard?.writeText(msg.content || '')
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Could not copy'));
    dismissContextMenu();
  };
  const handleContextReply = (msg) => {
    setReplyingTo(msg);
    setEditingMsg(null);
    setText('');
    dismissContextMenu();
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  const handleContextEdit = (msg) => {
    startEdit(msg);
    dismissContextMenu();
  };
  const handleContextDelete = (msg) => {
    dismissContextMenu();
    // Two-tap confirm via deletingMsg
    handleDelete(msg);
  };
  const handleContextForward = (msg) => {
    setForwardMsg(msg);
    dismissContextMenu();
  };
  const handleReact = async (msg: { id: string; conversation_id: string; reactions?: Record<string, number> }, emoji: string) => {
    dismissContextMenu();
    try {
      const { data } = await client.post(`/api/messages/messages/${msg.id}/reactions`, { emoji });
      setMessages((prev: unknown[]) => prev.map((m: unknown) => {
        const message = m as { id: string };
        return message.id === msg.id ? { ...message, reactions: (data as { reactions: Record<string, number> }).reactions } : m;
      }));
    } catch { toast.error('Failed to add reaction'); }
  };
  const handlePin = async (msg: { id: string }) => {
    dismissContextMenu();
    try {
      if (pinnedMsgs.has(msg.id)) {
        await client.delete(`/api/messages/messages/${msg.id}/pin`);
        setPinnedMsgs(prev => { const s = new Set(prev); s.delete(msg.id); return s; });
        toast.success('Unpinned');
      } else {
        await client.post(`/api/messages/messages/${msg.id}/pin`);
        setPinnedMsgs(prev => new Set([...prev, msg.id]));
        toast.success('Pinned message');
      }
    } catch { toast.error('Failed to update pin'); }
  };
  const handleSave = async (msg: { id: string }) => {
    dismissContextMenu();
    try {
      if (savedMsgs.has(msg.id)) {
        await client.delete(`/api/messages/saved/${msg.id}`);
        setSavedMsgs(prev => { const s = new Set(prev); s.delete(msg.id); return s; });
        toast.success('Removed from saved');
      } else {
        await client.post(`/api/messages/saved/${msg.id}`);
        setSavedMsgs(prev => new Set([...prev, msg.id]));
        toast.success('Added to saved messages');
      }
    } catch { toast.error('Failed to update saved'); }
  };
  const handleTranslate = async (msg) => {
    dismissContextMenu();
    try {
      const { data } = await client.post('/api/messages/translate', { text: msg.content });
      toast(data.translated || 'Translation unavailable', { duration: 6000 });
    } catch { toast.error('Translation not available'); }
  };
  const handleCopyLink = (msg) => {
    const url = `${window.location.origin}/messages/${id}?msg=${msg.id}`;
    navigator.clipboard?.writeText(url)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Could not copy link'));
    dismissContextMenu();
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
    // DM — show online or last seen
    return otherTyping ? 'typing…' : formatLastSeen(presence);
  };

  const isOnline  = isUserOnline(presence);
  const isAdmin   = conversation?.admin_id === user?.id;
  const isChannel = conversation?.type === 'channel';
  const isGroup   = conversation?.type === 'group';
  const isDm      = conversation?.type === 'dm';
  const canSend   = !isBlocked && (!isChannel || isAdmin);

  // Group messages by date
  const grouped = (() => {
    const groups: Record<string, unknown[]> = {};
    messages.forEach(msg => {
      const key = fmtDate(parseISO(msg.created_at), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return Object.entries(groups);
  })();

  const dateLabel = (key: string) => {
    const d = parseISO(key);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return fmtLongDate(d);
  };

  const avatarLetter = getDisplayName().charAt(0).toUpperCase();
  const otherAvatarUrl = Array.isArray(otherProfile?.avatar_url)
    ? otherProfile.avatar_url[0]
    : otherProfile?.avatar_url;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] overflow-hidden">
      <span className="sr-only" aria-live="polite">{liveAnnouncement}</span>

      {/* Header */}
      <div data-page-guide="chat-header" className="px-2 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 shrink-0 shadow-sm z-10 bg-primary">
        <button onClick={handleBack} aria-label="Back" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar — clickable → profile (DM only) */}
        <div
          className={`relative shrink-0 ${isDm && otherUserId ? 'cursor-pointer' : ''}`}
          onClick={() => { if (isDm && otherUserId) router.push(`/profile/${otherUserId}`); }}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-semibold bg-white/20">
            {isChannel ? <Radio className="w-5 h-5" /> : isGroup ? <Users className="w-5 h-5" /> : (
              <SafeImage src={otherAvatarUrl} alt={getDisplayName()} className="h-full w-full object-cover" fallback={avatarLetter} />
            )}
          </div>
          {isDm && isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full" />
          )}
        </div>

        <div
          className={`flex-1 min-w-0 ${isDm && otherUserId ? 'cursor-pointer' : ''}`}
          onClick={() => { if (isDm && otherUserId) router.push(`/profile/${otherUserId}`); }}
        >
          <p className="text-sm font-semibold text-white truncate">{getDisplayName()}</p>
          <p className={`text-xs truncate ${isOnline && isDm ? 'text-green-300 font-medium' : 'text-white/70'}`}>
            {getSubtitle()}
          </p>
        </div>

        {/* Search button */}
        <button
          onClick={() => setShowSearch(true)}
          aria-label="Search messages"
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* "..." menu */}
        <div className="relative">
          <button onClick={() => setHeaderMenuOpen(v => !v)} aria-label="More options" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0">
            <MoreVertical className="w-5 h-5" />
          </button>          {headerMenuOpen && (
            <div className="absolute top-full end-0 mt-1 w-52 bg-card rounded-2xl shadow-lg border border-border/30 z-50 overflow-hidden">
              {/* DM: View Profile */}
              {isDm && otherUserId && (
                <button
                  onClick={() => { setHeaderMenuOpen(false); router.push(`/profile/${otherUserId}`); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-secondary/50 transition-colors text-left"
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" /> View Profile
                </button>
              )}
              {/* Group/Channel: Members (admin) */}
              {(isGroup || isChannel) && (
                <button
                  onClick={() => { setHeaderMenuOpen(false); router.push(`/messages/${id}/members`); }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-secondary/50 transition-colors text-left"
                >
                  <Users className="w-4 h-4 text-muted-foreground" /> Members
                </button>
              )}
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
      <div className="relative flex-1 overflow-hidden">
        <div
          data-page-guide="chat-messages"
          className="h-full overflow-y-auto px-3 py-4 space-y-0.5 bg-[hsl(var(--chat-bg))]"
          role="log"
          aria-label="Conversation messages"
          onScroll={handleMessagesScroll}
          onClick={() => { setHeaderMenuOpen(false); setHoveredMsg(null); dismissContextMenu(); }}
        >
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {!loading && grouped.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="bg-card shadow-sm rounded-2xl px-6 py-3 text-center">
                <p className="text-sm text-foreground/80">
                  {isBlocked ? 'You have blocked this user.' : 'No messages yet. Say hello!'}
                </p>
              </div>
            </div>
          )}

          {grouped.map(([dateKey, msgs]) => (
            <div key={dateKey}>
              <div className="flex justify-center my-3">
                <span className="bg-card text-muted-foreground shadow-sm text-xs font-medium px-3 py-1 rounded-full">
                  {dateLabel(dateKey)}
                </span>
              </div>

              {(msgs as any[]).map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                const prev = msgs[idx - 1] as any;
                const showSender = (isGroup || isChannel) && !isMe && (!prev || prev.sender_id !== msg.sender_id);
                const isHovered  = hoveredMsg === msg.id;
                const isConfirming = deletingMsg?.id === msg.id;
                const isPending = Boolean((msg as { _pending?: boolean })._pending);

                return (
                  <div
                    key={msg.id}
                    className={cn('flex mb-0.5 items-end gap-1.5', isMe ? 'justify-end' : 'justify-start')}
                    onMouseEnter={() => setHoveredMsg(msg.id)}
                    onMouseLeave={() => setHoveredMsg(null)}
                    onTouchStart={(e) => { e.stopPropagation(); startLongPress(msg); }}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedMsg(msg); }}
                  >
                    {/* Leading avatar/spacer for incoming group + channel messages */}
                    {!isMe && (isGroup || isChannel) && (
                      showSender ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 bg-primary">
                          {String(msg.sender_name || '?').charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-8 shrink-0" />
                      )
                    )}

                    <div className={cn('relative group flex flex-col gap-0.5 max-w-[75%] md:max-w-[60%]', isMe ? 'items-end' : 'items-start')}>
                      {/* Desktop hover quick-actions (hidden on touch screens) */}
                      {isHovered && !selectedMsg && (
                        <div className={cn('hidden sm:flex absolute top-0 items-center gap-1 z-10', isMe ? 'end-full me-2' : 'start-full ms-2')}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleContextReply(msg); }}
                            className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 flex items-center justify-center transition-colors"
                            title="Reply"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleContextForward(msg); }}
                            className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 flex items-center justify-center transition-colors"
                            title="Forward"
                          >
                            <Forward className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          {isMe && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleContextEdit(msg); }}
                              className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 flex items-center justify-center transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5 text-foreground" />
                            </button>
                          )}
                          {isMe && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleContextDelete(msg); }}
                              className={cn('w-7 h-7 rounded-full flex items-center justify-center transition-colors border', isConfirming ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white' : 'bg-secondary/80 hover:bg-secondary border-border/50 text-foreground')}
                              title={isConfirming ? 'Click again to confirm delete' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          'text-sm shadow-sm select-none rounded-2xl',
                          msg.type === 'image' ? 'p-1' : 'px-3 py-1.5',
                          isMe ? 'rounded-br-md bg-primary/15 dark:bg-primary/25' : 'rounded-bl-md bg-card',
                          selectedMsg?.id === msg.id && 'ring-2 ring-primary/50 scale-[0.98]',
                          'transition-transform animate-bubble-in',
                        )}
                        style={isPending ? { opacity: 0.5 } : undefined}
                      >
                        {showSender && (
                          <p className="text-xs font-semibold mb-0.5 text-primary">
                            {msg.sender_name}
                          </p>
                        )}

                        {/* Reply quote */}
                        {msg.reply_to_id && (
                          <div className={cn('border-s-2 ps-2 mb-1 rounded-s', isMe ? 'border-amber-500' : 'border-blue-400')}>
                            <p className="text-[10px] text-muted-foreground italic truncate">
                              {messages.find(m => m.id === msg.reply_to_id)?.content || 'Quoted message'}
                            </p>
                          </div>
                        )}

                        {msg.type === 'image' ? (
                          <SafeImage fill={false} src={msg.content} alt="Shared image" width={320} height={240} className="block max-h-72 w-full h-auto rounded-xl object-cover cursor-zoom-in" onClick={() => setFullscreenImage(msg.content)} />
                        ) : msg.type === 'product' ? (
                          <ProductMessageBubble metadata={(msg as { metadata?: Record<string, unknown> }).metadata ?? {}} isMe={isMe} />
                        ) : msg.type === 'order_update' ? (
                          <OrderUpdateBubble metadata={(msg as { metadata?: Record<string, unknown> }).metadata ?? {}} isMe={isMe} />
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        )}

                        <div className={cn('flex items-center justify-end gap-1', msg.type === 'image' ? 'px-2 pb-1' : 'mt-0.5 -mb-0.5')}>
                          {msg.edited && (
                            <span className="text-[10px] text-muted-foreground italic">edited</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {fmtTime(msg.created_at)}
                          </span>
                          {isMe && (isPending
                            ? <span className="text-[10px]" aria-label="Pending">⏳</span>
                            : <MessageTicks tick={tickFor(msg, user?.id, members)} />
                          )}
                        </div>
                      </div>
                      {Object.keys((msg as { reactions?: Record<string, number> }).reactions ?? {}).length > 0 && (
                        <MessageReactions
                          reactions={(msg as { reactions: Record<string, number> }).reactions}
                          messageId={(msg as { id: string }).id}
                          onReact={(emoji) => handleReact(msg, emoji)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {otherTyping && (
            <div className="flex justify-start mb-0.5" aria-live="polite">
              <div className="bg-card rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="sr-only">typing…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {showScrollBtn && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            className="absolute bottom-4 end-4 z-10 size-11 rounded-full bg-card shadow-lg border border-border flex items-center justify-center"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Input area */}
      {!canSend ? (
        <div className="bg-card border-t border-border/30 px-4 py-4 flex items-center justify-center shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            {isBlocked ? '🚫 You have blocked this user.' : '🔊 Only admins can post in this channel.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border-t border-border/30 shrink-0">
          {/* Reply preview */}
          {replyingTo && !editingMsg && (
            <div className="flex items-start gap-2 px-4 py-2 border-b border-border/20 bg-secondary/30">
              <div className="border-s-2 border-primary ps-2 flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">Reply to {replyingTo.sender_name || 'message'}</p>
                <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} aria-label="Cancel reply" className="inline-flex min-h-8 size-8 items-center justify-center rounded hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Edit mode banner */}
          {editingMsg && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20 bg-amber-50 dark:bg-amber-900/20">
              <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex-1">Editing message</p>
              <button onClick={() => { setEditingMsg(null); setEditText(''); }} aria-label="Cancel edit" className="inline-flex min-h-8 size-8 items-center justify-center rounded hover:bg-amber-100 dark:hover:bg-amber-900/30">
                <X className="w-4 h-4 text-amber-600 dark:text-amber-300" />
              </button>
            </div>
          )}

          {/* Text input row */}
          <div className="px-3 py-2 flex items-end gap-2 sm:px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button data-page-guide="chat-attachments" type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage || sending} className="h-11 w-11 shrink-0 rounded-full text-primary hover:bg-primary/10 disabled:opacity-40" aria-label="Attach image">
              {uploadingImage ? <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" /> : <ImagePlus className="mx-auto h-5 w-5" />}
            </button>
            <div data-page-guide="chat-input" className="flex-1 bg-secondary rounded-2xl px-4 py-2 flex items-center min-h-11 border border-transparent focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10">
              <textarea
                ref={inputRef}
                value={editingMsg ? editText : text}
                onChange={e => {
                  if (editingMsg) {
                    setEditText(e.target.value);
                  } else {
                    setText(e.target.value);
                    textRef.current = e.target.value;
                    setTyping(e.target.value.trim().length > 0);
                    if (typingTimer.current) clearTimeout(typingTimer.current);
                    typingTimer.current = setTimeout(() => setTyping(false), 1500);
                  }
                  const el = inputRef.current;
                  if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 96) + 'px'; }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  if (e.key === 'Escape') {
                    if (editingMsg) { setEditingMsg(null); setEditText(''); }
                    if (replyingTo) setReplyingTo(null);
                  }
                }}
                placeholder={editingMsg ? 'Edit message...' : 'Message'}
                rows={1}
                className="flex-1 bg-transparent text-sm outline-none resize-none max-h-24 self-center leading-5"
                style={{ minHeight: '20px' }}
              />
            </div>
            <button
              onClick={handleSend}
              aria-label={editingMsg ? 'Save edit' : 'Send message'}
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center text-primary-foreground shrink-0 transition-transform active:scale-90 outline-none focus:outline-none bg-primary',
                (!(editingMsg ? editText.trim() : text.trim()) || sending) ? 'opacity-40' : 'opacity-100',
              )}
            >
              {editingMsg ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ── Message Context Menu — Telegram style ───────────────────────── */}
    {selectedMsg && (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[3px]" onClick={dismissContextMenu} />

        {/* Sheet — slides up from bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-[61] animate-in slide-in-from-bottom-4 duration-200">
          <div
            className="max-w-lg mx-auto rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto bg-card text-foreground"
          >
            {/* ── Message preview strip ── */}
            <div
              className="px-4 pt-4 pb-3 mx-4 mt-4 mb-1 rounded-2xl text-sm line-clamp-2"
              style={{
                backgroundColor: selectedMsg.sender_id === user?.id
                  ? 'hsl(var(--primary)/0.15)'
                  : 'hsl(var(--secondary))',
                color: 'hsl(var(--foreground))',
              }}
            >
              {selectedMsg.type === 'image'
                ? '📷 Photo'
                : selectedMsg.content}
            </div>

            {/* ── Emoji reaction row ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
              {['❤️','👏','👍','👎','🔥','🤩','😂'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReact(selectedMsg, emoji)}
                  className="text-2xl active:scale-125 transition-transform hover:scale-110 select-none"
                  style={{ lineHeight: 1 }}
                >
                  {emoji}
                </button>
              ))}
              {/* More reactions */}
              <button
                onClick={() => toast('More reactions coming soon')}
                className="size-11 rounded-full flex items-center justify-center text-lg transition-colors bg-secondary"
              >
                ＋
              </button>
            </div>

            {/* ── Action list ── */}
            <div className="py-1">
              {/* Reply */}
              <CtxItem icon={<CornerUpLeft className="w-5 h-5" />} label="Reply"
                onClick={() => handleContextReply(selectedMsg)} />

              {/* Copy */}
              {selectedMsg.type !== 'image' && (
                <CtxItem icon={<Copy className="w-5 h-5" />} label="Copy"
                  onClick={() => handleCopy(selectedMsg)} />
              )}

              {/* Copy Link */}
              <CtxItem icon={<UserCircle className="w-5 h-5" />} label="Copy Link"
                onClick={() => handleCopyLink(selectedMsg)} />

              {/* Forward */}
              <CtxItem icon={<Forward className="w-5 h-5" />} label="Forward"
                onClick={() => handleContextForward(selectedMsg)} />

              {/* Save */}
              <CtxItem
                icon={<Bookmark className="w-5 h-5" />}
                label={savedMsgs.has(selectedMsg.id) ? 'Remove from saved' : 'Add to saved messages'}
                onClick={() => handleSave(selectedMsg)}
              />

              {/* Pin */}
              <CtxItem
                icon={<Pin className="w-5 h-5" />}
                label={pinnedMsgs.has(selectedMsg.id) ? 'Unpin' : 'Pin'}
                onClick={() => handlePin(selectedMsg)}
              />

              {/* Translate */}
              {selectedMsg.type !== 'image' && (
                <CtxItem icon={<Languages className="w-5 h-5" />} label="Translate"
                  onClick={() => handleTranslate(selectedMsg)} />
              )}

              {/* Edit — own text only */}
              {selectedMsg.sender_id === user?.id && selectedMsg.type !== 'image' && (
                <CtxItem icon={<Pencil className="w-5 h-5" />} label="Edit"
                  onClick={() => handleContextEdit(selectedMsg)} />
              )}

              {/* Delete — own messages, destructive */}
              {selectedMsg.sender_id === user?.id && (
                <CtxItem
                  icon={<Trash2 className="w-5 h-5" />}
                  label={deletingMsg?.id === selectedMsg.id ? 'Tap again to confirm delete' : 'Delete'}
                  onClick={() => {
                    const confirming = deletingMsg?.id === selectedMsg.id;
                    handleContextDelete(selectedMsg);
                    if (confirming) dismissContextMenu();
                  }}
                  destructive
                />
              )}
            </div>

            {/* Safe area */}
            <div className="pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      </>
    )}

    {/* ── Forward Message Modal ─────────────────────────────────────────── */}
    {forwardMsg && (
      <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
        <div role="dialog" aria-label="Forward message" className="h-full sm:h-auto sm:max-h-[90vh] w-full sm:max-w-sm rounded-none sm:rounded-2xl bg-card shadow-xl border border-border/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Forward className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm">Forward message</p>
            </div>
            <button onClick={() => { setForwardMsg(null); setForwardSearch(''); }}
              aria-label="Close forward" className="size-9 min-h-9 rounded-full hover:bg-secondary transition-colors flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {/* Preview of message being forwarded */}
          <div className="mx-4 mt-3 bg-secondary/50 rounded-xl px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Forwarding</p>
            <p className="text-sm line-clamp-2">{forwardMsg.content}</p>
          </div>
          {/* Search */}
          <div className="px-4 pt-3">
            <input
              value={forwardSearch}
              onChange={e => setForwardSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full text-sm bg-secondary/50 rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          {/* Conversation list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5">
            {conversations
              .filter(c => c.id !== (id || conversation?.id))
              .filter(c => {
                if (!forwardSearch) return true;
                const name = c.name || c.participant_names || '';
                return name.toLowerCase().includes(forwardSearch.toLowerCase());
              })
              .map(c => {
                const dispName = c.type === 'group' || c.type === 'channel'
                  ? (c.name || c.type)
                  : (() => {
                      try {
                        const names = JSON.parse(c.participant_names || '[]');
                        const ids = JSON.parse(c.participant_ids || '[]');
                        const idx = ids.indexOf(user?.id);
                        return names[idx === 0 ? 1 : 0] || names[0] || 'Chat';
                      } catch { return 'Chat'; }
                    })();
                return (
                  <button key={c.id} onClick={() => handleForward(c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ background: c.type === 'channel' ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : c.type === 'group' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,var(--ex-blue),var(--ex-purple))' }}>
                      {dispName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{dispName}</p>
                      {c.last_message && <p className="text-xs text-muted-foreground truncate">{c.last_message}</p>}
                    </div>
                  </button>
                );
              })}
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No other conversations</p>
            )}
          </div>
        </div>
      </div>
    )}
    {fullscreenImage && (
      <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center" role="dialog" aria-label="Image preview" onClick={() => setFullscreenImage(null)}>
        <SafeImage fill={false} src={fullscreenImage} alt="Image preview" className="max-h-full max-w-full object-contain" />
        <button type="button" onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }} aria-label="Close image preview" className="absolute top-4 end-4 size-11 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
          <X className="w-5 h-5" />
        </button>
      </div>
    )}
    {showSearch && (
      <MessageSearch conversationId={id} onClose={() => setShowSearch(false)} />
    )}
    </>
  );
}

/* ── Context menu row item ──────────────────────────────────────────────── */
function CtxItem({ icon, label, onClick, destructive = false }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('flex items-center gap-4 w-full px-5 py-3.5 text-sm font-medium text-left hover:bg-secondary/60 active:scale-[0.98]', destructive && 'text-destructive')}
    >
      <span className={destructive ? 'text-destructive' : 'text-muted-foreground'}>{icon}</span>
      {label}
    </button>
  );
}

export default function ChatRoomPage() {
  return <ErrorBoundary><ChatRoom /></ErrorBoundary>;
}
