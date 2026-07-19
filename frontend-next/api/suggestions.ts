/**
 * suggestions.ts — typed API module for the friend suggestions feature.
 *
 * Endpoints:
 *   GET  /api/suggestions/people           — returns up to 20 scored suggestions
 *   POST /api/suggestions/dismiss/:id      — dismisses a suggestion
 */
import client from './client';

export interface Suggestion {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  follower_count: number;
  mutual_count: number;
  is_seed: boolean;
}

export const suggestionsApi = {
  async getPeople(): Promise<Suggestion[]> {
    const res = await client.get<Suggestion[]>('/api/suggestions/people');
    return res.data;
  },

  async dismiss(targetUserId: string): Promise<void> {
    await client.post(`/api/suggestions/dismiss/${targetUserId}`);
  },
};
