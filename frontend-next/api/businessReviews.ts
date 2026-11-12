/**
 * businessReviews.ts — reviews of a business by verified customers
 * (/api/businesses/:id/reviews). Only a signed-in buyer with a completed
 * order may post; one review each, sending again edits it.
 */
import client from './client';

export interface BusinessReview {
  id: string;
  business_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
  reviewer_name?: string | null;
  reviewer_avatar?: string | null;
}

export interface BusinessReviewPage {
  reviews: BusinessReview[];
  average_rating: number;
  review_count: number;
  next_offset: number | null;
}

export interface MyBusinessReview {
  can_review: boolean;
  reason: 'owner' | 'no_completed_order' | null;
  review: BusinessReview | null;
}

export async function fetchBusinessReviews(businessId: string, offset = 0, limit = 5): Promise<BusinessReviewPage> {
  const { data } = await client.get<BusinessReviewPage>(`/api/businesses/${businessId}/reviews`, { params: { offset: String(offset), limit: String(limit) } });
  return { reviews: data?.reviews ?? [], average_rating: Number(data?.average_rating ?? 0), review_count: Number(data?.review_count ?? 0), next_offset: data?.next_offset ?? null };
}

export async function fetchMyBusinessReview(businessId: string): Promise<MyBusinessReview> {
  const { data } = await client.get<MyBusinessReview>(`/api/businesses/${businessId}/reviews/mine`);
  return data;
}

export async function saveBusinessReview(businessId: string, rating: number, comment: string): Promise<{ review: BusinessReview; average_rating: number; review_count: number }> {
  const { data } = await client.post(`/api/businesses/${businessId}/reviews`, { rating, comment: comment.trim() || null });
  return data;
}
