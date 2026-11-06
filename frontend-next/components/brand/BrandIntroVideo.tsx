'use client';
/**
 * The looping brand video inside a logo circle. The circle's SVG background
 * shows first; the small video is added only when motion and data use are
 * allowed (audit F-045).
 */
import { BRAND_INTRO_VIDEO, useBrandMotion } from '@/lib/brandMotion';

export default function BrandIntroVideo({ className = 'absolute inset-0 w-full h-full object-cover block' }: { className?: string }) {
  const allowed = useBrandMotion();
  if (!allowed) return null;
  return <video src={BRAND_INTRO_VIDEO} autoPlay muted playsInline loop preload="auto" className={className} aria-hidden="true" />;
}
