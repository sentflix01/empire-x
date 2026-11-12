'use client';
/**
 * The business owner's map pin (business editor). Tap the map or drag the pin
 * to set it; "Use my location" drops it where the owner is. Customers see
 * only the distance, or a spot rounded to about 1 km, unless the address is
 * public (backend lib/locationPrivacy.ts).
 */
import { useEffect, useState } from 'react';
import { Crosshair, Loader2, MapPin, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_VIEWER_LOCATION, useViewerLocation } from '@/hooks/useViewerLocation';
import { loadLeaflet, type LeafletKit } from '@/components/map/leafletLoader';

export type Pin = { lat: number; lng: number } | null;

type Props = { value: Pin; onChange: (pin: Pin) => void };

export default function LocationPinPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [kit, setKit] = useState<LeafletKit | null>(null);
  const [failed, setFailed] = useState(false);
  const { request, status } = useViewerLocation();

  useEffect(() => {
    let alive = true;
    loadLeaflet().then((k) => { if (alive) setKit(k); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const center: [number, number] = value ? [value.lat, value.lng] : [DEFAULT_VIEWER_LOCATION.lat, DEFAULT_VIEWER_LOCATION.lon];

  async function useMine() {
    const loc = await request();
    onChange({ lat: loc.lat, lng: loc.lon });
  }

  return (
    <div className="space-y-2">
      <div className="relative h-56 overflow-hidden rounded-xl border border-border bg-secondary/30" data-testid="location-pin-map">
        {failed && <p className="p-4 text-sm text-muted-foreground">{t('business.mapUnavailable', 'The map could not load. Check your connection and try again.')}</p>}
        {!failed && !kit && <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" /></div>}
        {kit && (
          <kit.MapContainer center={center} zoom={value ? 16 : 13} style={{ height: '100%', width: '100%' }}>
            <kit.TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <kit.ClickToPin onPick={(lat: number, lng: number) => onChange({ lat, lng })} />
            <kit.FlyTo center={center} />
            {value && (
              <kit.Marker
                position={[value.lat, value.lng]}
                draggable
                eventHandlers={{ dragend: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => { const p = e.target.getLatLng(); onChange({ lat: p.lat, lng: p.lng }); } }}
              />
            )}
          </kit.MapContainer>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={useMine} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-secondary">
          {status === 'locating' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
          {t('business.useMyLocation', 'Use my location')}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary">
            <Trash2 className="h-4 w-4" aria-hidden="true" />{t('business.removePin', 'Remove pin')}
          </button>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {value ? t('business.pinSet', 'Pin set') : t('business.pinHint', 'Tap the map to place your pin')}
        </span>
      </div>
      {status === 'fallback' && <p className="text-xs text-muted-foreground">{t('business.locationBlocked', 'We could not get your location, so the map shows Addis Ababa. Tap the map to place your pin.')}</p>}
    </div>
  );
}
