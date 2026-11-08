/**
 * Whether the brand intro video may play (audit F-045): not when the visitor
 * asks for reduced motion or for data saving. Without the video the static
 * logo (BRAND.icon in lib/brandAssets.ts) is shown.
 */
import { useEffect, useState } from 'react';
import { BRAND } from './brandAssets';

/** 288 px, 62 KB re-encode of the 898 KB original; shown at 144 px at most. */
export const BRAND_INTRO_VIDEO = BRAND.introVideo;

export function brandMotionAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch { /* old browsers: assume motion is fine */ }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

/** False on the server and the first render, so the static logo paints first. */
export function useBrandMotion(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => { setAllowed(brandMotionAllowed()); }, []);
  return allowed;
}
