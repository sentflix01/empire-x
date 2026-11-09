'use client';
/**
 * The brand video inside a logo circle. It plays once, then fades out to the
 * sharp vector logo behind it (the circle's background). Without motion or
 * with data saving on, only the vector logo shows (audit F-045).
 */
import { useState } from 'react';
import { BRAND_INTRO_VIDEO, useBrandMotion } from '@/lib/brandMotion';
import { cn } from '@/lib/utils';

export default function BrandIntroVideo({ className = 'absolute inset-0 w-full h-full object-cover block' }: { className?: string }) {
  const allowed = useBrandMotion();
  const [done, setDone] = useState(false);
  if (!allowed) return null;
  return (
    <video
      src={BRAND_INTRO_VIDEO}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={() => setDone(true)}
      onError={() => setDone(true)}
      className={cn(className, 'transition-opacity duration-300', done && 'opacity-0')}
      aria-hidden="true"
    />
  );
}
