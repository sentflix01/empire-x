/**
 * feed.ts — the Business feed, built on the server (GET /api/feed/businesses).
 *
 * Items come merged and ordered (nearest first or newest), each with a
 * distance rounded to 0.5 km (null without a map pin) and the viewer's
 * relationship with the owner. Owner display details come in one map.
 */
import client from './client';

export type FeedRelationship = 'friend' | 'following' | null;

export interface BusinessFeedItem {
  type: 'business' | 'showroom';
  record: Record<string, unknown>;
  distance_km: number | null;
  relationship: FeedRelationship;
  /** Average stars from verified customers; null when nobody has reviewed. */
  rating_avg?: number | null;
  rating_count?: number;
}

export interface FeedOwner {
  display_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  is_seed?: boolean;
  ticker_text?: string | null;
  ticker_type?: string | null;
}

export interface BusinessFeedPage {
  items: BusinessFeedItem[];
  owners: Record<string, FeedOwner>;
  next_offset: number | null;
}

export type BusinessFeedSort = 'nearest' | 'recent';

export async function fetchBusinessFeed(params: { sort: BusinessFeedSort; lat?: number; lon?: number; radiusKm?: number | null; offset?: number; limit?: number }): Promise<BusinessFeedPage> {
  const query: Record<string, string> = { sort: params.sort, limit: String(params.limit ?? 20), offset: String(params.offset ?? 0) };
  if (params.lat !== undefined && params.lon !== undefined) { query.lat = String(params.lat); query.lon = String(params.lon); }
  // How far the viewer chose to look (nearest first only; null = no limit).
  if (params.sort === 'nearest' && typeof params.radiusKm === 'number') query.radius_km = String(params.radiusKm);
  const { data } = await client.get<BusinessFeedPage>('/api/feed/businesses', { params: query });
  return { items: data?.items ?? [], owners: data?.owners ?? {}, next_offset: data?.next_offset ?? null };
}
