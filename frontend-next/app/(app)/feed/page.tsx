'use client';
/**
 * /feed — Authenticated home feed.
 * Uses dynamic import because the Nearby tab embeds a Leaflet map.
 */
import { HomeDynamic } from '@/components/map/DynamicMap';

export default function FeedPage() {
  return <HomeDynamic />;
}
