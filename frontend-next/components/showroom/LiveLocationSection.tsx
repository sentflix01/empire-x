'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { getIO } from '@/lib/socket';
import client from '@/api/client';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

interface Spot { lat: number; lng: number; label?: string | null; updated_at: string }

/** OpenStreetMap embed around a point (no key needed). */
export function osmEmbedUrl(lat: number, lng: number): string {
  const d = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function minutesAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 1 ? 'just now' : mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
}

/**
 * The owner's live position on their website: visitors see a map while the
 * owner shares it (positions older than 10 minutes are not shown, by the
 * API). Only the owner sees "Share my location now".
 */
export function LiveLocationSection({ businessId, title = 'Find us live', isOwner = false, themeColor = '#2563EB' }: {
  businessId?: string | null;
  title?: string;
  isOwner?: boolean;
  themeColor?: string;
}) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(Boolean(businessId));
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const { data } = await client.get(`/api/locations/${businessId}`);
      setSpot(data?.available ? { lat: data.lat, lng: data.lng, label: data.label, updated_at: data.updated_at } : null);
    } catch {
      setSpot(null);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    void load();
    const io = getIO();
    if (!io) return;
    io.emit('join_business_tracking', businessId);
    const onUpdate = (data: Spot & { business_id: string }) => {
      if (data.business_id === businessId) setSpot({ lat: data.lat, lng: data.lng, label: data.label, updated_at: data.updated_at });
    };
    io.on('location_update', onUpdate);
    return () => {
      io.off('location_update', onUpdate);
      io.emit('leave_business_tracking', businessId);
    };
  }, [businessId, load]);

  const share = () => {
    if (!navigator.geolocation) { toast.error('This device cannot share its location.'); return; }
    setSharing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await client.post('/api/locations/update', { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: pos.coords.accuracy });
          toast.success('Your location is on your website for the next 10 minutes.');
          await load();
        } catch (err) {
          toast.error(apiErrorMessage(err, 'Could not share your location.'));
        } finally { setSharing(false); }
      },
      () => { setSharing(false); toast.error('Allow location access to share where you are.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="px-5 py-10 bg-secondary/20">
      <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
        <Navigation className="w-5 h-5" style={{ color: themeColor }} aria-hidden="true" />{title}
      </h2>
      {loading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Looking for the latest location…</p>
      ) : spot ? (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden h-56 border border-border/40">
            <iframe src={osmEmbedUrl(spot.lat, spot.lng)} title={`${title} map`} className="w-full h-full border-none" loading="lazy" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Updated {minutesAgo(spot.updated_at)}{spot.label ? ` · ${spot.label}` : ''}</span>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1 rounded-full px-4 text-sm font-semibold text-white" style={{ backgroundColor: themeColor }}>
              <MapPin className="h-4 w-4" aria-hidden="true" />Directions
            </a>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-border/40 bg-card p-5 text-center text-sm text-muted-foreground">
          {businessId ? 'Not sharing a live location right now. Check back soon.' : 'Your live location shows here once your website is published.'}
        </p>
      )}
      {isOwner && businessId && (
        <button type="button" onClick={share} disabled={sharing}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50">
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Navigation className="h-4 w-4" aria-hidden="true" />}
          Share my location now
        </button>
      )}
    </div>
  );
}

export default LiveLocationSection;
