/**
 * The Business feed: one server call, a distance chip and a Friend/Following
 * tag on each card, and "Near you" that asks for location and reloads
 * nearest first (GET /api/feed/businesses).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http, apiFetch: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'viewer-1' } }) }));
vi.mock('@/lib/messaging', () => ({ useStartChat: () => ({ start: vi.fn() }) }));
vi.mock('@/components/feed/BusinessSpotlight', () => ({ default: () => <div data-testid="spotlight" /> }));

import BusinessShowroomFeed from '@/components/feed/BusinessShowroomFeed';

const page = (sort: string) => ({
  data: {
    items: [
      { type: 'business', record: { id: 'b1', owner_id: 'o1', business_name: 'Dawit Fashion', business_category: 'shop', created_at: '2026-11-01T00:00:00Z' }, distance_km: sort === 'nearest' ? 1.5 : null, relationship: 'friend', rating_avg: 4.5, rating_count: 12 },
      { type: 'business', record: { id: 'b2', owner_id: 'o2', business_name: 'Sara Bakery', business_category: 'food', created_at: '2026-11-02T00:00:00Z' }, distance_km: sort === 'nearest' ? 3 : null, relationship: 'following' },
    ],
    owners: { o1: { display_name: 'Dawit' }, o2: { display_name: 'Sara' } },
    next_offset: null,
  },
});

beforeEach(() => {
  http.get.mockReset();
  http.get.mockImplementation((_url: string, opts: { params: { sort: string } }) => Promise.resolve(page(opts.params.sort)));
  Object.defineProperty(navigator, 'permissions', { value: { query: () => Promise.resolve({ state: 'prompt' }) }, configurable: true });
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 9.03, longitude: 38.75 } }) },
    configurable: true,
  });
});

describe('Business feed', () => {
  it('loads newest first in one call and tags friends', async () => {
    render(<BusinessShowroomFeed />);
    expect(await screen.findByText('Dawit Fashion')).toBeTruthy();
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get.mock.calls[0][0]).toBe('/api/feed/businesses');
    expect(http.get.mock.calls[0][1].params.sort).toBe('recent');
    const tags = screen.getAllByTestId('biz-relationship').map((el) => el.textContent);
    expect(tags).toEqual(['Friend', 'Following']);
    expect(screen.queryByTestId('biz-distance')).toBeNull();
    // Only the reviewed business shows stars.
    const ratings = screen.getAllByTestId('rating-summary');
    expect(ratings).toHaveLength(1);
    expect(ratings[0].textContent).toMatch(/4\.5.*12 reviews/);
  });

  it('"Near you" asks for location and shows distances nearest first', async () => {
    render(<BusinessShowroomFeed />);
    await screen.findByText('Dawit Fashion');
    fireEvent.click(screen.getByRole('button', { name: /Near you/ }));
    await waitFor(() => expect(screen.getAllByTestId('biz-distance')).toHaveLength(2));
    const last = http.get.mock.calls.at(-1)!;
    expect(last[1].params).toMatchObject({ sort: 'nearest', lat: '9.03', lon: '38.75' });
    expect(screen.getAllByTestId('biz-distance')[0].textContent).toContain('1.5 km away');
    expect(screen.getByRole('button', { name: /Near you/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('"Near you" lets the viewer choose how far to look', async () => {
    render(<BusinessShowroomFeed />);
    await screen.findByText('Dawit Fashion');
    fireEvent.click(screen.getByRole('button', { name: /Near you/ }));
    await waitFor(() => expect(screen.getAllByTestId('biz-distance')).toHaveLength(2));
    expect(screen.getByTestId('distance-label').textContent).toBe('Anywhere');
    fireEvent.click(screen.getByLabelText('Anywhere (no distance limit)'));
    await waitFor(() => expect(http.get.mock.calls.at(-1)![1].params).toMatchObject({ sort: 'nearest', radius_km: '10' }));
    // Nothing that close: the distance stays on screen to look farther.
    http.get.mockResolvedValue({ data: { items: [], owners: {}, next_offset: null } });
    fireEvent.click(screen.getByRole('button', { name: 'Closer' }));
    expect(await screen.findByTestId('feed-none-in-range')).toBeTruthy();
    expect(screen.getByTestId('distance-range')).toBeTruthy();
    expect(http.get.mock.calls.at(-1)![1].params.radius_km).toBe('9');
  });

  it('starts nearest first when location is already allowed', async () => {
    Object.defineProperty(navigator, 'permissions', { value: { query: () => Promise.resolve({ state: 'granted' }) }, configurable: true });
    render(<BusinessShowroomFeed />);
    await waitFor(() => expect(screen.getAllByTestId('biz-distance')).toHaveLength(2));
    expect(http.get.mock.calls.every((c) => c[1].params.sort === 'nearest')).toBe(true);
  });
});
