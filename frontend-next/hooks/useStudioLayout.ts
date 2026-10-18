'use client';
import { useEffect, useState, type RefObject } from 'react';

/** Studio's three layouts: phone, tablet (side-by-side preview), desktop (three columns). */
export type StudioLayout = 'phone' | 'tablet' | 'desktop';

// Studio's own width, not the window's: the app's side menus take space on larger screens.
const TABLET_MIN = 520;
const DESKTOP_MIN = 960;

export function layoutForWidth(width: number): StudioLayout {
  if (width >= DESKTOP_MIN) return 'desktop';
  return width >= TABLET_MIN ? 'tablet' : 'phone';
}

/** Window-based guess, used before Studio is measured (and where it can't be). */
function fromWindow(): StudioLayout {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  if (window.matchMedia('(min-width: 1280px)').matches) return 'desktop';
  return window.matchMedia('(min-width: 768px)').matches ? 'tablet' : 'phone';
}

/** Renders one layout at a time, picked from how wide Studio actually is. */
export function useStudioLayout(ref: RefObject<HTMLElement | null>): StudioLayout {
  const [layout, setLayout] = useState<StudioLayout>(fromWindow);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setLayout(layoutForWidth(width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return layout;
}
