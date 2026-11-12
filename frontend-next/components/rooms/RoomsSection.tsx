'use client'
/**
 * RoomsSection — the "Rooms & booking" website section: the business's active
 * room types with a price per night and "Check availability", which opens the
 * BookingSheet. In the Studio preview and for the owner it links to the
 * Rooms page where rooms, prices and closed nights are managed.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BedDouble, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SafeImage from '@/components/ui/SafeImage';
import { listRooms, type RoomType } from '@/api/rooms';
import { useAuth } from '@/lib/AuthContext';
import { fillForWhiteText } from '@/lib/contrast';
import BookingSheet from './BookingSheet';

interface Props {
  sectionIndex: number;
  title: string;
  description?: string | null;
  businessId: string | null;
  businessName?: string | null;
  themeColor: string;
  isOwner?: boolean;
  preview?: boolean;
}

export default function RoomsSection({ sectionIndex, title, description, businessId, businessName, themeColor, isOwner = false, preview = false }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomType[] | null>(null);
  const [booking, setBooking] = useState<RoomType | null>(null);

  useEffect(() => {
    if (!businessId) { setRooms([]); return; }
    let live = true;
    listRooms(businessId).then((list) => { if (live) setRooms(list.filter((r) => r.active)); }).catch(() => { if (live) setRooms([]); });
    return () => { live = false; };
  }, [businessId]);

  const manage = (isOwner || preview) && (
    <Link href={businessId ? `/business/rooms?business=${businessId}` : '/business/rooms'} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
      {t('rooms.manage', 'Manage rooms')}
    </Link>
  );

  return (
    <section id={`section-${sectionIndex}`} aria-labelledby={`rooms-title-${sectionIndex}`} className="px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-1 flex-wrap">
          <h2 id={`rooms-title-${sectionIndex}`} className="font-display text-lg font-bold">{title}</h2>
          {manage}
        </div>
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        {rooms === null ? (
          <div className="h-24 rounded-xl bg-secondary/40 animate-pulse" aria-hidden="true" />
        ) : rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isOwner || preview ? t('rooms.emptyOwner', 'No rooms yet. Add your rooms and prices on the Rooms page.') : t('rooms.empty', 'Rooms will be listed here soon.')}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => (
              <li key={room.id} data-testid="room-card" className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col">
                <div className="relative aspect-[16/9] bg-secondary/50 flex items-center justify-center">
                  {room.photo_url
                    ? <SafeImage src={room.photo_url} alt={room.name} className="w-full h-full object-cover" fallback={<BedDouble className="w-8 h-8 text-muted-foreground" aria-hidden="true" />} />
                    : <BedDouble className="w-8 h-8 text-muted-foreground" aria-hidden="true" />}
                </div>
                <div className="p-3 flex flex-1 flex-col gap-1">
                  <h3 className="font-semibold">{room.name}</h3>
                  {room.description && <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>}
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" /> {t('rooms.upTo', 'Up to')} {room.max_guests} {room.max_guests === 1 ? t('rooms.guest', 'guest') : t('rooms.guestsLower', 'guests')}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <p className="text-sm"><strong>{room.price_per_night.toLocaleString()} {room.currency}</strong> <span className="text-muted-foreground">{t('rooms.perNight', '/ night')}</span></p>
                    {!isOwner && (
                      <button type="button" onClick={() => setBooking(room)} disabled={preview}
                        className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        style={{ backgroundColor: fillForWhiteText(themeColor) }}>
                        {t('rooms.checkAvailability', 'Check availability')}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {preview && <p className="mt-3 text-xs text-muted-foreground">{t('rooms.previewNote', 'Visitors can book once your site is published.')}</p>}
      </div>
      {booking && <BookingSheet room={booking} businessName={businessName} buyer={user ? { full_name: (user as { full_name?: string }).full_name, email: (user as { email?: string }).email } : null} onClose={() => setBooking(null)} />}
    </section>
  );
}
