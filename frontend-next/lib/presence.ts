/**
 * presence.ts — Online status + last-seen label utilities.
 *
 * Uses date-fns (already a project dependency) — NOT moment.js.
 *
 * Supported status thresholds (Telegram-style):
 *   online                    → "online"
 *   away                      → "away"
 *   < 60 seconds ago          → "last seen just now"
 *   < 60 minutes ago          → "last seen N minutes ago"
 *   < 3 hours ago             → "last seen N hours ago"
 *   same calendar day         → "last seen today at HH:mm"
 *   yesterday                 → "last seen yesterday at HH:mm"
 *   < 7 days ago              → "last seen Monday at HH:mm"
 *   < 4 weeks ago             → "last seen N weeks ago"
 *   < 12 months ago           → "last seen N months ago"
 *   >= 12 months ago          → "last seen N years ago"  (or "over a year ago")
 *   no timestamp              → "last seen a while ago"
 */

import {
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  isToday,
  isYesterday,
  format,
  parseISO,
  isValid,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceData {
  user_id?: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string | null; // ISO 8601 timestamp
  hidden?: boolean;
}

/**
 * Granular status category — useful for badge colours, icons, etc.
 *   'online'       → green dot
 *   'away'         → yellow dot
 *   'recent'       → light-green / faded (seen < 6 min ago — effectively just went offline)
 *   'today'        → seen today
 *   'yesterday'    → seen yesterday
 *   'this_week'    → seen within 7 days
 *   'weeks_ago'    → 1–4 weeks ago
 *   'months_ago'   → 1–11 months ago
 *   'long_ago'     → 1+ years ago
 *   'unknown'      → no timestamp
 */
export type PresenceCategory =
  | 'online'
  | 'away'
  | 'recent'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'weeks_ago'
  | 'months_ago'
  | 'long_ago'
  | 'unknown';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseDate(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  try {
    const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

// ─── Core categoriser ─────────────────────────────────────────────────────────

/**
 * Derive a PresenceCategory from raw PresenceData.
 * Call this once and use the category for both the label and the dot colour.
 */
export function getPresenceCategory(data: PresenceData | null): PresenceCategory {
  if (!data) return 'unknown';
  if (data.hidden) return 'long_ago';
  if (data.status === 'online') return 'online';
  if (data.status === 'away')   return 'away';

  const d = safeParseDate(data.last_seen);
  if (!d) return 'unknown';

  const now = new Date();
  const diffSec  = differenceInSeconds(now, d);

  if (diffSec < 300)    return 'recent';     // < 5 min — still "effectively online"
  if (isToday(d))       return 'today';
  if (isYesterday(d))   return 'yesterday';
  if (differenceInDays(now, d) < 7)   return 'this_week';
  if (differenceInWeeks(now, d) < 5)  return 'weeks_ago';
  if (differenceInMonths(now, d) < 12) return 'months_ago';
  return 'long_ago';
}

// ─── Human-readable label (Telegram-style) ────────────────────────────────────

/**
 * formatLastSeen — returns a human-readable string for the chat header subtitle.
 *
 * Examples:
 *   "online"
 *   "away"
 *   "last seen just now"
 *   "last seen 3 minutes ago"
 *   "last seen 2 hours ago"
 *   "last seen today at 14:32"
 *   "last seen yesterday at 09:15"
 *   "last seen Monday at 18:44"
 *   "last seen 2 weeks ago"
 *   "last seen 3 months ago"
 *   "last seen 1 year ago"
 *   "last seen over 2 years ago"
 *   "last seen a while ago"
 */
export function formatLastSeen(data: PresenceData | null): string {
  if (!data) return '';
  if (data.hidden) return 'last seen a long time ago';
  if (data.status === 'online') return 'online';
  if (data.status === 'away')   return 'away';

  const d = safeParseDate(data.last_seen);
  if (!d) return 'last seen a while ago';

  const now = new Date();
  const diffSec   = differenceInSeconds(now, d);
  const diffMin   = differenceInMinutes(now, d);
  const diffHours = differenceInHours(now, d);
  const diffDays  = differenceInDays(now, d);

  // Use day-count arithmetic for weeks/months/years.
  // date-fns differenceInMonths() counts calendar boundaries crossed, which means
  // July 30 → Aug 6 = 1 "month" — wrong for our purposes. Fixed-size buckets are correct.
  const approxWeeks  = Math.floor(diffDays / 7);
  const approxMonths = Math.floor(diffDays / 30);
  const approxYears  = Math.floor(diffDays / 365);

  // < 60 seconds
  if (diffSec < 60)  return 'last seen just now';

  // < 60 minutes
  if (diffMin < 60)  return `last seen ${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;

  // < 3 hours
  if (diffHours < 3) return `last seen ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

  // Same calendar day
  if (isToday(d))     return `last seen today at ${format(d, 'HH:mm')}`;

  // Yesterday
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;

  // Within the last 7 days — show weekday name
  if (diffDays < 7)   return `last seen ${format(d, 'EEEE')} at ${format(d, 'HH:mm')}`;

  // 7–29 days — weeks
  if (diffDays < 30) {
    return approxWeeks === 1 ? 'last seen a week ago' : `last seen ${approxWeeks} weeks ago`;
  }

  // 30–364 days — months
  if (diffDays < 365) {
    return approxMonths === 1 ? 'last seen a month ago' : `last seen ${approxMonths} months ago`;
  }

  // 365+ days — years
  return approxYears === 1 ? 'last seen a year ago' : `last seen ${approxYears} years ago`;
}

// ─── Dot colour helper ────────────────────────────────────────────────────────

/**
 * Returns a Tailwind CSS colour class for the presence indicator dot.
 *
 *  online / recent  → green
 *  away             → yellow/amber
 *  today            → light green
 *  everything else  → grey
 */
export function presenceDotClass(category: PresenceCategory): string {
  switch (category) {
    case 'online':
    case 'recent':    return 'bg-green-500';
    case 'away':      return 'bg-amber-400';
    case 'today':     return 'bg-green-300';
    default:          return 'bg-gray-400';
  }
}

/**
 * presenceDotColor — returns a raw hex/CSS colour string (for use in SVG/Canvas).
 */
export function presenceDotColor(category: PresenceCategory): string {
  switch (category) {
    case 'online':
    case 'recent':  return '#22c55e';   // green-500
    case 'away':    return '#fbbf24';   // amber-400
    case 'today':   return '#86efac';   // green-300
    default:        return '#9ca3af';   // gray-400
  }
}

// ─── Convenience re-export ────────────────────────────────────────────────────

/**
 * A user is online only while the server reports an active chat presence.
 * A recent last_seen must remain offline so the UI can show the time the user
 * left the chat screen rather than a misleading green online indicator.
 */
export function isUserOnline(data: PresenceData | null): boolean {
  if (!data) return false;
  if (data.hidden) return false;
  return data.status === 'online';
}
