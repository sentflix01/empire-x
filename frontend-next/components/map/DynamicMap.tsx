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
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

/**
 * The feed's own placeholder while it loads: the shape of the feed (post box
 * and two posts), never "Loading map…" — that was the first thing a new
 * account saw (new-user audit NU-9).
 */
export const FeedLoadingFallback = () => (
  <div className="mx-auto max-w-xl space-y-4" role="status" aria-label="Loading your feed">
    <div className="h-16 animate-pulse rounded-2xl border border-border/50 bg-card motion-reduce:animate-none" />
    {[0, 1].map((i) => (
      <div key={i} className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
          <div className="h-3 w-32 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
        </div>
        <div className="h-3 w-full animate-pulse rounded bg-secondary motion-reduce:animate-none" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);

export const HomeDynamic = dynamic(
  () => import('@/views/Home'),
  { ssr: false, loading: () => <FeedLoadingFallback /> }
);

// HomeMapTab — loaded only on client, completely isolated from Turbopack static analysis
export const HomeMapTabDynamic = dynamic(
  () => import('@/components/map/HomeMapTab'),
  { ssr: false, loading: () => <MapLoadingFallback /> }
);

