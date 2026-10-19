/**
 * Message ticks, like other chat apps: ✓ sent, ✓✓ delivered (reached their
 * app), blue ✓✓ seen. The server only shares "seen" when both people allow
 * read receipts (Settings › Privacy); otherwise last_read_at is null and the
 * best a sender sees is "delivered". In groups a tick needs everyone.
 */
export type Tick = 'sending' | 'failed' | 'sent' | 'delivered' | 'seen';

export interface MemberReadState {
  user_id: string;
  last_read_at?: string | null;
  last_delivered_at?: string | null;
}

const at = (v?: string | null) => (v ? new Date(v).getTime() : -Infinity);

export function tickFor(
  message: { created_at: string; _temp?: boolean; _failed?: boolean },
  me: string | undefined,
  members: MemberReadState[],
): Tick {
  if (message._failed) return 'failed';
  if (message._temp) return 'sending';
  const others = members.filter((m) => String(m.user_id) !== String(me));
  if (!others.length) return 'sent';
  const sentAt = at(message.created_at);
  if (others.every((m) => at(m.last_read_at) >= sentAt)) return 'seen';
  if (others.every((m) => Math.max(at(m.last_delivered_at), at(m.last_read_at)) >= sentAt)) return 'delivered';
  return 'sent';
}

/** A `conversation_read` / `conversation_delivered` event, applied to the member list. */
export function applyReceipt(
  members: MemberReadState[],
  event: { user_id: string; last_read_at?: string; last_delivered_at?: string },
): MemberReadState[] {
  const later = (a?: string | null, b?: string) => (b && at(b) > at(a) ? b : a ?? null);
  return members.map((m) => (String(m.user_id) === String(event.user_id)
    ? { ...m, last_read_at: later(m.last_read_at, event.last_read_at), last_delivered_at: later(m.last_delivered_at, event.last_delivered_at) }
    : m));
}

export const TICK_LABEL: Record<Tick, string> = {
  sending: 'Sending', failed: 'Not sent', sent: 'Sent', delivered: 'Delivered', seen: 'Seen',
};
