/**
 * Presence utilities — online status + Telegram-style last-seen label
 */
import moment from 'moment';

export interface PresenceData {
  status: 'online' | 'offline' | 'away';
  last_seen: string | null; // ISO timestamp
}

/**
 * Format last_seen exactly like Telegram:
 *  - "online"
 *  - "last seen just now"
 *  - "last seen 3 minutes ago"
 *  - "last seen today at 14:32"
 *  - "last seen yesterday at 09:15"
 *  - "last seen Aug 12 at 18:44"
 */
export function formatLastSeen(data: PresenceData | null): string {
  if (!data) return '';
  if (data.status === 'online') return 'online';

  const ts = data.last_seen;
  if (!ts) return 'last seen a while ago';

  const m = moment(ts);
  const now = moment();
  const diffSec = now.diff(m, 'seconds');
  const diffMin = now.diff(m, 'minutes');

  if (diffSec < 60)  return 'last seen just now';
  if (diffMin < 60)  return `last seen ${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;

  const diffHours = now.diff(m, 'hours');
  if (diffHours < 3) return `last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  if (m.isSame(now, 'day'))       return `last seen today at ${m.format('HH:mm')}`;
  if (m.isSame(now.clone().subtract(1, 'day'), 'day')) return `last seen yesterday at ${m.format('HH:mm')}`;
  if (now.diff(m, 'days') < 7)    return `last seen ${m.format('dddd')} at ${m.format('HH:mm')}`;

  return `last seen ${m.format('MMM D')} at ${m.format('HH:mm')}`;
}
