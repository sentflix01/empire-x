/** Search has a Businesses tab: rows with a distance badge, nearest first when chosen. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ default: http, apiFetch: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('q=hotel') }));

import Search from '@/views/Search';

beforeEach(() => {
  http.get.mockReset();
  http.get.mockResolvedValue({ data: { businesses: [
    { id: 'b1', owner_id: 'o1', business_name: 'Sunrise Hotel', business_category: 'Hospitality & Tourism', distance_km: 0.5 },
    { id: 'b2', owner_id: 'o2', business_name: 'Blue Nile Inn', business_category: 'Hospitality & Tourism', distance_km: 1.5 },
  ] } });
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 9.03, longitude: 38.75 } }) }, configurable: true });
});

describe('Search: businesses', () => {
  it('shows a Businesses tab with distances and links to the business profile', async () => {
    render(<Search />);
    fireEvent.click(await screen.findByRole('button', { name: /Businesses/ }));
    await waitFor(() => expect(screen.getAllByTestId('search-business')).toHaveLength(2));
    const rows = screen.getAllByTestId('search-business');
    expect(rows[0].textContent).toContain('Sunrise Hotel');
    expect(rows[0].getAttribute('href')).toBe('/profile/o1?view=business');
    const last = http.get.mock.calls.at(-1)!;
    expect(last[1].params).toMatchObject({ q: 'hotel', type: 'businesses' });
  });
});
