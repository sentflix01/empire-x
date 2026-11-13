/**
 * friends.ts — typed API module for the friends feature.
 *
 * Endpoints:
 *   GET /api/friends/mutual — returns up to 50 mutual friend records
 */
import client from './client';

export interface MutualFriend {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  is_following: boolean;
  mutual_count: number;
}

export const friendsApi = {
  async getMutual(): Promise<MutualFriend[]> {
    const res = await client.get<MutualFriend[]>('/api/friends/mutual');
    return res.data;
  },
};
