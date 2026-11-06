/**
 * Delivery tracking on the orders page (audit F-003) calls the backend's
 * real routes and shows an error instead of an empty list when loading fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/api/client', () => ({ default: client }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'seller-1' } }) }));
vi.mock('@/lib/messaging', () => ({ useStartChat: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => (k === 'orders.save' ? 'Save' : k) }) }));

import { DeliveryTimeline } from '@/views/Orders';

beforeEach(() => { client.get.mockReset(); client.post.mockReset(); toast.error.mockReset(); });

describe('DeliveryTimeline', () => {
  it('loads updates from GET /api/delivery/order/:id and shows notes', async () => {
    client.get.mockResolvedValue({ data: [{ id: 'd1', status: 'Packed', note: 'Sealed', created_at: new Date().toISOString() }] });
    render(<DeliveryTimeline orderId="order-1" isSeller={false} />);
    expect(await screen.findByText('Sealed')).toBeInTheDocument();
    expect(client.get).toHaveBeenCalledWith('/api/delivery/order/order-1');
  });

  it('adds an update with POST /api/delivery and the order id in the body', async () => {
    client.get.mockResolvedValue({ data: [] });
    client.post.mockResolvedValue({ data: { id: 'd2', status: 'Packed', note: 'Ready', created_at: new Date().toISOString() } });
    render(<DeliveryTimeline orderId="order-1" isSeller />);
    fireEvent.click(await screen.findByRole('button', { name: /Add update/ }));
    fireEvent.change(screen.getByPlaceholderText('Note (optional)'), { target: { value: ' Ready ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/api/delivery', { order_id: 'order-1', status: 'Packed', note: 'Ready' }));
    expect(await screen.findByText('Ready')).toBeInTheDocument();
  });

  it('shows an error with a retry when loading fails, not an empty list', async () => {
    client.get.mockRejectedValueOnce({ error: 'Forbidden', status: 403 }).mockResolvedValueOnce({ data: [] });
    render(<DeliveryTimeline orderId="order-1" isSeller />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByText('No delivery updates yet.')).toBeNull();
    expect(screen.queryByRole('button', { name: /Add update/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No delivery updates yet.')).toBeInTheDocument();
  });
});
