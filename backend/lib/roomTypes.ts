/**
 * lib/roomTypes.ts — shared pieces of the rooms routes (routes/rooms.ts and
 * routes/businessRooms.ts): the columns a room type is returned with, field
 * validation, and the calendar date range.
 */
import type { Request, Response } from 'express';
import * as apiError from './apiError';
import { MAX_CALENDAR_DAYS, addDays, daysBetween, parseDay, today } from './roomAvailability';

export const ROOM_COLUMNS = 'id, business_id, name, description, photo_url, price_per_night, currency, max_guests, units, active, sort_order, created_at, updated_at';

export function publicRoom(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row, price_per_night: Number(row.price_per_night) };
}

export const isOwnerOrAdmin = (req: Request, ownerId: unknown) => !!req.user && (req.user.id === ownerId || req.user.role === 'admin');

/** Validated room fields from a create (all required) or update (any) body. */
export function roomFields(body: Record<string, unknown>, partial: boolean): Record<string, unknown> | { error: string } {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;
  if (!partial || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return { error: 'Give the room a name (up to 120 characters)' };
    out.name = name;
  }
  if (has('description')) {
    if (body.description !== null && typeof body.description !== 'string') return { error: 'description must be text' };
    const d = typeof body.description === 'string' ? body.description.trim() : '';
    if (d.length > 1000) return { error: 'description must be at most 1000 characters' };
    out.description = d || null;
  }
  if (has('photo_url')) {
    if (body.photo_url === null || body.photo_url === '') out.photo_url = null;
    else {
      let ok = false;
      try { const u = new URL(String(body.photo_url)); ok = ['http:', 'https:'].includes(u.protocol) && String(body.photo_url).length <= 2000; } catch { ok = false; }
      if (!ok) return { error: 'Add the room photo again' };
      out.photo_url = String(body.photo_url);
    }
  }
  if (!partial || has('price_per_night')) {
    const price = Number(body.price_per_night);
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) return { error: 'Enter a price per night greater than 0' };
    out.price_per_night = Math.round(price * 100) / 100;
  }
  for (const [key, min, max, label] of [['max_guests', 1, 20, 'Guests per room'], ['units', 1, 500, 'Number of rooms']] as const) {
    if (!partial || has(key)) {
      const n = Number(body[key]);
      if (!Number.isInteger(n) || n < min || n > max) return { error: `${label} must be ${min} to ${max}` };
      out[key] = n;
    }
  }
  if (has('active')) {
    if (typeof body.active !== 'boolean') return { error: 'active must be true or false' };
    out.active = body.active;
  }
  return out;
}

export function dateRange(req: Request, res: Response): { from: string; to: string } | null {
  const from = req.query.from === undefined ? today() : parseDay(req.query.from);
  const to = req.query.to === undefined && from ? addDays(from, 60) : parseDay(req.query.to);
  if (!from || !to || to <= from) { apiError.validationError(res, 'from and to must be dates (YYYY-MM-DD) with to after from'); return null; }
  if (daysBetween(from, to) > MAX_CALENDAR_DAYS) { apiError.validationError(res, `Ask for at most ${MAX_CALENDAR_DAYS} days at a time`); return null; }
  return { from, to };
}
