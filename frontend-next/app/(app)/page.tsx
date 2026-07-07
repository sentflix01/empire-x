'use client';
/**
 * Home page — uses dynamic import because the Nearby tab embeds a Leaflet map.
 * Leaflet requires window/document so it cannot run on the server.
 */
import { HomeDynamic } from '@/components/map/DynamicMap';
export default function HomePage() {
  return <HomeDynamic />;
}
