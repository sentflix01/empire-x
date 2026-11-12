'use client';
/**
 * BusinessRooms — the owner's Rooms page (/business/rooms).
 *
 * Decision "Room bookings: availability calendar and 48-hour hold": room
 * types with a price per night, guests per room and how many identical rooms
 * there are; a month calendar per room type showing free, booked and closed
 * nights (tap a night to close or reopen it); and the upcoming bookings.
 * Booking requests are answered on the Orders page (confirm price / decline).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BedDouble, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhotoField from '@/components/showroom/PhotoField';
import { entities, type Business } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import {
  createRoom, fetchAvailability, fetchRoomBookings, listRooms, removeRoom, setBlockedRooms, updateRoom,
  type NightAvailability, type RoomBooking, type RoomInput, type RoomType,
} from '@/api/rooms';
import { addDays, formatDay, todayDay } from '@/lib/roomDates';

const EMPTY_FORM = { name: '', description: '', photo_url: '', price_per_night: '', max_guests: '2', units: '1' };
type RoomForm = typeof EMPTY_FORM;

function toInput(f: RoomForm): RoomInput {
  return {
    name: f.name.trim(), description: f.description.trim() || null, photo_url: f.photo_url || null,
    price_per_night: Number(f.price_per_night), max_guests: Number(f.max_guests), units: Number(f.units),
  };
}

function RoomEditor({ initial, saving, onSave, onCancel }: { initial: RoomForm; saving: boolean; onSave: (f: RoomForm) => void; onCancel: () => void }) {
  const [f, setF] = useState(initial);
  const valid = f.name.trim() && Number(f.price_per_night) > 0 && Number(f.units) >= 1 && Number(f.max_guests) >= 1;
  return (
    <form className="space-y-3 rounded-2xl border border-border/50 bg-card p-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(f); }}>
      <div className="space-y-1">
        <Label htmlFor="room-name">Room name</Label>
        <Input id="room-name" value={f.name} maxLength={120} placeholder="Deluxe double" onChange={(e) => setF({ ...f, name: e.target.value })} className="h-11" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="room-price">Price per night (ETB)</Label>
          <Input id="room-price" type="number" inputMode="decimal" min={1} value={f.price_per_night} onChange={(e) => setF({ ...f, price_per_night: e.target.value })} className="h-11" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="room-guests">Guests per room</Label>
          <Input id="room-guests" type="number" inputMode="numeric" min={1} max={20} value={f.max_guests} onChange={(e) => setF({ ...f, max_guests: e.target.value })} className="h-11" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="room-units">How many rooms</Label>
          <Input id="room-units" type="number" inputMode="numeric" min={1} max={500} value={f.units} onChange={(e) => setF({ ...f, units: e.target.value })} className="h-11" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="room-desc">A few words (optional)</Label>
        <textarea id="room-desc" rows={2} maxLength={1000} value={f.description} placeholder="Lake view, breakfast included"
          onChange={(e) => setF({ ...f, description: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <PhotoField id="room-photo" label="Room photo (optional)" value={f.photo_url} onChange={(url) => setF({ ...f, photo_url: url })} />
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || saving} className="rounded-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Save room'}</Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/** Monday-first month grid; each night shows free rooms and can be closed or reopened. */
export function RoomCalendar({ room }: { room: RoomType }) {
  const first = todayDay();
  const [month, setMonth] = useState(first.slice(0, 7));
  const [nights, setNights] = useState<Record<string, NightAvailability>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const start = `${month}-01`;
  const next = useMemo(() => { const d = new Date(`${start}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10); }, [start]);
  const days = useMemo(() => { const out: string[] = []; for (let d = start; d < next; d = addDays(d, 1)) out.push(d); return out; }, [start, next]);
  const lead = (new Date(`${start}T00:00:00Z`).getUTCDay() + 6) % 7;

  useEffect(() => {
    let live = true;
    fetchAvailability(room.id, start, next)
      .then((list) => { if (live) setNights(Object.fromEntries(list.map((n) => [n.night, n]))); })
      .catch(() => { if (live) toast.error('Could not load the calendar'); });
    return () => { live = false; };
  }, [room.id, start, next]);

  const toggle = async (day: string) => {
    const n = nights[day];
    if (!n || day < first) return;
    const blocked = n.blocked ?? 0;
    const booked = n.booked ?? 0;
    // Closed → open again; otherwise close every room that is not booked.
    const units = blocked > 0 ? 0 : room.units - booked;
    if (units < 0 || (blocked === 0 && units === 0)) return;
    setBusy(day);
    try {
      const updated = await setBlockedRooms(room.id, day, units);
      setNights((all) => ({ ...all, [day]: updated }));
    } catch { toast.error('Could not update that night'); } finally { setBusy(null); }
  };

  const shift = (by: number) => { const d = new Date(`${start}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + by); setMonth(d.toISOString().slice(0, 7)); };
  const monthLabel = formatDay(start, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-2" data-testid="room-calendar">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={month <= first.slice(0, 7)} className="rounded-full p-2 hover:bg-secondary disabled:opacity-40" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-semibold" aria-live="polite">{monthLabel}</p>
        <button type="button" onClick={() => shift(1)} className="rounded-full p-2 hover:bg-secondary" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} />)}
        {days.map((day) => {
          const n = nights[day];
          const past = day < first;
          const blocked = n?.blocked ?? 0;
          const booked = n?.booked ?? 0;
          const tone = !n || past ? 'bg-muted/40 text-muted-foreground'
            : blocked > 0 ? 'bg-destructive/15 text-destructive'
            : n.free === 0 ? 'bg-primary/20 text-foreground'
            : booked > 0 ? 'bg-primary-subtle text-primary-subtle-foreground' : 'bg-secondary/60 text-foreground';
          const label = `${formatDay(day)}: ${n ? `${n.free} of ${room.units} free${booked ? `, ${booked} booked` : ''}${blocked ? `, ${blocked} closed` : ''}` : 'loading'}`;
          return (
            <button key={day} type="button" onClick={() => toggle(day)} disabled={past || !n || busy === day}
              aria-label={label} aria-pressed={blocked > 0} title={label}
              className={`h-12 rounded-lg text-xs leading-tight flex flex-col items-center justify-center ${tone} disabled:cursor-default`}>
              <span className="font-semibold">{Number(day.slice(8))}</span>
              {n && !past && <span className="text-[10px]">{blocked > 0 ? 'closed' : `${n.free} free`}</span>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Tap a night to close it (for repairs or private use) or open it again. Booked nights close by themselves.</p>
    </div>
  );
}

export default function BusinessRooms() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [businessId, setBusinessId] = useState<string>('');
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [openCalendar, setOpenCalendar] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    entities.Business.filter({ owner_id: user.id }).then((list) => {
      setBusinesses(list);
      const wanted = params?.get('business');
      setBusinessId(String((list.find((b) => String(b.id) === wanted) ?? list[0])?.id ?? ''));
    }).catch(() => setBusinesses([]));
  }, [user?.id, params]);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const today = todayDay();
      const [r, b] = await Promise.all([listRooms(businessId), fetchRoomBookings(businessId, today, addDays(today, 60))]);
      setRooms(r);
      setBookings(b);
      setOpenCalendar((c) => c ?? r[0]?.id ?? null);
    } catch { toast.error('Could not load your rooms'); }
  }, [businessId]);
  useEffect(() => { void load(); }, [load]);

  const save = async (f: RoomForm) => {
    setSaving(true);
    try {
      if (editing === 'new') await createRoom(businessId, toInput(f));
      else if (editing) await updateRoom(businessId, editing, toInput(f));
      setEditing(null);
      toast.success('Room saved');
      await load();
    } catch (err) { toast.error((err as { error?: string })?.error || 'Could not save the room'); } finally { setSaving(false); }
  };

  const remove = async (room: RoomType) => {
    if (!window.confirm(`Remove "${room.name}"? Rooms with bookings are hidden from your site instead.`)) return;
    try {
      const res = await removeRoom(businessId, room.id);
      toast.success(res.hidden ? 'Hidden from your site (it has bookings)' : 'Room removed');
      await load();
    } catch { toast.error('Could not remove the room'); }
  };

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? 'Room';

  if (businesses === null) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" /></div>;
  if (!businesses.length) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-3 py-12">
        <h1 className="font-display text-2xl font-bold">Rooms</h1>
        <p className="text-sm text-muted-foreground">Create your Business profile first, then add your rooms.</p>
        <Link href="/business/create" className="text-primary font-medium">Create a business</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Rooms</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Guests book on your site&apos;s &quot;Rooms &amp; booking&quot; section. Requests hold the rooms for 48 hours; confirm them on <Link href="/orders" className="text-primary underline-offset-4 hover:underline">Orders</Link>.</p>
        </div>
        {businesses.length > 1 && (
          <div className="space-y-1">
            <Label htmlFor="rooms-business">Business</Label>
            <select id="rooms-business" value={businessId} onChange={(e) => { setBusinessId(e.target.value); setOpenCalendar(null); }} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
              {businesses.map((b) => <option key={String(b.id)} value={String(b.id)}>{b.business_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {editing === 'new' ? (
        <RoomEditor initial={EMPTY_FORM} saving={saving} onSave={save} onCancel={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing('new')} className="rounded-full"><Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Add a room type</Button>
      )}

      {rooms.length === 0 && editing !== 'new' && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No rooms yet. Add each kind of room once (for example &quot;Double room&quot;, 8 rooms).</p>
      )}

      <ul className="space-y-3">
        {rooms.map((room) => (
          <li key={room.id} data-testid="owner-room" className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
            {editing === room.id ? (
              <RoomEditor
                initial={{ name: room.name, description: room.description ?? '', photo_url: room.photo_url ?? '', price_per_night: String(room.price_per_night), max_guests: String(room.max_guests), units: String(room.units) }}
                saving={saving} onSave={save} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <BedDouble className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <h2 className="font-semibold truncate">{room.name}{!room.active && <span className="ml-2 text-xs font-normal text-muted-foreground">(hidden)</span>}</h2>
                    <p className="text-sm text-muted-foreground">{room.price_per_night.toLocaleString()} {room.currency} / night · {room.units} room{room.units === 1 ? '' : 's'} · up to {room.max_guests} guest{room.max_guests === 1 ? '' : 's'} each</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!room.active && <Button size="sm" variant="outline" className="rounded-full h-8" onClick={async () => { await updateRoom(businessId, room.id, { active: true }); await load(); }}>Show again</Button>}
                  <button type="button" onClick={() => setEditing(room.id)} className="rounded-full p-2 hover:bg-secondary" aria-label={`Edit ${room.name}`}><Pencil className="w-4 h-4" /></button>
                  {room.active && <button type="button" onClick={() => remove(room)} className="rounded-full p-2 hover:bg-secondary" aria-label={`Remove ${room.name}`}><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            )}
            <button type="button" className="text-sm font-medium text-primary" aria-expanded={openCalendar === room.id} onClick={() => setOpenCalendar(openCalendar === room.id ? null : room.id)}>
              {openCalendar === room.id ? 'Hide calendar' : 'Show calendar'}
            </button>
            {openCalendar === room.id && <RoomCalendar room={room} />}
          </li>
        ))}
      </ul>

      <section aria-labelledby="upcoming-title" className="space-y-2">
        <h2 id="upcoming-title" className="font-semibold">Upcoming bookings (next 60 days)</h2>
        {bookings.length === 0 ? <p className="text-sm text-muted-foreground">No bookings yet.</p> : (
          <ul className="divide-y divide-border/50 rounded-2xl border border-border/50 bg-card">
            {bookings.map((b) => (
              <li key={b.id} data-testid="owner-booking" className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.buyer_name || 'Guest'} · {roomName(b.room_type_id)}{b.rooms > 1 ? ` ×${b.rooms}` : ''}</p>
                  <p className="text-muted-foreground">{formatDay(b.check_in)} → {formatDay(b.check_out)} · {b.nights} night{b.nights === 1 ? '' : 's'} · {b.total_price.toLocaleString()} {b.currency}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs">{b.status === 'requested' ? 'Needs your answer' : b.status.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
