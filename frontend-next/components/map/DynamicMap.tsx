'use client';
/**
 * DynamicMap — wraps any map-containing component with Next.js dynamic import
 * to prevent SSR errors from Leaflet (which requires window/document).
 *
 * Usage:
 *   import { withNoSSR } from '@/components/map/DynamicMap';
 *   const NearbyMapDynamic = withNoSSR(() => import('@/views/NearbyMap'));
 */
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import React from 'react';

const MapLoadingFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-secondary/20 rounded-2xl">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      <p className="text-sm text-muted-foreground">Loading map…</p>
    </div>
  </div>
);

/**
 * Wraps a component import so it only renders on the client (no SSR).
 * Use for any component that imports leaflet/react-leaflet.
 */
export function withNoSSR<T extends object>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>
) {
  return dynamic(importFn, {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  });
}

// Pre-built dynamic wrappers for the two map pages
export const NearbyMapDynamic = dynamic(
  () => import('@/views/NearbyMap'),
  { ssr: false, loading: () => <MapLoadingFallback /> }
);

export const HomeDynamic = dynamic(
  () => import('@/views/Home'),
  { ssr: false, loading: () => <MapLoadingFallback /> }
);

// HomeMapTab — loaded only on client, completely isolated from Turbopack static analysis
export const HomeMapTabDynamic = dynamic(
  () => import('@/components/map/HomeMapTab'),
  { ssr: false, loading: () => <MapLoadingFallback /> }
);

