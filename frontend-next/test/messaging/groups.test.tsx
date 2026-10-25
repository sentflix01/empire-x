/**
 * M6 groups and channels: creating sends real user ids (it used to send
 * profile ids through a generic helper), a channel can start with only you,
 * the server's reason is shown, and the Members screen offers admin actions
 * only to admins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ default: http, getAccessToken: () => 't' }));
vi.mock('@/api/entities', () => ({ entities: { UserProfile: { list: vi.fn().mockResolvedValue([
  { id: 'profile-1', user_id: 'u-sara', display_name: 'Sara' },
  { id: 'profile-2', user_id: 'u-abebe', display_name: 'Abebe' },
]) } } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me', full_name: 'Me' } }) }));
vi.mock('@/lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }), joinConversation: vi.fn(), leaveConversation: vi.fn() }));
vi.mock('@/lib/useChatViewport', () => ({ useChatViewport: () => undefined }));
vi.mock('next/navigation', () => ({ useRouter: () => nav, useParams: () => ({ id: 'g1' }), usePathname: () => '/messages/g1/members' }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn(), info: vi.fn() } }));

import CreateGroupDialog from '@/components/messaging/CreateGroupDialog';
import ChatMembers from '@/views/ChatMembers';

beforeEach(() => { Object.values(http).forEach((f) => f.mockReset()); nav.push.mockReset(); toastError.mockReset(); });

describe('creating', () => {
  it('a group needs a name and someone, and sends their user ids', async () => {
    http.post.mockResolvedValue({ data: { id: 'new-group' } });
    render(<CreateGroupDialog type="group" onClose={vi.fn()} />);
    const create = screen.getByRole('button', { name: 'Create group' });
    fireEvent.change(screen.getByPlaceholderText('Group name'), { target: { value: 'Coffee lovers' } });
    expect(create).toHaveProperty('disabled', true);
    fireEvent.click(await screen.findByRole('button', { name: /Sara/ }));
    expect(create).toHaveProperty('disabled', false);
    fireEvent.click(create);
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/api/messages/conversations', { type: 'group', name: 'Coffee lovers', participant_ids: ['u-sara'] }));
    expect(nav.push).toHaveBeenCalledWith('/messages/new-group');
  });

  it('a channel can start with only you; the server’s reason is shown', async () => {
    http.post.mockRejectedValue({ error: 'messages_not_allowed', message: 'Abebe can’t be added: they only get messages from people they follow' });
    render(<CreateGroupDialog type="channel" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Channel name'), { target: { value: 'Deals' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create channel' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('only get messages from people they follow')));
    expect(http.post.mock.calls[0][1]).toEqual({ type: 'channel', name: 'Deals', participant_ids: [] });
  });
});

describe('members screen', () => {
  const group = (myRole: 'admin' | 'member') => ({
    data: { id: 'g1', type: 'group', name: 'Market day', my_role: myRole, members: [
      { user_id: 'me', role: myRole, display_name: 'Me' },
      { user_id: 'u-sara', role: myRole === 'admin' ? 'member' : 'admin', display_name: 'Sara' },
    ] },
  });

  it('admins can rename, add people, make admin and remove', async () => {
    http.get.mockResolvedValue(group('admin'));
    http.put.mockResolvedValue({ data: {} });
    render(<ChatMembers />);
    expect(await screen.findByText('Market day')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Edit name and description/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add people/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Delete group/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Sara/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Make admin' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/messages/conversations/g1/members/u-sara', { role: 'admin' }));
  });

  it('members only see View profile and Leave', async () => {
    http.get.mockResolvedValue(group('member'));
    render(<ChatMembers />);
    expect(await screen.findByText('Market day')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add people/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete group/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Leave group/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Sara/ }));
    expect(screen.getByRole('button', { name: 'View profile' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Make admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove from group/ })).toBeNull();
  });
});
