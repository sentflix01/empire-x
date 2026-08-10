import { StateCreator } from 'zustand';
import client from '@/api/client';
import { toast } from 'sonner';

export interface SavedItem {
  target_id: string;
  target_type: 'post' | 'product' | 'showroom' | 'task';
  title?: string;
  thumbnailUrl?: string;
}

export interface BookmarksSlice {
  savedIds: Record<string, SavedItem>;
  isHydrating: boolean;
  error: string | null;

  // Selector
  isSaved: (targetId: string) => boolean;

  // Actions
  hydrate: () => Promise<void>;
  toggleSave: (
    targetId: string,
    targetType: SavedItem['target_type'],
    itemData?: Pick<SavedItem, 'title' | 'thumbnailUrl'>
  ) => Promise<void>;
}

export const createBookmarksSlice: StateCreator<BookmarksSlice, [], [], BookmarksSlice> = (set, get) => ({
  savedIds: {},
  isHydrating: false,
  error: null,

  isSaved: (targetId) => Object.prototype.hasOwnProperty.call(get().savedIds, targetId),

  hydrate: async () => {
    // Guard against concurrent calls
    if (get().isHydrating) return;

    set({ isHydrating: true, error: null });
    try {
      const { data } = await client.get('/api/saves');
      const records = Array.isArray(data) ? data : [];
      const savedIds: Record<string, SavedItem> = {};
      for (const record of records) {
        savedIds[record.target_id] = {
          target_id: record.target_id,
          target_type: record.target_type,
        };
      }
      set({ savedIds, isHydrating: false });
    } catch (err: any) {
      // Leave savedIds unchanged on failure
      set({
        isHydrating: false,
        error: err?.error || err?.message || 'Failed to load bookmarks',
      });
    }
  },

  toggleSave: async (targetId, targetType, itemData) => {
    // Snapshot current state for rollback
    const snapshot = get().savedIds;

    // Optimistic update: add or remove
    const newSavedIds = { ...snapshot };
    if (Object.prototype.hasOwnProperty.call(newSavedIds, targetId)) {
      delete newSavedIds[targetId];
    } else {
      newSavedIds[targetId] = {
        target_id: targetId,
        target_type: targetType,
        title: itemData?.title,
        thumbnailUrl: itemData?.thumbnailUrl,
      };
    }
    set({ savedIds: newSavedIds, error: null });

    try {
      const { data } = await client.post('/api/saves/toggle', {
        target_id: targetId,
        target_type: targetType,
      });

      // Reconcile from API response: { saved: boolean }
      const current = get().savedIds;
      if (data?.saved === true && !Object.prototype.hasOwnProperty.call(current, targetId)) {
        set({
          savedIds: {
            ...current,
            [targetId]: {
              target_id: targetId,
              target_type: targetType,
              title: itemData?.title,
              thumbnailUrl: itemData?.thumbnailUrl,
            },
          },
        });
      } else if (data?.saved === false && Object.prototype.hasOwnProperty.call(current, targetId)) {
        const reconciled = { ...current };
        delete reconciled[targetId];
        set({ savedIds: reconciled });
      }
    } catch (err: any) {
      // Rollback to snapshot
      set({
        savedIds: snapshot,
        error: err?.error || err?.message || 'Failed to update bookmark',
      });
      toast.error('Failed to update bookmark');
    }
  },
});
