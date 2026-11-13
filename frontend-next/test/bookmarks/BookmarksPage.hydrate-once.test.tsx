/**
 * Regression test for audit finding F-040: the Bookmarks page re-requested
 * GET /api/saves in an endless loop (~178/s) when the user had no bookmarks,
 * because each successful empty hydrate stored a new `{}` that re-triggered
 * the effect. The page must load bookmarks once per mount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  storeToken: vi.fn(),
  clearToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, authChecked: true, isAuthenticated: true }),
}));

import client from '@/lib/api/client';
import { useAppStore } from '@/store';
import Bookmarks from '@/views/Bookmarks';

// Resolve on a later macrotask, like a real network response, so a looping
// effect shows up as many calls instead of starving the event loop.
const later = <T,>(value: T, fail = false) => () =>
  new Promise<T>((resolve, reject) => setTimeout(() => (fail ? reject(value) : resolve(value)), 0));

const savesCalls = () => vi.mocked(client.get).mock.calls.filter(([url]) => url === '/api/saves').length;

describe('Bookmarks page loads saved items once (F-040)', () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset();
    useAppStore.setState({ savedIds: {}, isHydrating: false, error: null, hasHydrated: false });
  });

  it('does not re-request /api/saves when the user has no bookmarks', async () => {
    vi.mocked(client.get).mockImplementation(later({ data: [] }));
    render(<Bookmarks />);
    await waitFor(() => expect(savesCalls()).toBeGreaterThanOrEqual(1));
    // Give a looping effect plenty of turns to fire again.
    await new Promise((r) => setTimeout(r, 300));
    expect(savesCalls()).toBe(1);
  });

  it('still loads once when the user has bookmarks', async () => {
    vi.mocked(client.get).mockImplementation(later({
      data: [{ target_id: 'p1', target_type: 'product', title: 'Coffee', thumbnail_url: null }],
    }));
    render(<Bookmarks />);
    await waitFor(() => expect(savesCalls()).toBe(1));
    await new Promise((r) => setTimeout(r, 300));
    expect(savesCalls()).toBe(1);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
  });

  it('does not retry in a loop after a failed load', async () => {
    vi.mocked(client.get).mockImplementation(later({ error: 'Too many requests' }, true));
    render(<Bookmarks />);
    await waitFor(() => expect(savesCalls()).toBe(1));
    await new Promise((r) => setTimeout(r, 300));
    expect(savesCalls()).toBe(1);
  });
});
