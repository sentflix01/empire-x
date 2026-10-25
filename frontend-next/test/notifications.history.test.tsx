/**
 * Notification history: the page shows the whole last 7 days, grouped by
 * day, and "Show older" pages further back. The endpoint answers
 * { notifications, next_cursor }; the page used to expect a bare list, so it
 * always showed "all caught up" with nothing in it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' }, authChecked: true }) }));
vi.mock('@/lib/socket', () => ({ connectSocket: vi.fn(), getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import Notifications, { notificationRows } from '@/views/Notifications';

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const n = (id: string, title: string, days: number) => ({ id, title, type: 'order', is_read: true, created_at: ago(days) });

beforeEach(() => { Object.values(http).forEach((f) => f.mockReset()); });

describe('notificationRows', () => {
  it('reads the { notifications } answer, and a bare list', () => {
    expect(notificationRows({ notifications: [n('a', 'A', 0)], next_cursor: null })).toHaveLength(1);
    expect(notificationRows([n('a', 'A', 0)])).toHaveLength(1);
    expect(notificationRows(null)).toEqual([]);
  });
});

describe('Notifications page', () => {
  it('shows the last 7 days grouped by day, then older ones on request', async () => {
    http.get.mockImplementation((_url: string, cfg?: { params?: Record<string, unknown> }) => {
      if (cfg?.params?.days) return Promise.resolve({ data: { notifications: [n('1', 'New order', 0), n('2', 'Order shipped', 1), n('3', 'Paid', 5)], next_cursor: null } });
      return Promise.resolve({ data: { notifications: [n('4', 'Old order', 12)], next_cursor: null } });
    });
    render(<Notifications />);
    expect(await screen.findByText('New order')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/api/notifications', { params: { days: 7, limit: 500 } });
    expect(screen.getByText('Order shipped')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Yesterday' })).toBeTruthy();
    expect(screen.queryByText('notifications.allCaughtUp')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show older' }));
    expect(await screen.findByText('Old order')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('No older notifications')).toBeTruthy());
  });
});
