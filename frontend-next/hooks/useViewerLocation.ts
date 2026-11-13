'use client';
/**
 * The viewer's position for "near you" features (Business feed, search, maps).
 *
 * Asks the browser once, on request. When location is blocked, unsupported or
 * slow, it falls back to central Addis Ababa and says so (status "fallback"),
 * so lists still work. Nothing is stored or sent until a feature uses it.
 */
import { useCallback, useState } from 'react';

export type ViewerLocation = { lat: number; lon: number };
export type ViewerLocationStatus = 'idle' | 'locating' | 'ok' | 'fallback';

/** Central Addis Ababa: the reference market's default. */
export const DEFAULT_VIEWER_LOCATION: ViewerLocation = { lat: 9.0192, lon: 38.7525 };

export function useViewerLocation() {
  const [location, setLocation] = useState<ViewerLocation | null>(null);
  const [status, setStatus] = useState<ViewerLocationStatus>('idle');

  const request = useCallback((): Promise<ViewerLocation> => new Promise((resolve) => {
    const fallback = () => {
      setLocation(DEFAULT_VIEWER_LOCATION);
      setStatus('fallback');
      resolve(DEFAULT_VIEWER_LOCATION);
    };
    if (typeof navigator === 'undefined' || !navigator.geolocation) { fallback(); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation(loc);
        setStatus('ok');
        resolve(loc);
      },
      fallback,
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }), []);

  return { location, status, request };
}
