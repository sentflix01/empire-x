/**
 * lib/roomAvailability.ts — free rooms per night for a room type.
 *
 * Decision 2026-11-12 "Room bookings: availability calendar and 48-hour hold".
 * A booking holds its rooms for every night from check-in up to (not
 * including) check-out while it is open. Cancelled, expired, refunded and
 * failed bookings release them, and so does an unpaid one whose expiry has
 * passed even before the expiry job marks it. Owners' closed nights
 * (room_blocks) count as taken. free = units − held − blocked, never below 0.
 *
 * Dates are calendar days (YYYY-MM-DD) in Ethiopia's time zone.
 */

type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export const BOOKING_TIME_ZONE = 'Africa/Addis_Ababa';
export const MAX_NIGHTS = 30;
export const MAX_DAYS_AHEAD = 365;
export const MAX_CALENDAR_DAYS = 120;
export const ROOM_REQUEST_HOLD_HOURS = 48;

/** SQL condition (on alias o) for a booking that still holds its rooms. */
export const HOLDS_ROOMS_SQL = `o.status NOT IN ('cancelled','expired','refunded','payment_failed')
  AND NOT (o.status IN ('requested','awaiting_payment','payment_reported') AND o.payment_expires_at IS NOT NULL AND o.payment_expires_at < NOW())`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date written YYYY-MM-DD, or null. */
export function parseDay(value: unknown): string | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Today's date where the hotels are. */
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BOOKING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export interface NightAvailability { night: string; booked: number; blocked: number; free: number }

/** One row per night from `from` up to (not including) `to`. */
export async function nightlyAvailability(db: Queryable, roomTypeId: string, units: number, from: string, to: string): Promise<NightAvailability[]> {
  const { rows } = await db.query(
    `SELECT to_char(d, 'YYYY-MM-DD') AS night,
            COALESCE((SELECT SUM(o.rooms) FROM orders o
                       WHERE o.room_type_id = $1 AND o.check_in <= d::date AND o.check_out > d::date AND ${HOLDS_ROOMS_SQL}), 0)::int AS booked,
            COALESCE((SELECT b.units FROM room_blocks b WHERE b.room_type_id = $1 AND b.night = d::date), 0)::int AS blocked
       FROM generate_series($2::date, $3::date - 1, interval '1 day') AS d
      ORDER BY d`,
    [roomTypeId, from, to],
  );
  return rows.map((r) => ({ night: r.night, booked: r.booked, blocked: r.blocked, free: Math.max(0, units - r.booked - r.blocked) }));
}

export interface StayInput { check_in: unknown; check_out: unknown; guests: unknown; rooms: unknown }
export interface Stay { checkIn: string; checkOut: string; nights: number; guests: number; rooms: number }

/** Checks the dates and counts against a room type; returns the stay or an error message. */
export function validateStay(input: StayInput, room: { max_guests: number; units: number }, now = new Date()): Stay | { error: string } {
  const checkIn = parseDay(input.check_in);
  const checkOut = parseDay(input.check_out);
  if (!checkIn || !checkOut) return { error: 'Choose check-in and check-out dates' };
  const first = today(now);
  if (checkIn < first) return { error: 'Check-in cannot be in the past' };
  if (daysBetween(first, checkIn) > MAX_DAYS_AHEAD) return { error: `Bookings open up to ${MAX_DAYS_AHEAD} days ahead` };
  const nights = daysBetween(checkIn, checkOut);
  if (nights < 1) return { error: 'Check-out must be after check-in' };
  if (nights > MAX_NIGHTS) return { error: `A booking can be at most ${MAX_NIGHTS} nights` };
  const rooms = input.rooms === undefined ? 1 : Number(input.rooms);
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > room.units) return { error: `Choose 1 to ${room.units} rooms` };
  const guests = Number(input.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > room.max_guests * rooms) return { error: `Up to ${room.max_guests * rooms} guests for ${rooms} room${rooms === 1 ? '' : 's'}` };
  return { checkIn, checkOut, nights, guests, rooms };
}
