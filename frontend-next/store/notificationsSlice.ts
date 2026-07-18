import { StateCreator } from 'zustand';
import client from '@/api/client';

export interface NotificationsSlice {
  notifications: any[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  addNotification: (notif: any) => void;
  markAllRead: () => void;
}

export const createNotificationsSlice: StateCreator<NotificationsSlice, [], [], NotificationsSlice> = (set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  loadNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await client.get('/api/notifications?limit=60');
      const list = Array.isArray(data) ? data : [];
      set({
        notifications: list,
        unreadCount: list.filter((n: any) => !n.is_read).length,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.error || err?.message || 'Failed to load notifications',
      });
    }
  },

  addNotification: (notif) =>
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
});
