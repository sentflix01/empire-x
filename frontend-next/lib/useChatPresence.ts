'use client';

import { useEffect } from 'react';
import client from '@/api/client';

// Messages and an open conversation can briefly coexist during route changes.
// A small module-level reference count prevents one view's cleanup from marking
// the user offline while the other chat view is already active.
let activeChatViews = 0;
let heartbeat: ReturnType<typeof setInterval> | null = null;

function updatePresence(status: 'online' | 'offline') {
  return client.put('/api/messages/presence', { status }).catch(() => {});
}

/** Report a user as online only while a Messages or ChatRoom screen is open. */
export function useChatPresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    activeChatViews += 1;
    const setCurrentVisibility = () => updatePresence(document.visibilityState === 'visible' ? 'online' : 'offline');
    const markOfflineOnPageHide = () => updatePresence('offline');

    if (activeChatViews === 1) {
      setCurrentVisibility();
      // Keep the 15-minute server presence record alive only while this chat UI
      // remains visible.
      heartbeat = setInterval(() => {
        if (document.visibilityState === 'visible') updatePresence('online');
      }, 2 * 60 * 1000);
    }

    document.addEventListener('visibilitychange', setCurrentVisibility);
    window.addEventListener('pagehide', markOfflineOnPageHide);

    return () => {
      document.removeEventListener('visibilitychange', setCurrentVisibility);
      window.removeEventListener('pagehide', markOfflineOnPageHide);
      activeChatViews = Math.max(0, activeChatViews - 1);
      if (activeChatViews === 0) {
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
        updatePresence('offline');
      }
    };
  }, [enabled]);
}
