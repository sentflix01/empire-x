/**
 * Bugs found while typing the map screens (F-052 follow-up 6, @types/leaflet):
 * - Nearby product prices and map search matches printed decimal strings
 *   unformatted ("1500000.00"), and search matches fell back to USD;
 * - a picture saved as a plain URL (not a JSON list) was dropped;
 * - without browser location support, Nearby set the default centre but
 *   never loaded products, so the list stayed empty.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'viewer-1', full_name: 'Viewer' } }) }));
vi.mock('@/components/profile/ProfilePeek', () => ({ default: () => null }));
// The map itself is not under test here; keep Leaflet out of jsdom.
vi.mock('leaflet', () => { throw new Error('no map in tests'); });
vi.mock('react-leaflet', () => { throw new Error('no map in tests'); });
vi.mock('react-leaflet-cluster', () => { throw new Error('no map in tests'); });

import client from '@/api/client';
import NearbyMap from '@/views/NearbyMap';
import { SearchResultBusinessCard } from '@/components/map/HomeMapTab';

beforeEach(() => {
  vi.mocked(client.get).mockReset();
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
});

describe('Nearby products', () => {
  it('loads products without browser location and formats prices', async () => {
    vi.mocked(client.get).mockImplementation((async (url: string) => (url === '/api/maps/nearby'
      ? { data: { products: [{ id: 'p1', seller_id: 's1', title: 'Sofa', price: '1500000.00', currency: 'ETB', images: '/uploads/sofa.jpg', latitude: '9.0100000', longitude: '38.7600000', distance_km: 1.2 }] } }
      : { data: [] })) as never);
    render(<NearbyMap />);
    expect(await screen.findByText('Sofa')).toBeInTheDocument();
    expect(screen.getByText(`${(1500000).toLocaleString()} ETB`)).toBeInTheDocument();
    expect(screen.getByAltText('Sofa')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('1 nearby products')).toBeInTheDocument());
  });
});

describe('Map search business card', () => {
  it('formats matched product prices and falls back to ETB', () => {
    render(
      <SearchResultBusinessCard
        query="coffee"
        onOpenProfile={() => {}}
        business={{ id: 'b1', owner_id: 'o1', business_name: 'Coffee Corner', matched_products: [
          { id: 'm1', title: 'Beans', price: '2500.00', images: '["/uploads/beans.jpg"]' },
        ] }}
      />,
    );
    expect(screen.getByText(`${(2500).toLocaleString()} ETB`)).toBeInTheDocument();
    expect(screen.queryByText(/USD/)).toBeNull();
  });
});
