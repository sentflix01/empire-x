'use client';
import { useSyncExternalStore } from 'react';

/**
 * True while the CSS media query matches. The server and the first browser
 * render use `serverValue`, so the HTML matches; it updates right after.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
      const mq = window.matchMedia(query);
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

/** Tablet and wider: the chat list and the chat side by side. */
export const useSplitMessages = () => useMediaQuery('(min-width: 768px)');
