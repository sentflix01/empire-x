'use client';
/**
 * NavigationProgress — thin top progress bar shown during route transitions.
 *
 * Zero dependencies: uses only usePathname + useSearchParams from next/navigation
 * and a CSS animation — no nprogress, no external packages.
 *
 * How it works:
 *   - Renders a fixed 3px bar at the top of the viewport.
 *   - When pathname or searchParams change, the bar animates from 0→85% quickly,
 *     then holds until the next render cycle confirms the new page has mounted,
 *     at which point it completes to 100% and fades out.
 *   - On the very first mount we suppress the bar (it would flash on cold load).
 */
import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { token } from '@/lib/colorTokens';

interface BarState {
  active: boolean;   // bar is visible and advancing
  width: number;     // 0–100
  completing: boolean; // transitioning to 100% before fade
}

export default function NavigationProgress() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [bar, setBar] = useState<BarState>({ active: false, width: 0, completing: false });
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(false);   // suppress flash on first mount
  const prevKeyRef   = useRef('');

  const key = pathname + (searchParams?.toString() ? '?' + searchParams.toString() : '');

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevKeyRef.current = key;
      return;
    }
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    // Clear any previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Start bar at 20% and advance to 85% over 400ms
    setBar({ active: true, width: 20, completing: false });

    // Ramp up in steps
    timerRef.current = setTimeout(() => setBar(b => ({ ...b, width: 60 })), 80);
    timerRef.current = setTimeout(() => setBar(b => ({ ...b, width: 85 })), 300);

    // After a short delay, complete and fade out
    timerRef.current = setTimeout(() => {
      setBar({ active: true, width: 100, completing: true });
      timerRef.current = setTimeout(() => {
        setBar({ active: false, width: 0, completing: false });
      }, 300);
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key]);

  if (!bar.active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bar.width}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: '3px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${bar.width}%`,
          background: token.primary,
          transition: bar.completing
            ? 'width 0.2s ease-out, opacity 0.3s ease-out'
            : 'width 0.4s ease-out',
          opacity: bar.completing ? 0 : 1,
          boxShadow: '0 0 10px rgba(37,99,235,0.7)',
        }}
      />
    </div>
  );
}
