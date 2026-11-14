'use client';
/**
 * The round brand icon with its globe turning two full turns (720°): once when
 * the page opens, and again when someone hovers or taps it. It then rests, so
 * there is no endless motion to pause (WCAG 2.2.2; owner decision 2026-11-14).
 * People who ask for reduced motion see it still: the global
 * prefers-reduced-motion rule in app/globals.css shortens the animation to
 * nothing. The ring is a perfect circle, so turning the whole icon reads as
 * the globe turning inside it.
 */
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brandAssets';
import { cn } from '@/lib/utils';

/** Length of one 720° spin; must match .animate-globe-spin in app/globals.css. */
export const GLOBE_SPIN_MS = 2400;

export default function SpinningGlobeIcon({ className, onBlue = true }: { className?: string; onBlue?: boolean }) {
  const [turn, setTurn] = useState(0);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    if (!spinning) return;
    const timer = setTimeout(() => setSpinning(false), GLOBE_SPIN_MS);
    return () => clearTimeout(timer);
  }, [spinning, turn]);

  const replay = () => {
    if (spinning) return; // never restart mid-turn
    setSpinning(true);
    setTurn((t) => t + 1);
  };

  return (
    <span className={cn('relative block shrink-0 rounded-full', className)} onMouseEnter={replay} onClick={replay}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small vector logo, no optimisation needed */}
      <img
        key={turn}
        src={onBlue ? BRAND.iconOnBlue : BRAND.icon}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-testid="spinning-globe"
        className="block h-full w-full select-none animate-globe-spin"
      />
    </span>
  );
}
