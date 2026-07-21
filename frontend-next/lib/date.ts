/**
 * date.ts — Lightweight date helpers using date-fns (tree-shakeable, ~2 KB per function).
 * Replaces moment.js (67 KB) across the codebase.
 */
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isSameDay,
  isSameWeek,
  parseISO,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isValid,
} from 'date-fns';

/**
 * Parse a date value (string | Date | null | undefined) into a Date.
 * Returns null if unparseable.
 */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  try {
    const d = parseISO(value as string);
    return isValid(d) ? d : new Date(value as string);
  } catch {
    return null;
  }
}

/** Format like moment().format('HH:mm') */
export function fmtTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return format(d, 'HH:mm');
}

/** Format like moment().format('MMM D') */
export function fmtShortDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return format(d, 'MMM d');
}

/** Format like moment().format('MMMM D') */
export function fmtLongDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return format(d, 'MMMM d');
}

/** Format like moment().format('MMM D, YYYY') */
export function fmtDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return format(d, 'MMM d, yyyy');
}

/** Format like moment().format('MMM D, YYYY HH:mm') */
export function fmtDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return format(d, 'MMM d, yyyy HH:mm');
}

/** Format like moment().format('YYYY-MM-DD') */
export function fmtISO(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
}

/** Format like moment().format('MMMM YYYY') */
export function fmtMonthYear(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return format(d, 'MMMM yyyy');
}

/** Relative time: "2 hours ago", "3 days ago" — replaces moment().fromNow() */
export function fromNow(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Smart label: "Today", "Yesterday", or fmtLongDate */
export function smartDateLabel(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d');
}

/** Whether two date values are on the same calendar day */
export function sameDay(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
): boolean {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return isSameDay(da, db);
}

/** Whether a date value is the same week as another */
export function sameWeek(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
): boolean {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return isSameWeek(da, db);
}

// Re-export date-fns primitives for direct use where needed
export {
  format,
  parseISO,
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isToday,
  isYesterday,
  isSameDay,
  isValid,
};
