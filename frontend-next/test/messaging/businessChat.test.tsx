/**
 * Business chats in the app: "Message" opens the business chat (with a card
 * for the product/order/showroom) or a personal chat, shows the server's
 * reason when it isn't allowed, and sends signed-out people to sign in.
 * Context cards link to the live page and never show a price.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http }));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
const auth = vi.hoisted(() => ({ user: { id: 'me' } as { id: string } | null }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/components/ui/SafeImage', () => ({ default: ({ src }: { src: string }) => <img src={src} alt="" /> }));

import { useStartChat } from '@/lib/messaging';
import ContextCard from '@/components/messaging/ContextCard';

let api: ReturnType<typeof useStartChat>;
function Probe() { api = useStartChat(); return null; }

beforeEach(() => { http.post.mockReset(); push.mockReset(); toast.error.mockReset(); auth.user = { id: 'me' }; });

describe('useStartChat', () => {
  it('opens the business chat with a product card', async () => {
    http.post.mockResolvedValue({ data: { id: 'c1' } });
    render(<Probe />);
    await act(async () => { await api.start({ businessId: 'b1', userId: 'owner', context: { kind: 'product', id: 'p1' } }); });
    expect(http.post).toHaveBeenCalledWith('/api/messages/conversations/business', { business_id: 'b1', context: { kind: 'product', id: 'p1' } });
    expect(push).toHaveBeenCalledWith('/messages/c1');
  });

  it('opens a personal chat when there is no business', async () => {
    http.post.mockResolvedValue({ data: { id: 'c2' } });
    render(<Probe />);
    await act(async () => { await api.start({ userId: 'friend' }); });
    expect(http.post).toHaveBeenCalledWith('/api/messages/conversations/find-or-create', { target_user_id: 'friend' });
    expect(push).toHaveBeenCalledWith('/messages/c2');
  });

  it('shows why a chat is not allowed', async () => {
    http.post.mockRejectedValue({ error: 'messages_not_allowed', message: 'This person isn’t taking new messages.' });
    render(<Probe />);
    await act(async () => { await api.start({ userId: 'quiet' }); });
    expect(toast.error).toHaveBeenCalledWith('This person isn’t taking new messages.');
    expect(push).not.toHaveBeenCalled();
  });

  it('sends signed-out visitors to sign in first', async () => {
    auth.user = null;
    render(<Probe />);
    await act(async () => { await api.start({ businessId: 'b1' }); });
    expect(http.post).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?return=/));
  });
});

describe('ContextCard', () => {
  it('shows an order with its status and links to it', () => {
    render(<ContextCard content={JSON.stringify({ kind: 'order', id: 'o1', title: 'Yirgacheffe 1kg', status: 'out_for_delivery', url: '/orders?order=o1' })} />);
    const link = screen.getByRole('link', { name: /Order: Yirgacheffe 1kg/ });
    expect(link.getAttribute('href')).toBe('/orders?order=o1');
    expect(screen.getByText(/Out for delivery/)).toBeTruthy();
  });

  it('renders nothing for a broken card', () => {
    const { container } = render(<ContextCard content="not json" />);
    expect(container.textContent).toBe('');
  });
});
