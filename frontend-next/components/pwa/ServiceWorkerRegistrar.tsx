'use client';
/**
 * Registers the service worker after the page has loaded (production only),
 * so the offline page and push notifications work (audit F-048).
 */
import { useEffect } from 'react';
import { registerSW } from '@/lib/push';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => { void registerSW(); };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
