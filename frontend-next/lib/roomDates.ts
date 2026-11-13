/**
 * roomDates.ts — calendar days (YYYY-MM-DD) for room bookings, in the same
 * time zone the server checks them in (backend/lib/roomAvailability.ts).
 */
export const BOOKING_TIME_ZONE = 'Africa/Addis_Ababa';

export function todayDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BOOKING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "Tue 12 Nov" for a YYYY-MM-DD day, whatever the viewer's own time zone. */
export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
}
