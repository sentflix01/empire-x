/**
 * What a person may do with a chat message. The server enforces the same
 * windows (backend/lib/messaging.ts); the app uses them to show only the
 * actions that will work.
 */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const DELETE_FOR_EVERYONE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  sender_id?: string | null;
  sender_name?: string | null;
  content?: string | null;
  type?: string;
  created_at: string;
  edited?: boolean;
  reply_to_id?: string | null;
  reactions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Shown before the server confirms it. */
  _temp?: boolean;
  /** Waiting for a connection (offline queue). */
  _pending?: boolean;
  /** The send failed; tap to retry. */
  _failed?: boolean;
}

const age = (m: ChatMessage, now: number) => now - new Date(m.created_at).getTime();
const isMine = (m: ChatMessage, me?: string | null) => Boolean(me) && String(m.sender_id) === String(me);
const isServerCard = (m: ChatMessage) => m.type === 'context' || m.type === 'product' || m.type === 'order_update';

export function messageActions(m: ChatMessage, me?: string | null, now = Date.now()) {
  const mine = isMine(m, me);
  const sent = !m._temp && !m._pending && !m._failed;
  return {
    react: sent,
    reply: sent,
    copy: (m.type ?? 'text') === 'text' && Boolean(m.content),
    forward: sent && !isServerCard(m),
    pin: sent,
    edit: sent && mine && (m.type ?? 'text') === 'text' && age(m, now) <= EDIT_WINDOW_MS,
    deleteForMe: sent,
    deleteForEveryone: sent && mine && !isServerCard(m) && age(m, now) <= DELETE_FOR_EVERYONE_WINDOW_MS,
    report: sent && !mine && !isServerCard(m),
  };
}

/** Phones and tablets get a new line on Enter (Send is a button); computers send on Enter. */
export function enterSends(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return !window.matchMedia('(pointer: coarse)').matches;
}

/** One-line preview used in reply quotes, pins and the action sheet. */
export function messagePreview(m: Pick<ChatMessage, 'type' | 'content'> | null | undefined): string {
  if (!m) return 'Message';
  if (m.type === 'image') return 'Photo';
  if (m.type === 'file') return 'File';
  if (m.type === 'product') return 'Product';
  if (m.type === 'order_update') return 'Order update';
  if (m.type === 'context') return 'Chat topic';
  const text = typeof m.content === 'string' ? m.content.trim() : '';
  return text || 'Message';
}
