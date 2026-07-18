import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './authSlice';
import { createNotificationsSlice, NotificationsSlice } from './notificationsSlice';
import { createCartSlice, CartSlice } from './cartSlice';
import { createFeedSlice, FeedSlice } from './feedSlice';

export type AppStore = AuthSlice & NotificationsSlice & CartSlice & FeedSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createNotificationsSlice(...a),
      ...createCartSlice(...a),
      ...createFeedSlice(...a),
    }),
    {
      name: 'empire-x-auth',
      // SSR safe: only use sessionStorage in the browser
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : ({} as Storage)
      ),
      // Only persist the auth slice — cart/feed/notifications are session-transient
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export type { AuthSlice, NotificationsSlice, CartSlice, FeedSlice };
