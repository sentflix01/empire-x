'use client';
/**
 * The Messages badge (chats with unread messages, not muted or archived) and
 * "delivered" receipts: whenever this app receives a message on any page it
 * tells the server, so the sender sees ✓✓. Live through the socket, with a
 * slow poll as a fallback.
 */
import { useEffect, useRef, useState } from 'react';
import client from '@/api/client';
import { connectSocket, getSocket } from '@/lib/socket';

export interface UnreadCounts { chats: number; messages: number; requests: number }

export function useMessagesBadge(userId: string | null | undefined): UnreadCounts {
  const [counts, setCounts] = useState<UnreadCounts>({ chats: 0, messages: 0, requests: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) { setCounts({ chats: 0, messages: 0, requests: 0 }); return; }
    let active = true;
    const load = () => {
      client.get('/api/messages/unread-count')
        .then(({ data }) => { if (active && data) setCounts({ chats: data.chats ?? 0, messages: data.messages ?? 0, requests: data.requests ?? 0 }); })
        .catch(() => undefined);
    };
    const loadSoon = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(load, 300); };
    const delivered = (ids?: string[]) => { client.post('/api/messages/delivered', ids ? { conversation_ids: ids } : {}).catch(() => undefined); };

    const onUpdated = (c: { conversation_id?: string; last_message_sender_id?: string }) => {
      if (c?.conversation_id && String(c.last_message_sender_id) !== String(userId)) delivered([c.conversation_id]);
    };
    // Back online: anything that arrived meanwhile has now reached this app.
    const onConnect = () => { delivered(); load(); };

    connectSocket();
    const s = getSocket();
    s.on('unread_changed', loadSoon);
    s.on('conversation_updated', onUpdated);
    s.on('connect', onConnect);
    if (s.connected) onConnect(); else load();
    const poll = setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      s.off('unread_changed', loadSoon);
      s.off('conversation_updated', onUpdated);
      s.off('connect', onConnect);
    };
  }, [userId]);

  return counts;
}
