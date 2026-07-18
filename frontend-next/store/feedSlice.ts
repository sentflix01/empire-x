import { StateCreator } from 'zustand';
import client from '@/api/client';

export interface FeedSlice {
  posts: any[];
  isLoading: boolean;
  error: string | null;
  filter: string;
  loadPosts: (filter?: string) => Promise<void>;
  prependPost: (post: any) => void;
}

export const createFeedSlice: StateCreator<FeedSlice, [], [], FeedSlice> = (set) => ({
  posts: [],
  isLoading: false,
  error: null,
  filter: 'all',

  loadPosts: async (filter = 'all') => {
    set({ isLoading: true, error: null, filter });
    try {
      const params =
        filter === 'trending'
          ? { sort: '-like_count', limit: 30 }
          : { feed: 'true', limit: 30 };
      const { data } = await client.get('/api/posts', { params });
      set({ posts: Array.isArray(data) ? data : [], isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.error || err?.message || 'Failed to load feed',
        posts: [],
      });
    }
  },

  prependPost: (post) =>
    set((state) => ({ posts: [post, ...state.posts] })),
});
