'use client'
/**
 * BookingSheet — a visitor books a room for dates (decision "Room bookings:
 * availability calendar and 48-hour hold"). Dates are checked against the
 * availability API as they change; the server checks again when sending, so
 * two guests never get the same last room. Nothing is paid here: the hotel
 * confirms, then the guest pays the hotel directly from the order link.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { BedDouble, Check, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAvailability, requestBooking, type RoomType } from '@/api/rooms';
import { addDays, formatDay, nightsBetween, todayDay } from '@/lib/roomDates';

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NIGHTS = 30;

interface Props {
  room: RoomType;
  businessName?: string | null;
  buyer?: { full_name?: string | null; email?: string | null } | null;
  onClose: () => void;
}

export default function BookingSheet({ room, businessName, buyer, onClose }: Props) {
  const { t } = useTranslation();
  const first = todayDay();
  const [checkIn, setCheckIn] = useState(addDays(first, 1));
  const [checkOut, setCheckOut] = useState(addDays(first, 2));
  const [guests, setGuests] = useState(Math.min(2, room.max_guests));
  const [rooms, setRooms] = useState(1);
  const [contact, setContact] = useState({ name: buyer?.full_name ?? '', phone: '', email: buyer?.email ?? '', notes: '' });
  const [shortNights, setShortNights] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ token: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const nights = nightsBetween(checkIn, checkOut);
  const datesError = !checkIn || !checkOut ? t('rooms.chooseDates', 'Choose your dates')
    : checkIn < first ? t('rooms.pastDate', 'Check-in cannot be in the past')
    : nights < 1 ? t('rooms.checkoutAfter', 'Check-out must be after check-in')
    : nights > MAX_NIGHTS ? t('rooms.tooLong', 'A booking can be at most 30 nights') : '';
  const maxGuests = room.max_guests * rooms;
  const total = useMemo(() => Math.round(room.price_per_night * Math.max(nights, 0) * rooms * 100) / 100, [room.price_per_night, nights, rooms]);

  // Free rooms for the chosen nights, as the dates change.
  useEffect(() => {
    if (datesError) { setShortNights([]); return; }
    let live = true;
    setChecking(true);
    fetchAvailability(room.id, checkIn, checkOut)
      .then((list) => { if (live) setShortNights(list.filter((n) => n.free < rooms).map((n) => n.night)); })
      .catch(() => { if (live) setShortNights([]); })
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, [room.id, checkIn, checkOut, rooms, datesError]);

  const contactValid = !!contact.name.trim() && PHONE_RE.test(contact.phone.trim()) && EMAIL_RE.test(contact.email.trim());
  const canSend = !datesError && !shortNights.length && !checking && guests >= 1 && guests <= maxGuests && contactValid && !sending;

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await requestBooking({
        room_type_id: room.id, check_in: checkIn, check_out: checkOut, guests, rooms,
        buyer_name: contact.name.trim(), buyer_phone: contact.phone.trim(), buyer_email: contact.email.trim(),
        ...(contact.notes.trim() ? { notes: contact.notes.trim() } : {}),
      });
      setDone({ token: res.access_token });
    } catch (err) {
      const e = err as { code?: string; nights?: string[]; error?: string };
      if (e?.code === 'ROOMS_UNAVAILABLE' && Array.isArray(e.nights)) setShortNights(e.nights);
      else setError(e?.error || t('rooms.sendFailed', 'Could not send the booking request. Please try again.'));
    } finally { setSending(false); }
  };

  const money = (n: number) => `${n.toLocaleString()} ${room.currency}`;
  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="booking-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card text-card-foreground p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="booking-title" className="font-semibold flex items-center gap-2">
            {done ? <Check className="w-5 h-5 text-success" aria-hidden="true" /> : <BedDouble className="w-5 h-5 text-primary" aria-hidden="true" />}
            {done ? t('rooms.requestSent', 'Booking request sent') : t('rooms.bookTitle', 'Book a room')}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary" aria-label={t('common.close', 'Close')}><X className="w-5 h-5" /></button>
        </div>

        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="font-medium">{room.name}</p>
          <p className="text-sm text-muted-foreground">{money(room.price_per_night)} {t('rooms.perNight', '/ night')}{businessName ? ` · ${businessName}` : ''}</p>
        </div>

        {done ? (
          <div className="space-y-3 text-sm" role="status">
            <p>{t('rooms.heldNote', 'Your rooms are held for 48 hours while the hotel confirms. Nothing is paid yet: once confirmed, your booking page shows how to pay the hotel directly.')}</p>
            <p className="font-medium">{formatDay(checkIn)} → {formatDay(checkOut)} · {nights} {nights === 1 ? t('rooms.night', 'night') : t('rooms.nights', 'nights')} · {money(total)}</p>
            <Link href={`/order/${done.token}`} className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground">
              {t('rooms.viewBooking', 'View my booking')}
            </Link>
            <p className="text-xs text-muted-foreground">{t('rooms.keepPrivate', 'We emailed you this link. Keep it private: anyone with it can see your booking.')}</p>
          </div>
        ) : (
          <>
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="sr-only">{t('rooms.dates', 'Dates')}</legend>
              <div className="space-y-1">
                <Label htmlFor="booking-in">{t('rooms.checkIn', 'Check-in')}</Label>
                <Input id="booking-in" type="date" min={first} max={addDays(first, 365)} value={checkIn}
                  onChange={(e) => { const v = e.target.value; setCheckIn(v); if (v && (!checkOut || checkOut <= v)) setCheckOut(addDays(v, 1)); }} className="h-11" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="booking-out">{t('rooms.checkOut', 'Check-out')}</Label>
                <Input id="booking-out" type="date" min={checkIn ? addDays(checkIn, 1) : first} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-11" />
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="booking-guests">{t('rooms.guests', 'Guests')}</Label>
                <Input id="booking-guests" type="number" inputMode="numeric" min={1} max={maxGuests} value={guests} onChange={(e) => setGuests(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="h-11" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="booking-rooms">{t('rooms.rooms', 'Rooms')}</Label>
                <Input id="booking-rooms" type="number" inputMode="numeric" min={1} max={room.units} value={rooms} onChange={(e) => setRooms(Math.min(room.units, Math.max(1, Math.floor(Number(e.target.value) || 1))))} className="h-11" />
              </div>
            </div>

            <div aria-live="polite" className="text-sm">
              {datesError ? <p className="text-destructive">{datesError}</p>
                : guests > maxGuests ? <p className="text-destructive">{t('rooms.tooManyGuests', 'Up to {{n}} guests for this many rooms', { n: maxGuests }).replace('{{n}}', String(maxGuests))}</p>
                : shortNights.length ? (
                  <p data-testid="booking-unavailable" className="text-destructive">
                    {t('rooms.notAvailable', 'Not available on')}: {shortNights.map((n) => formatDay(n)).join(', ')}. {t('rooms.tryOther', 'Try other dates or fewer rooms.')}
                  </p>
                ) : checking ? <p className="text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> {t('rooms.checking', 'Checking availability…')}</p>
                : <p data-testid="booking-summary" className="font-medium">{nights} {nights === 1 ? t('rooms.night', 'night') : t('rooms.nights', 'nights')} · {rooms} {rooms === 1 ? t('rooms.room', 'room') : t('rooms.roomsLower', 'rooms')} · {money(total)}</p>}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('rooms.yourDetails', 'Your details')}</legend>
              <Label htmlFor="booking-name" className="sr-only">{t('rooms.name', 'Full name')}</Label>
              <Input id="booking-name" autoComplete="name" placeholder={t('rooms.name', 'Full name')} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="h-11" />
              <Label htmlFor="booking-phone" className="sr-only">{t('rooms.phone', 'Phone')}</Label>
              <Input id="booking-phone" type="tel" autoComplete="tel" placeholder={t('rooms.phone', 'Phone')} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="h-11" />
              <Label htmlFor="booking-email" className="sr-only">{t('rooms.email', 'Email')}</Label>
              <Input id="booking-email" type="email" autoComplete="email" placeholder={t('rooms.email', 'Email')} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="h-11" />
              <Label htmlFor="booking-notes" className="sr-only">{t('rooms.notes', 'Anything the hotel should know (optional)')}</Label>
              <textarea id="booking-notes" rows={2} maxLength={2000} placeholder={t('rooms.notes', 'Anything the hotel should know (optional)')} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </fieldset>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full rounded-full h-11" onClick={send} disabled={!canSend}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : t('rooms.sendRequest', 'Send booking request')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('rooms.noPayment', 'Nothing is charged now. The hotel confirms first; NodBusiness never receives your money.')}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
