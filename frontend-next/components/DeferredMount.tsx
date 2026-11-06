'use client';
/**
 * Renders its children only once the page has loaded and the browser is idle
 * (or after `timeout` ms), so optional widgets do not compete with the first
 * paint and hydration on slow phones (audit F-045).
 */
import { useEffect, useState, type ReactNode } from 'react';

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

export default function DeferredMount({ children, timeout = 3000 }: { children: ReactNode; timeout?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as IdleWindow;
    let idleId: number | undefined;
    let timer: number | undefined;
    const schedule = () => {
      if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => setReady(true), { timeout });
      else timer = window.setTimeout(() => setReady(true), 200);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [timeout]);
  return ready ? <>{children}</> : null;
}
