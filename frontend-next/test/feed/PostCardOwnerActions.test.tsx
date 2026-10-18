/**
 * Edit / Delete on a feed post: only the author gets Edit; the author and
 * admins get Delete; edits show an "Edited" label; delete asks first and the
 * card leaves the list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const auth: { isAuthenticated: boolean; user: { id: string; role?: string } | null } = { isAuthenticated: true, user: { id: 'author-1' } };
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => auth }));

const postApi = vi.hoisted(() => ({ update: vi.fn(), delete: vi.fn() }));
vi.mock('@/api/entities', () => ({
  entities: {
    Post: postApi,
    UserProfile: { filter: vi.fn().mockResolvedValue([]) },
    Business: { filter: vi.fn().mockResolvedValue([]) },
    Like: { create: vi.fn() },
    Comment: { filter: vi.fn().mockResolvedValue([]), create: vi.fn() },
  },
}));
vi.mock('@/api/client', () => ({ default: { get: vi.fn().mockResolvedValue({ data: {} }), post: vi.fn(), delete: vi.fn() } }));
vi.mock('@/api/auth', () => ({ auth: { me: vi.fn().mockResolvedValue({}) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/ShareButton', () => ({ default: () => null }));
vi.mock('@/components/ui/BookmarkButton', () => ({ default: () => null }));
vi.mock('@/components/profile/ProfilePeek', () => ({ default: () => null }));
vi.mock('@/lib/uploadFile', () => ({ uploadFile: vi.fn() }));

import PostCard from '@/components/feed/PostCard';

const post = { id: 'post-1', author_id: 'author-1', author_name: 'Mewacho', content: 'Ras hotel vib', post_type: 'text', created_at: new Date().toISOString() };

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Post options' }));

describe('PostCard owner actions', () => {
  beforeEach(() => {
    auth.user = { id: 'author-1' };
    postApi.update.mockReset();
    postApi.delete.mockReset();
  });

  it('offers Edit and Delete to the author, using the signed-in user when no id prop is passed', () => {
    render(<PostCard post={post} />);
    openMenu();
    expect(screen.getByRole('menuitem', { name: 'Edit post' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete post' })).toBeTruthy();
  });

  it('offers neither to another member', () => {
    auth.user = { id: 'someone-else' };
    render(<PostCard post={post} />);
    openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Edit post' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Delete post' })).toBeNull();
    expect(screen.getByRole('menuitemradio', { name: /personal profile/i })).toBeTruthy();
  });

  it('offers only Delete to an admin', () => {
    auth.user = { id: 'admin-1', role: 'admin' };
    render(<PostCard post={post} />);
    openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Edit post' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Delete post' })).toBeTruthy();
  });

  it('saves an edit and shows the Edited label', async () => {
    postApi.update.mockResolvedValue({ ...post, content: 'Updated caption', edited_at: new Date().toISOString() });
    render(<PostCard post={post} />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit post' }));
    fireEvent.change(screen.getByLabelText('Post text'), { target: { value: 'Updated caption' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(postApi.update).toHaveBeenCalledWith('post-1', { content: 'Updated caption', image_url: null, post_type: 'text' }));
    expect(await screen.findByText('Updated caption')).toBeTruthy();
    expect(screen.getByText(/Edited/)).toBeTruthy();
  });

  it('asks before deleting, then removes the card', async () => {
    postApi.delete.mockResolvedValue({ success: true });
    const onDeleted = vi.fn();
    const { container } = render(<PostCard post={post} onDeleted={onDeleted} />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete post' }));
    expect(postApi.delete).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('post-1'));
    expect(postApi.delete).toHaveBeenCalledWith('post-1');
    expect(container.textContent).not.toContain('Ras hotel vib');
  });

  it('brings the post back when the delete fails', async () => {
    postApi.delete.mockRejectedValue(new Error('network'));
    render(<PostCard post={post} />);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete post' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Ras hotel vib')).toBeTruthy();
  });
});
