'use client';
/**
 * Loads Leaflet and react-leaflet on the client only (Leaflet needs window),
 * with its stylesheet and default marker images, and returns the pieces the
 * pin picker uses. Shared so maps don't each repeat the setup.
 */
import { useEffect, type ComponentType } from 'react';

export type LeafletKit = {
  MapContainer: ComponentType<any>;
  TileLayer: ComponentType<any>;
  Marker: ComponentType<any>;
  /** Calls onPick(lat, lng) when the map is tapped. */
  ClickToPin: ComponentType<{ onPick: (lat: number, lng: number) => void }>;
  /** Moves the map to center when it changes. */
  FlyTo: ComponentType<{ center: [number, number] }>;
};

let pending: Promise<LeafletKit> | null = null;

export function loadLeaflet(): Promise<LeafletKit> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Leaflet needs a browser'));
  if (pending) return pending;
  pending = (async () => {
    const href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
    const [rl, leaflet] = await Promise.all([import('react-leaflet'), import('leaflet')]);
    const L = leaflet.default;
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
      rl.useMapEvents({ click: (e: { latlng: { lat: number; lng: number } }) => onPick(e.latlng.lat, e.latlng.lng) });
      return null;
    }
    function FlyTo({ center }: { center: [number, number] }) {
      const map = rl.useMap();
      useEffect(() => { map.setView(center, Math.max(map.getZoom(), 15)); }, [map, center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
      return null;
    }
    return { MapContainer: rl.MapContainer as any, TileLayer: rl.TileLayer as any, Marker: rl.Marker as any, ClickToPin, FlyTo };
  })().catch((err) => { pending = null; throw err; });
  return pending;
}
