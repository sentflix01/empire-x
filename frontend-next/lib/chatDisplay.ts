/**
 * How a chat is named and pictured, in one place for the inbox, the chat
 * header and the forward picker. A customer sees the business; the business
 * owner sees the customer; groups and channels show their name.
 */
import { parseISO, isToday, isYesterday, isAfter, subDays, format } from 'date-fns';
import { fmtTime } from '@/lib/date';

export interface ChatSummary {
  id: string;
  type?: string;
  name?: string | null;
  avatar_url?: string | null;
  business_id?: string | null;
  business_name?: string | null;
  business_logo?: string | null;
  is_business_side?: boolean;
  other_user_id?: string | null;
  other_name?: string | null;
  other_avatar?: string | string[] | null;
  participant_ids?: string | string[] | null;
  participant_names?: string | string[] | null;
  [key: string]: unknown;
}

const list = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== 'string' || !v) return [];
  try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
};

export const isGroupLike = (c: Pick<ChatSummary, 'type'>) => c.type === 'group' || c.type === 'channel';
/** True when I'm the customer in a business chat (I see the business, not the owner). */
export const isCustomerSide = (c: ChatSummary) => Boolean(c.business_id) && !c.is_business_side;

export function chatTitle(c: ChatSummary | null | undefined, me?: string | null): string {
  if (!c) return 'Chat';
  if (isGroupLike(c)) return c.name || (c.type === 'channel' ? 'Channel' : 'Group');
  if (isCustomerSide(c) && c.business_name) return c.business_name;
  if (c.other_name) return c.other_name;
  const ids = list(c.participant_ids);
  const names = list(c.participant_names);
  const mine = ids.findIndex((id) => id === String(me));
  if (mine === -1) return names.find(Boolean) || 'Chat';
  return names.find((_, i) => i !== mine) || names[0] || 'Chat';
}

export function chatAvatar(c: ChatSummary | null | undefined): string | null {
  if (!c) return null;
  if (c.avatar_url) return c.avatar_url;
  if (isCustomerSide(c)) return c.business_logo || null;
  const a = c.other_avatar;
  return (Array.isArray(a) ? a[0] : a) || null;
}

/** The other person in a one-to-one chat. */
export function chatOtherUserId(c: ChatSummary | null | undefined, me?: string | null): string | null {
  if (!c || c.type !== 'dm') return null;
  if (c.other_user_id) return String(c.other_user_id);
  return list(c.participant_ids).find((id) => id !== String(me)) ?? null;
}

/** Inbox time: 14:05, Yesterday, Mon, 12/10/26. */
export function inboxTime(ts?: string | null): string {
  if (!ts) return '';
  const d = parseISO(ts);
  if (Number.isNaN(d.getTime())) return '';
  if (isToday(d)) return fmtTime(d);
  if (isYesterday(d)) return 'Yesterday';
  if (isAfter(d, subDays(new Date(), 7))) return format(d, 'EEE');
  return format(d, 'dd/MM/yy');
}
