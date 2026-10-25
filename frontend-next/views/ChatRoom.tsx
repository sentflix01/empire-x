'use client';
/**
 * One chat. Pieces live in components/messaging (header, list, bubble,
 * actions, composer); this screen holds the chat's data and live updates.
 *
 * Phones: a full-screen layer sized to the visible area (useChatViewport).
 * Tablets and computers: the right-hand pane beside the chat list.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  UserCircle, BellOff, Bell, Archive, ArchiveRestore, ShieldOff, Flag, Trash2, LogOut, Users, Radio,
} from 'lucide-react';
import client from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { getSocket, joinConversation, leaveConversation } from '@/lib/socket';
import { applyReceipt, tickFor, type MemberReadState } from '@/lib/readReceipts';
import { reactedByMe, type MessageReactionMap } from '@/components/messaging/MessageReactions';
import ChatHeader, { type HeaderMenuItem } from '@/components/messaging/ChatHeader';
import MessageList from '@/components/messaging/MessageList';
import MessageBubble from '@/components/messaging/MessageBubble';
import MessageActions from '@/components/messaging/MessageActions';
import Composer, { type ComposerHandle } from '@/components/messaging/Composer';
import ChoiceDialog, { type Choice } from '@/components/messaging/ChoiceDialog';
import ForwardDialog from '@/components/messaging/ForwardDialog';
import MessageSearch from '@/components/messaging/MessageSearch';
import QuickReplies from '@/components/messaging/QuickReplies';
import PinnedBar, { pinPreviewText, type PinnedPreview } from '@/components/messaging/PinnedBar';
import PhotoViewer from '@/components/feed/PhotoViewer';
import UserIdentity from '@/components/ui/UserIdentity';
import ErrorBoundary from '@/components/ErrorBoundary';
import { formatLastSeen, isUserOnline, type PresenceData } from '@/lib/presence';
import { useChatPresence } from '@/lib/useChatPresence';
import { useChatViewport } from '@/lib/useChatViewport';
import { uploadFile } from '@/lib/uploadFile';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { chatTitle, chatAvatar, chatOtherUserId, isCustomerSide, isGroupLike, type ChatSummary } from '@/lib/chatDisplay';
import { messagePreview, type ChatMessage } from '@/lib/chatRules';
import {
  enqueuePendingMessage, removePendingMessage, getPendingMessages, getAllPendingMessages,
} from '@/lib/messageSendQueue';

const PAGE = 50;
/** Queued (offline) messages being sent right now, so two "back online" signals don't send one twice. */
const flushing = new Set<string>();
const MAX_PINS = 3;
const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type Conversation = ChatSummary & {
  created_at?: string;
  admin_id?: string;
  my_role?: string | null;
  is_request?: boolean;
  muted?: boolean;
  archived_at?: string | null;
  last_read_at?: string | null;
  members?: Array<MemberReadState & { display_name?: string; role?: string }>;
};

type Dialog =
  | { kind: 'mute' }
  | { kind: 'report-message'; message: ChatMessage }
  | { kind: 'report-chat' }
  | { kind: 'delete-chat' }
  | { kind: 'leave' }
  | { kind: 'block' };

const REPORT_REASONS: Choice[] = [
  { label: 'Spam or scam', value: 'spam' },
  { label: 'Harassment or hate', value: 'harassment' },
  { label: 'Inappropriate content', value: 'inappropriate' },
  { label: 'Something else', value: 'other' },
];

function mergeById(list: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) seen.set(m.id, { ...seen.get(m.id), ...m });
  return [...seen.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function ChatRoom() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const router = useRouter();
  const { user } = useAuth();
  const me = user?.id ? String(user.id) : null;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useChatViewport();
  useChatPresence(Boolean(user));

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberReadState[]>([]);
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [otherProfile, setOtherProfile] = useState<Record<string, unknown> | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [pins, setPins] = useState<string[]>([]);
  const [pinTexts, setPinTexts] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [newWhileAway, setNewWhileAway] = useState(0);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const composer = useRef<ComposerHandle | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherIdRef = useRef<string | null>(null);

  const isDm = conversation?.type === 'dm';
  const isChannel = conversation?.type === 'channel';
  const groupLike = conversation ? isGroupLike(conversation) : false;
  const customerSide = conversation ? isCustomerSide(conversation) : false;
  const otherUserId = conversation ? chatOtherUserId(conversation, me) : null;
  useEffect(() => { otherIdRef.current = otherUserId; }, [otherUserId]);
  const isAdmin = conversation?.my_role === 'admin' || (Boolean(me) && String(conversation?.admin_id) === me);
  const canSend = !isBlocked && (!isChannel || isAdmin);

  // ── Loading ───────────────────────────────────────────────────────────────
  const markRead = useCallback(() => {
    if (!id || document.visibilityState !== 'visible') return;
    client.post(`/api/messages/conversations/${id}/read`).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    // Switching chats: drop the previous chat's messages straight away.
    setMessages((prev) => prev.filter((m) => m.conversation_id === id));
    (async () => {
      try {
        const [{ data: conv }, { data: rows }] = await Promise.all([
          client.get(`/api/messages/conversations/${id}`),
          client.get(`/api/messages/conversations/${id}/messages`, { params: { limit: PAGE } }),
        ]);
        if (cancelled) return;
        const list: ChatMessage[] = Array.isArray(rows) ? rows : [];
        setConversation(conv as Conversation);
        setMembers(Array.isArray(conv?.members) ? conv.members : []);
        setHasOlder(list.length >= PAGE);
        // Where your unread part starts, before this visit marks everything read.
        const lastRead = conv?.last_read_at ? new Date(conv.last_read_at).getTime() : null;
        const firstUnread = lastRead === null ? null
          : list.find((m) => String(m.sender_id) !== String(me) && new Date(m.created_at).getTime() > lastRead);
        setFirstUnreadId(firstUnread?.id ?? null);
        const pending = await getPendingMessages(id).catch(() => []);
        // Keep anything sent while the chat was still loading (it would vanish otherwise).
        setMessages((prev) => mergeById(mergeById(list, pending.map((p) => ({
          id: p.id, conversation_id: p.conversationId, sender_id: me, content: p.content, type: p.type,
          created_at: p.createdAt, reply_to_id: p.replyToId, _temp: true, _pending: true,
        }))), prev.filter((m) => m.conversation_id === id)));
        markRead();
      } catch (err) {
        if (!cancelled) setNotFound(apiErrorMessage(err, 'This chat could not be opened.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    client.get(`/api/messages/conversations/${id}/pins`)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data as Array<{ message_id: string; content?: unknown; type?: string }> : [];
        setPins(rows.map((p) => p.message_id));
        setPinTexts(Object.fromEntries(rows.map((p) => [p.message_id, pinPreviewText(p)])));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [id, me, markRead]);

  const loadOlder = useCallback(async () => {
    const oldest = messages.find((m) => !m._temp);
    if (!id || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const { data } = await client.get(`/api/messages/conversations/${id}/messages`, { params: { limit: PAGE, before: oldest.created_at } });
      const older: ChatMessage[] = Array.isArray(data) ? data : [];
      setHasOlder(older.length >= PAGE);
      setMessages((prev) => mergeById(prev, older));
    } catch { toast.error('Could not load earlier messages'); }
    finally { setLoadingOlder(false); }
  }, [id, messages, loadingOlder]);

  // The other person: profile picture, presence and whether you blocked them.
  useEffect(() => {
    if (!otherUserId) return;
    let cancelled = false;
    client.get(`/api/messages/block/${otherUserId}`).then((r) => { if (!cancelled) setIsBlocked(Boolean(r.data?.blocked)); }).catch(() => undefined);
    client.get('/api/profiles', { params: { user_id: otherUserId, limit: 1 } })
      .then(({ data }) => { if (!cancelled) setOtherProfile((Array.isArray(data) ? data[0] : data?.data?.[0]) ?? null); })
      .catch(() => undefined);
    const fetchPresence = () => client.get(`/api/messages/presence/${otherUserId}`)
      .then((r) => { if (!cancelled) setPresence({ status: r.data.status, last_seen: r.data.last_seen || null }); })
      .catch(() => undefined);
    void fetchPresence();
    const t = setInterval(fetchPresence, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [otherUserId]);

  // ── Live updates ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    joinConversation(id);
    let typingOff: ReturnType<typeof setTimeout> | null = null;

    const onNew = (msg: ChatMessage) => {
      if (msg.conversation_id !== id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const withoutTemp = prev.filter((m) => !(m._temp && !m._failed && String(m.sender_id) === String(msg.sender_id) && m.content === msg.content));
        return [...withoutTemp, msg];
      });
      if (String(msg.sender_id) !== String(me)) {
        setNewWhileAway((n) => n + 1);
        setOtherTyping(false);
        if (document.visibilityState === 'visible') {
          markRead();
          setAnnouncement(`${msg.sender_name || 'New message'}: ${messagePreview(msg)}`);
        }
      }
    };
    const onEdited = (msg: ChatMessage) => { if (msg.conversation_id === id) setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))); };
    const onDeleted = (p: { id?: string; message_id?: string }) => {
      const gone = p.id || p.message_id;
      setMessages((prev) => prev.filter((m) => m.id !== gone));
    };
    const onHidden = (p: { message_id?: string }) => setMessages((prev) => prev.filter((m) => m.id !== p.message_id));
    const onReceipt = (e: { conversation_id?: string; user_id: string; last_read_at?: string; last_delivered_at?: string }) => {
      if (e?.conversation_id === id) setMembers((prev) => applyReceipt(prev, e));
    };
    const onPresence = (u: { user_id?: string; status: PresenceData['status']; last_seen?: string }) => {
      if (u?.user_id && String(u.user_id) === String(otherIdRef.current)) setPresence({ status: u.status, last_seen: u.last_seen || null });
    };
    const onTyping = (u: { conversation_id?: string; user_id?: string; is_typing?: boolean }) => {
      if (u?.conversation_id !== id || String(u.user_id) === String(me)) return;
      setOtherTyping(Boolean(u.is_typing));
      if (typingOff) clearTimeout(typingOff);
      if (u.is_typing) typingOff = setTimeout(() => setOtherTyping(false), 4000);
    };
    const onReaction = (p: { message_id: string; reactions: MessageReactionMap }) => {
      setMessages((prev) => prev.map((m) => (m.id === p.message_id ? { ...m, reactions: p.reactions } : m)));
    };
    const onPinned = (p: { message_id: string; conversation_id: string }) => { if (p.conversation_id === id) setPins((prev) => [p.message_id, ...prev.filter((x) => x !== p.message_id)]); };
    const onUnpinned = (p: { message_id: string; conversation_id: string }) => { if (p.conversation_id === id) setPins((prev) => prev.filter((x) => x !== p.message_id)); };
    // Members, roles or the name changed: reload them. If you were removed, the chat closes.
    const onMembers = (p: { conversation_id?: string }) => {
      if (p?.conversation_id !== id) return;
      client.get(`/api/messages/conversations/${id}`)
        .then(({ data }) => { setConversation(data as Conversation); setMembers(Array.isArray(data?.members) ? data.members : []); })
        .catch(() => { toast.info('You’re no longer in this chat'); router.push('/messages'); });
    };
    // Back online (the browser says so, or the live connection reconnects):
    // send what was queued, once each, and fetch anything missed while away.
    const onConnect = () => {
      getAllPendingMessages().then((queued) => queued.forEach((q) => {
        if (flushing.has(q.id)) return;
        flushing.add(q.id);
        client.post(`/api/messages/conversations/${q.conversationId}/messages`, { content: q.content, type: q.type, ...(q.replyToId ? { reply_to_id: q.replyToId } : {}) })
          .then(({ data }) => {
            void removePendingMessage(q.id);
            if (q.conversationId === id) setMessages((prev) => mergeById(prev.filter((m) => m.id !== q.id), [data as ChatMessage]));
          })
          .catch(() => { flushing.delete(q.id); });
      })).catch(() => undefined);
      client.get(`/api/messages/conversations/${id}/messages`, { params: { limit: PAGE } })
        .then(({ data }) => { if (Array.isArray(data)) setMessages((prev) => mergeById(prev, data)); })
        .catch(() => undefined);
    };

    const events: Array<[string, (...a: never[]) => void]> = [
      ['new_message', onNew], ['message_edited', onEdited], ['message_deleted', onDeleted], ['message_hidden', onHidden],
      ['conversation_read', onReceipt], ['conversation_delivered', onReceipt], ['presence_updated', onPresence],
      ['typing_updated', onTyping], ['reaction_added', onReaction], ['reaction_removed', onReaction],
      ['message_pinned', onPinned], ['message_unpinned', onUnpinned], ['connect', onConnect], ['members_changed', onMembers],
    ];
    for (const [name, fn] of events) socket.on(name, fn as (...a: unknown[]) => void);
    const onVisible = () => { if (document.visibilityState === 'visible') markRead(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onConnect);
    return () => {
      window.removeEventListener('online', onConnect);
      leaveConversation(id);
      for (const [name, fn] of events) socket.off(name, fn as (...a: unknown[]) => void);
      document.removeEventListener('visibilitychange', onVisible);
      if (typingOff) clearTimeout(typingOff);
      socket.emit('typing', { conversationId: id, isTyping: false });
    };
  }, [id, me, markRead, router]);

  const setTyping = useCallback((typing: boolean) => {
    if (!id) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    getSocket().emit('typing', { conversationId: id, isTyping: typing });
  }, [id]);

  // ── Sending ───────────────────────────────────────────────────────────────
  const deliver = useCallback(async (temp: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, _failed: false } : m)));
    try {
      const { data } = await client.post(`/api/messages/conversations/${id}/messages`, {
        content: temp.content, type: temp.type ?? 'text', ...(temp.reply_to_id ? { reply_to_id: temp.reply_to_id } : {}),
      });
      setMessages((prev) => mergeById(prev.filter((m) => m.id !== temp.id), [data as ChatMessage]));
      // Replying to a message request accepts it.
      setConversation((c) => (c?.is_request ? { ...c, is_request: false } : c));
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, _failed: true } : m)));
      toast.error(apiErrorMessage(err, 'Message not sent'));
    }
  }, [id]);

  const send = useCallback(async (content: string, type: 'text' | 'image' = 'text', replyId?: string | null) => {
    if (!id) return;
    const temp: ChatMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, conversation_id: id, sender_id: me,
      sender_name: user?.full_name || 'You', content, type, created_at: new Date().toISOString(), reply_to_id: replyId ?? null, _temp: true,
    };
    setScrollSignal((n) => n + 1);
    setNewWhileAway(0);
    if (typeof navigator !== 'undefined' && !navigator.onLine && type === 'text') {
      setMessages((prev) => [...prev, { ...temp, _pending: true }]);
      const queuedId = await enqueuePendingMessage({ conversationId: id, content, type, replyToId: replyId ?? null, createdAt: temp.created_at }).catch(() => null);
      if (queuedId) setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, id: queuedId } : m)));
      return;
    }
    setMessages((prev) => [...prev, temp]);
    await deliver(temp);
  }, [id, me, user?.full_name, deliver]);

  const onSend = (text: string) => {
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    void send(text, 'text', replyId);
  };

  const onPickPhotos = async (files: File[]) => {
    const photos = files.filter((f) => f.type.startsWith('image/'));
    const tooBig = photos.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig.length) toast.error(`${tooBig.length === 1 ? 'One photo is' : `${tooBig.length} photos are`} larger than 10 MB and won't be sent`);
    const ok = photos.filter((f) => f.size <= MAX_PHOTO_BYTES).slice(0, MAX_PHOTOS);
    if (photos.length > MAX_PHOTOS) toast.info(`Up to ${MAX_PHOTOS} photos at a time`);
    if (!ok.length) return;
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    setUploading({ done: 0, total: ok.length });
    let failed = 0;
    let reason = '';
    for (let i = 0; i < ok.length; i++) {
      try {
        const url = await uploadFile(ok[i]);
        await send(url, 'image', i === 0 ? replyId : null);
      } catch (err) {
        failed++;
        // Say why (the server's reason), not only that it failed.
        reason ||= apiErrorMessage(err, '');
      }
      setUploading({ done: i + 1, total: ok.length });
    }
    setUploading(null);
    if (failed) toast.error(`${failed} photo${failed === 1 ? '' : 's'} couldn't be sent${reason ? `: ${reason}` : ''}`);
  };

  const onSaveEdit = async (text: string) => {
    const target = editing;
    if (!target) return;
    setEditing(null);
    try {
      const { data } = await client.put(`/api/messages/${target.id}`, { content: text });
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, ...(data as ChatMessage), content: text, edited: true } : m)));
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not edit the message')); }
  };

  // ── Message actions ───────────────────────────────────────────────────────
  const react = async (msg: ChatMessage, emoji: string, mine?: boolean) => {
    setActionsFor(null);
    const already = mine ?? reactedByMe((msg.reactions as MessageReactionMap | undefined)?.[emoji], me);
    try {
      const { data } = already
        ? await client.delete(`/api/messages/messages/${msg.id}/reactions`, { data: { emoji } })
        : await client.post(`/api/messages/messages/${msg.id}/reactions`, { emoji });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, reactions: (data as { reactions: MessageReactionMap }).reactions } : m)));
    } catch (err) { toast.error(apiErrorMessage(err, already ? 'Could not remove the reaction' : 'Could not add the reaction')); }
  };

  const togglePin = async (msg: ChatMessage) => {
    setActionsFor(null);
    const pinned = pins.includes(msg.id);
    if (!pinned && pins.length >= MAX_PINS) { toast.info(`You can pin up to ${MAX_PINS} messages. Unpin one first.`); return; }
    try {
      if (pinned) {
        await client.delete(`/api/messages/messages/${msg.id}/pin`);
        setPins((prev) => prev.filter((x) => x !== msg.id));
      } else {
        await client.post(`/api/messages/messages/${msg.id}/pin`);
        setPins((prev) => [msg.id, ...prev.filter((x) => x !== msg.id)]);
      }
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not update the pin')); }
  };

  const deleteMessage = async (msg: ChatMessage, scope: 'me' | 'everyone') => {
    setActionsFor(null);
    try {
      await client.delete(scope === 'everyone' ? `/api/messages/${msg.id}` : `/api/messages/${msg.id}/for-me`);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not delete the message')); }
  };

  const copy = (msg: ChatMessage) => {
    setActionsFor(null);
    navigator.clipboard?.writeText(msg.content ?? '').then(() => toast.success('Copied')).catch(() => toast.error('Could not copy'));
  };

  const forward = async (targetId: string) => {
    const msg = forwarding;
    setForwarding(null);
    if (!msg) return;
    try {
      await client.post(`/api/messages/${msg.id}/forward`, { target_conversation_id: targetId });
      toast.success('Forwarded');
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not forward the message')); }
  };

  const report = async (targetType: 'message' | 'user', targetId: string, reason: string) => {
    setDialog(null);
    try {
      await client.post('/api/moderation/report', { target_type: targetType, target_id: targetId, reason });
      toast.success('Thanks. We’ll review it.');
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not send the report')); }
  };

  // ── Chat menu ─────────────────────────────────────────────────────────────
  const leaveToInbox = () => router.push('/messages');
  const handleBack = () => {
    if (isExiting) return;
    if (reducedMotion || window.matchMedia?.('(min-width: 768px)').matches) { leaveToInbox(); return; }
    setIsExiting(true);
  };

  const setMute = async (duration: string) => {
    setDialog(null);
    try {
      const { data } = await client.put(`/api/messages/conversations/${id}/mute`, { duration });
      setConversation((c) => (c ? { ...c, muted: Boolean(data?.muted) } : c));
      toast.success(data?.muted ? 'Notifications muted' : 'Notifications on');
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not change notifications')); }
  };
  const setArchived = async (archived: boolean) => {
    try {
      await client.put(`/api/messages/conversations/${id}/archive`, { archived });
      toast.success(archived ? 'Chat archived' : 'Chat moved back to Chats');
      if (archived) leaveToInbox(); else setConversation((c) => (c ? { ...c, archived_at: null } : c));
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not update the chat')); }
  };
  const setBlocked = async (block: boolean) => {
    setDialog(null);
    if (!otherUserId) return;
    try {
      if (block) await client.post(`/api/messages/block/${otherUserId}`);
      else await client.delete(`/api/messages/block/${otherUserId}`);
      setIsBlocked(block);
      toast.success(block ? 'Blocked. They can’t message you.' : 'Unblocked');
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not update the block')); }
  };
  const deleteChat = async () => {
    setDialog(null);
    try { await client.delete(`/api/messages/conversations/${id}/for-me`); leaveToInbox(); }
    catch (err) { toast.error(apiErrorMessage(err, 'Could not delete the chat')); }
  };
  const leaveGroup = async () => {
    setDialog(null);
    try { await client.post(`/api/messages/conversations/${id}/leave`); leaveToInbox(); }
    catch (err) { toast.error(apiErrorMessage(err, 'Could not leave')); }
  };
  const acceptRequest = async () => {
    try {
      await client.post(`/api/messages/conversations/${id}/accept`);
      setConversation((c) => (c ? { ...c, is_request: false } : c));
    } catch (err) { toast.error(apiErrorMessage(err, 'Could not accept the request')); }
  };

  const profileHref = otherUserId ? (customerSide ? `/profile/${otherUserId}?view=business` : `/profile/${otherUserId}`) : null;
  const menu: HeaderMenuItem[] = [
    ...(isDm && profileHref ? [{ label: customerSide ? 'View business' : 'View profile', icon: <UserCircle className="h-4 w-4" />, onClick: () => router.push(profileHref) }] : []),
    conversation?.muted
      ? { label: 'Unmute notifications', icon: <Bell className="h-4 w-4" />, onClick: () => void setMute('off') }
      : { label: 'Mute notifications', icon: <BellOff className="h-4 w-4" />, onClick: () => setDialog({ kind: 'mute' }) },
    conversation?.archived_at
      ? { label: 'Unarchive', icon: <ArchiveRestore className="h-4 w-4" />, onClick: () => void setArchived(false) }
      : { label: 'Archive', icon: <Archive className="h-4 w-4" />, onClick: () => void setArchived(true) },
    ...(isDm && otherUserId ? [isBlocked
      ? { label: 'Unblock', icon: <ShieldOff className="h-4 w-4" />, onClick: () => void setBlocked(false) }
      : { label: 'Block', icon: <ShieldOff className="h-4 w-4" />, onClick: () => setDialog({ kind: 'block' }), destructive: true }] : []),
    ...(isDm && otherUserId ? [{ label: 'Report', icon: <Flag className="h-4 w-4" />, onClick: () => setDialog({ kind: 'report-chat' }), destructive: true }] : []),
    ...(groupLike ? [{ label: isChannel ? 'Channel info' : 'Group info', icon: <Users className="h-4 w-4" />, onClick: () => router.push(`/messages/${id}/members`) }] : []),
    ...(groupLike ? [{ label: isChannel ? 'Leave channel' : 'Leave group', icon: <LogOut className="h-4 w-4" />, onClick: () => setDialog({ kind: 'leave' }), destructive: true }] : []),
    { label: 'Delete chat for me', icon: <Trash2 className="h-4 w-4" />, onClick: () => setDialog({ kind: 'delete-chat' }), destructive: true },
  ];

  // ── Display ───────────────────────────────────────────────────────────────
  const title = chatTitle(conversation, me);
  const memberCount = members.length;
  const subtitle = !conversation ? ''
    : groupLike ? `${memberCount} ${isChannel ? 'subscriber' : 'member'}${memberCount === 1 ? '' : 's'}`
    : otherTyping ? 'typing…'
    : customerSide ? 'Business'
    : conversation.business_id ? `Customer · ${conversation.business_name ?? 'your business'}`
    : formatLastSeen(presence);
  const avatar = customerSide ? chatAvatar(conversation)
    : (() => { const a = otherProfile?.avatar_url; return (Array.isArray(a) ? a[0] : a) as string | undefined ?? chatAvatar(conversation); })();

  const identity = isDm ? (
    <UserIdentity
      displayName={title}
      avatarUrl={avatar ?? null}
      businessName={!customerSide && otherProfile?.business_name ? String(otherProfile.business_name) : null}
      businessSlug={!customerSide && otherProfile?.business_slug ? String(otherProfile.business_slug) : null}
      showBusinessLink={!customerSide}
      isVerified={Boolean(otherProfile?.is_verified)}
      subtitle={subtitle}
      onlineIndicator={isUserOnline(presence) && !customerSide}
      size="sm"
      variant="white"
      onClick={profileHref ? () => router.push(profileHref) : undefined}
      className="min-w-0 flex-1"
    />
  ) : (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white" aria-hidden="true">
        {isChannel ? <Radio className="h-5 w-5" /> : <Users className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{title}</span>
        <span className="block truncate text-xs text-white/75">{subtitle}</span>
      </span>
    </>
  );

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const photos = useMemo(() => messages.filter((m) => m.type === 'image' && m.content && !m._temp).map((m) => ({ src: String(m.content), alt: 'Photo' })), [messages]);
  const pinnedList: PinnedPreview[] = pins.map((pid) => {
    const loaded = byId.get(pid);
    return { id: pid, text: loaded ? pinPreviewText(loaded) : (pinTexts[pid] ?? 'Pinned message') };
  });

  const jumpTo = (mid: string) => {
    const el = document.getElementById(`msg-${mid}`);
    if (!el) { toast.info('Scroll up to load older messages to see this one'); return false; }
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('bg-primary/10');
    setTimeout(() => el.classList.remove('bg-primary/10'), 1600);
    return true;
  };

  const renderMessage = (msg: ChatMessage, prev?: ChatMessage) => {
    const mine = String(msg.sender_id) === String(me);
    const firstOfRun = !prev || String(prev.sender_id) !== String(msg.sender_id) || prev.type === 'context';
    const quoted = msg.reply_to_id ? byId.get(msg.reply_to_id) : null;
    return (
      <MessageBubble
        msg={msg}
        isMe={mine}
        showSender={groupLike && !mine && firstOfRun}
        groupAvatar={groupLike && !mine ? (firstOfRun ? 'avatar' : 'space') : null}
        quote={msg.reply_to_id ? {
          name: quoted ? (String(quoted.sender_id) === String(me) ? 'You' : quoted.sender_name || title) : 'Message',
          text: quoted ? messagePreview(quoted) : 'Earlier message',
        } : null}
        tick={tickFor(msg, me ?? undefined, members)}
        selected={actionsFor?.id === msg.id}
        currentUserId={me}
        onOpenActions={setActionsFor}
        onToggleReaction={(emoji, isMine) => void react(msg, emoji, isMine)}
        onOpenPhoto={(url) => setPhotoIndex(Math.max(0, photos.findIndex((p) => p.src === url)))}
        onRetry={(m) => void deliver(m)}
        onQuoteClick={jumpTo}
      />
    );
  };

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">{notFound}</p>
        <button type="button" onClick={leaveToInbox} className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Back to messages</button>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="fixed inset-x-0 top-[var(--chat-top,0px)] z-[55] flex h-[var(--chat-vh,100dvh)] flex-col overflow-hidden bg-[hsl(var(--chat-bg))] md:static md:z-auto md:h-full"
        initial={reducedMotion ? false : { opacity: 0, x: 24 }}
        animate={isExiting ? { opacity: 0, x: 24 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => { if (isExiting) leaveToInbox(); }}
      >
        <span className="sr-only" aria-live="polite">{announcement}</span>
        <ChatHeader identity={identity} menu={menu} onBack={handleBack} onSearch={() => setShowSearch(true)} />
        <PinnedBar pins={pinnedList} onJump={jumpTo} />

        {conversation?.is_request && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/40 bg-card px-4 py-3" role="region" aria-label="Message request">
            <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">{title}</span> wants to message you. Accept to move this chat to Chats, or reply.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void acceptRequest()} className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Accept</button>
              {otherUserId && <button type="button" onClick={() => setDialog({ kind: 'block' })} className="h-9 rounded-full border border-border px-4 text-sm font-semibold text-destructive">Block</button>}
              <button type="button" onClick={() => setDialog({ kind: 'delete-chat' })} className="h-9 rounded-full border border-border px-4 text-sm font-semibold">Delete</button>
            </div>
          </div>
        )}

        <MessageList
          messages={messages}
          loading={loading}
          hasOlder={hasOlder}
          loadingOlder={loadingOlder}
          onLoadOlder={() => void loadOlder()}
          firstUnreadId={firstUnreadId}
          typing={otherTyping}
          newFromOthers={newWhileAway}
          scrollSignal={scrollSignal}
          onAtBottom={() => setNewWhileAway(0)}
          renderMessage={renderMessage}
          empty={
            <p className="rounded-2xl bg-card px-6 py-3 text-center text-sm text-foreground/80 shadow-sm">
              {isBlocked ? 'You blocked this person.' : 'No messages yet. Say hello!'}
            </p>
          }
        />

        {canSend ? (
          <Composer
            key={id}
            ref={composer}
            conversationId={id}
            replyTo={replyTo ? { name: String(replyTo.sender_id) === String(me) ? 'yourself' : replyTo.sender_name || title, text: messagePreview(replyTo) } : null}
            editing={editing ? { text: editing.content ?? '' } : null}
            uploading={uploading}
            extras={conversation?.business_id && conversation.is_business_side
              ? <QuickReplies businessId={String(conversation.business_id)} onPick={(t) => composer.current?.setText(t)} />
              : null}
            onSend={onSend}
            onSaveEdit={(t) => void onSaveEdit(t)}
            onCancelReply={() => setReplyTo(null)}
            onCancelEdit={() => setEditing(null)}
            onTyping={setTyping}
            onPickPhotos={(f) => void onPickPhotos(f)}
          />
        ) : (
          <div className="shrink-0 border-t border-border/30 bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground">
            {isBlocked
              ? <>You blocked this person. <button type="button" onClick={() => void setBlocked(false)} className="font-semibold text-primary underline-offset-2 hover:underline">Unblock</button></>
              : 'Only admins can post in this channel.'}
          </div>
        )}
      </motion.div>

      <MessageActions
        message={actionsFor}
        me={me}
        pinned={actionsFor ? pins.includes(actionsFor.id) : false}
        reducedMotion={reducedMotion}
        onClose={() => setActionsFor(null)}
        onReact={(emoji) => actionsFor && void react(actionsFor, emoji)}
        onReply={() => { setReplyTo(actionsFor); setEditing(null); setActionsFor(null); }}
        onCopy={() => actionsFor && copy(actionsFor)}
        onForward={() => { setForwarding(actionsFor); setActionsFor(null); }}
        onPin={() => actionsFor && void togglePin(actionsFor)}
        onEdit={() => { setEditing(actionsFor); setReplyTo(null); setActionsFor(null); }}
        onDelete={(scope) => actionsFor && void deleteMessage(actionsFor, scope)}
        onReport={() => { if (actionsFor) setDialog({ kind: 'report-message', message: actionsFor }); setActionsFor(null); }}
      />

      {forwarding && <ForwardDialog message={forwarding} currentChatId={id} me={me} onForward={(t) => void forward(t)} onClose={() => setForwarding(null)} />}

      {dialog?.kind === 'mute' && (
        <ChoiceDialog title="Mute notifications" description="You’ll still get the messages, without alerts." onClose={() => setDialog(null)} onChoose={(v) => void setMute(v)}
          choices={[{ label: 'For 8 hours', value: '8h' }, { label: 'For 1 week', value: '1w' }, { label: 'Always', value: 'always' }]} />
      )}
      {dialog?.kind === 'report-message' && (
        <ChoiceDialog title="Report this message" description="Tell us what’s wrong. The sender won’t know who reported it." onClose={() => setDialog(null)}
          choices={REPORT_REASONS} onChoose={(reason) => void report('message', dialog.message.id, reason)} />
      )}
      {dialog?.kind === 'report-chat' && otherUserId && (
        <ChoiceDialog title={`Report ${title}`} description="They won’t know who reported them." onClose={() => setDialog(null)}
          choices={REPORT_REASONS} onChoose={(reason) => void report('user', otherUserId, reason)} />
      )}
      {dialog?.kind === 'block' && (
        <ChoiceDialog title={`Block ${title}?`} description="They won’t be able to message you, and you’ll stop following each other." onClose={() => setDialog(null)}
          choices={[{ label: 'Block', value: 'block', destructive: true }]} onChoose={() => void setBlocked(true)} />
      )}
      {dialog?.kind === 'delete-chat' && (
        <ChoiceDialog title="Delete this chat for you?" description="The messages disappear for you only. A new message brings the chat back." onClose={() => setDialog(null)}
          choices={[{ label: 'Delete chat', value: 'delete', destructive: true }]} onChoose={() => void deleteChat()} />
      )}
      {dialog?.kind === 'leave' && (
        <ChoiceDialog title={isChannel ? 'Leave this channel?' : 'Leave this group?'} onClose={() => setDialog(null)}
          choices={[{ label: 'Leave', value: 'leave', destructive: true }]} onChoose={() => void leaveGroup()} />
      )}

      {photoIndex !== null && photos.length > 0 && (
        <PhotoViewer photos={photos} startIndex={photoIndex} onClose={() => setPhotoIndex(null)} />
      )}
      {showSearch && <MessageSearch conversationId={id} onClose={() => setShowSearch(false)} />}
    </>
  );
}

export default function ChatRoomPage() {
  return <ErrorBoundary><ChatRoom /></ErrorBoundary>;
}
