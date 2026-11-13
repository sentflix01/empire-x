/**
 * Business reviews from verified customers: the shared stars, the summary
 * line, and the "Rate this business" prompt on a completed order.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ default: http, apiFetch: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { StarRating, RatingSummary } from '@/components/ui/Stars';
import RateBusinessPrompt from '@/components/orders/RateBusinessPrompt';
import BusinessReviews from '@/components/business/BusinessReviews';

beforeEach(() => { http.get.mockReset(); http.post.mockReset(); });

describe('Stars', () => {
  it('summary is hidden without reviews and shows "4.5 · 2 reviews" with them', () => {
    const { container, rerender } = render(<RatingSummary average={0} count={0} />);
    expect(container.textContent).toBe('');
    rerender(<RatingSummary average="4.50" count={2} />);
    expect(screen.getByTestId('rating-summary').textContent).toMatch(/4\.5.*2 reviews/);
    rerender(<RatingSummary average={5} count={1} />);
    expect(screen.getByTestId('rating-summary').textContent).toMatch(/1 review$/);
  });

  it('interactive stars are a radio group', () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} label="Rate" />);
    expect(screen.getByRole('radiogroup', { name: 'Rate' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '2 stars' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});

describe('RateBusinessPrompt', () => {
  it('stays hidden when the viewer may not review', async () => {
    http.get.mockResolvedValue({ data: { can_review: false, reason: 'no_completed_order', review: null } });
    render(<RateBusinessPrompt businessId="b1" />);
    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/api/businesses/b1/reviews/mine'));
    expect(screen.queryByTestId('rate-business')).toBeNull();
  });

  it('lets a verified customer send stars and a comment', async () => {
    http.get.mockResolvedValue({ data: { can_review: true, reason: null, review: null } });
    http.post.mockResolvedValue({ data: { review: {}, average_rating: 4, review_count: 1 } });
    render(<RateBusinessPrompt businessId="b1" businessName="Sara Hotel" />);
    expect(await screen.findByText(/Rate this business: Sara Hotel/)).toBeTruthy();
    const send = screen.getByRole('button', { name: 'Send review' });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    fireEvent.change(screen.getByLabelText('Comment (optional)'), { target: { value: ' Great stay ' } });
    fireEvent.click(send);
    await screen.findByTestId('rate-business-done');
    expect(http.post).toHaveBeenCalledWith('/api/businesses/b1/reviews', { rating: 4, comment: 'Great stay' });
  });

  it('prefills an existing review for editing', async () => {
    http.get.mockResolvedValue({ data: { can_review: true, reason: null, review: { id: 'r1', rating: 3, comment: 'ok' } } });
    render(<RateBusinessPrompt businessId="b1" />);
    expect(await screen.findByRole('button', { name: 'Update review' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '3 stars' }).getAttribute('aria-checked')).toBe('true');
  });
});

describe('BusinessReviews', () => {
  it('lists reviews with the average', async () => {
    http.get.mockResolvedValue({ data: { reviews: [{ id: 'r1', business_id: 'b1', reviewer_id: 'u1', rating: 5, comment: 'Lovely', created_at: '2026-11-01T00:00:00Z', reviewer_name: 'Hana' }], average_rating: 5, review_count: 1, next_offset: null } });
    render(<BusinessReviews businessId="b1" />);
    expect(await screen.findByText('Lovely')).toBeTruthy();
    expect(screen.getByText('Hana')).toBeTruthy();
    expect(screen.getAllByTestId('business-review')).toHaveLength(1);
  });

  it('renders nothing for a business without reviews', async () => {
    http.get.mockResolvedValue({ data: { reviews: [], average_rating: 0, review_count: 0, next_offset: null } });
    const { container } = render(<BusinessReviews businessId="b1" />);
    await waitFor(() => expect(http.get).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
