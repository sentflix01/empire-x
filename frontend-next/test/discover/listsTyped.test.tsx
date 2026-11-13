/**
 * Bugs found while typing the Showrooms, Explore and Bookmarks screens:
 * - Showrooms compared the category filter with the translated word "All",
 *   so in Amharic ("ሁሉም") the default filter matched nothing and the page
 *   said "No showrooms found";
 * - prices arrive as decimal strings (PostgreSQL NUMERIC); toLocaleString on
 *   a string does nothing, so 1500000 showed as "1500000.00".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const lang = vi.hoisted(() => ({ all: 'All' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => (key === 'common.all' ? lang.all : key) }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  apiFetch: vi.fn(),
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/api/entities', () => ({ entities: { Showroom: { filter: vi.fn() } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'viewer-1' }, authChecked: true }) }));
vi.mock('@/components/ui/BookmarkButton', () => ({ default: () => null }));
vi.mock('@/components/showroom/ShowroomDoctorPanel', () => ({ default: () => null }));
vi.mock('@/components/feed/PostCard', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import client from '@/lib/api/client';
import { entities } from '@/lib/api/entities';
import Showrooms from '@/views/Showrooms';
import Explore from '@/views/Explore';
import Bookmarks from '@/views/Bookmarks';
import { useAppStore } from '@/store';

const sites = [
  { id: 's1', owner_id: 'o1', title: 'Coffee Corner', category: 'business', status: 'published', view_count: 3 },
  { id: 's2', owner_id: 'o2', title: 'Art House', category: 'creative', status: 'published', view_count: 1 },
];

describe('Showrooms category filter', () => {
  beforeEach(() => {
    vi.mocked(entities.Showroom.filter).mockResolvedValue(sites as never);
  });

  it.each([['English', 'All'], ['Amharic', 'ሁሉም']])('lists every site by default in %s', async (_name, word) => {
    lang.all = word;
    render(<Showrooms />);
    expect(await screen.findByText('Coffee Corner')).toBeInTheDocument();
    expect(screen.getByText('Art House')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: word })).toBeInTheDocument();
    expect(screen.queryByText('No showrooms found')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Creative' }));
    expect(screen.queryByText('Coffee Corner')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: word }));
    expect(screen.getByText('Coffee Corner')).toBeInTheDocument();
  });
});

describe('prices that arrive as decimal strings', () => {
  beforeEach(() => vi.mocked(client.get).mockReset());

  it('Explore formats top product prices', async () => {
    vi.mocked(client.get).mockImplementation(async (url: string) => (url === '/api/trending'
      ? { data: { top_products: [{ id: 'p1', title: 'Sofa', price: '1500000.00', currency: 'ETB', images: '["/uploads/sofa.jpg"]' }] } }
      : { data: [] }) as never);
    render(<Explore />);
    expect(await screen.findByText('Sofa')).toBeInTheDocument();
    expect(screen.getByText(`${(1500000).toLocaleString()} ETB`)).toBeInTheDocument();
    expect(screen.queryByText(/1500000\.00/)).toBeNull();
  });

  it('Explore still renders when /api/trending fails', async () => {
    vi.mocked(client.get).mockImplementation(((url: string) =>
      url === '/api/trending' ? Promise.reject(new Error('offline')) : Promise.resolve({ data: [] })) as never);
    render(<Explore />);
    expect(await screen.findByText('explore.title')).toBeInTheDocument();
  });

  it('Bookmarks price alerts format both prices and the percentage', async () => {
    useAppStore.setState({ savedIds: {}, isHydrating: false, error: null, hasHydrated: true });
    vi.mocked(client.get).mockImplementation(async (url: string) => (url === '/api/wishlists/price-alerts'
      ? { data: [{ product_id: 'p1', title: 'Lamp', current_price: '2500.00', target_price: '2000.00', currency: 'ETB', is_triggered: false, images: '/uploads/lamp.jpg' }] }
      : { data: [] }) as never);
    render(<Bookmarks />);
    fireEvent.click(screen.getByRole('button', { name: /bookmarks.alerts/ }));
    await waitFor(() => expect(screen.getByText('Lamp')).toBeInTheDocument());
    expect(screen.getByText(`${(2500).toLocaleString()} ETB`)).toBeInTheDocument();
    expect(screen.getByText((2000).toLocaleString())).toBeInTheDocument();
    // A plain URL in images (not JSON) still shows the thumbnail.
    expect(screen.getByAltText('Lamp')).toBeInTheDocument();
  });
});
