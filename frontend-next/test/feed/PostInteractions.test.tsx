/**
 * The post's More menu and reactions: different actions on your own post and
 * someone else's, reactions that are saved, "who reacted", not interested
 * with Undo, mute removes the card, comment reactions and edits, and the
 * Privacy page saving its settings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const auth: { isAuthenticated: boolean; user: { id: string; role?: string } | null } = { isAuthenticated: true, user: { id: 'viewer-1' } };
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ ...auth, logout: vi.fn() }) }));
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/api/client', () => ({ default: http }));
const comments = vi.hoisted(() => ({ filter: vi.fn(), create: vi.fn() }));
vi.mock('@/api/entities', () => ({
  entities: {
    Post: { update: vi.fn(), delete: vi.fn() },
    UserProfile: { filter: vi.fn().mockResolvedValue([]) },
    Business: { filter: vi.fn().mockResolvedValue([]) },
    Like: { create: vi.fn() },
    Comment: comments,
  },
}));
vi.mock('@/api/auth', () => ({ auth: { me: vi.fn().mockResolvedValue({}) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/components/ui/ShareButton', () => ({ default: () => null }));
vi.mock('@/components/ui/BookmarkButton', () => ({ default: () => null }));
vi.mock('@/components/profile/ProfilePeek', () => ({ default: () => null }));
vi.mock('@/lib/uploadFile', () => ({ uploadFile: vi.fn() }));

import PostCard from '@/components/feed/PostCard';
import PrivacyAndSecurity from '@/views/PrivacyAndSecurity';
import type { Reaction } from '@/lib/socialApi';

const others = { id: 'p1', author_id: 'author-1', author_name: 'Mewacho', content: 'Ras hotel vib', post_type: 'text', created_at: new Date().toISOString(), like_count: 2, top_reactions: ['😂'] as Reaction[], my_reaction: null as Reaction | null };
const mine = { ...others, id: 'p2', author_id: 'viewer-1', author_name: 'Me' };
const openMore = () => fireEvent.click(screen.getByRole('button', { name: 'More options for this post' }));

beforeEach(() => {
  for (const fn of Object.values(http)) fn.mockReset();
  for (const fn of Object.values(toast)) fn.mockReset();
  auth.user = { id: 'viewer-1' };
  http.get.mockImplementation(async (url: string) => {
    if (url.includes('/relationship/')) return { data: { following: false, muted: false, restricted: false, blocked: false, blocked_me: false } };
    if (url.endsWith('/reactions')) return { data: { like_count: 2, my_reaction: null, top_reactions: ['😂'], counts: { '😂': 2 }, people: [{ user_id: 'u9', reaction: '😂', display_name: 'Hana' }] } };
    if (url === '/api/social/privacy') return { data: { profile_visibility: 'public', searchable: true, default_comment_policy: 'everyone', message_policy: 'everyone', show_reactions: true } };
    if (url === '/api/social/people') return { data: [] };
    return { data: {} };
  });
  http.put.mockImplementation(async (url: string, body: Record<string, unknown>) => {
    if (url.endsWith('/reaction')) return { data: { my_reaction: body.reaction, like_count: 3, top_reactions: [body.reaction, '😂'] } };
    if (url.endsWith('/settings')) return { data: { comment_policy: body.comment_policy ?? 'everyone', hide_like_count: Boolean(body.hide_like_count), notifications_off: false, is_pinned: Boolean(body.pinned) } };
    if (url === '/api/social/privacy') return { data: { profile_visibility: 'followers', searchable: true, default_comment_policy: 'everyone', message_policy: 'everyone', show_reactions: true } };
    return { data: {} };
  });
  http.post.mockResolvedValue({ data: {} });
  http.delete.mockResolvedValue({ data: { my_reaction: null, like_count: 2, top_reactions: ['😂'] } });
  comments.filter.mockResolvedValue([]);
});

describe('reactions', () => {
  it('Like saves ❤️, the count shows top reactions and opens who reacted', async () => {
    render(<PostCard post={others} />);
    fireEvent.click(screen.getByRole('button', { name: /Like post by Mewacho/ }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/posts/p1/reaction', { reaction: '❤️' }));
    const count = await screen.findByRole('button', { name: 'See who reacted (3)' });
    fireEvent.click(count);
    expect(await screen.findByText('Hana')).toBeTruthy();
  });

  it('a reaction from the More menu replaces mine', async () => {
    render(<PostCard post={others} />);
    openMore();
    fireEvent.click(await screen.findByRole('button', { name: 'Fire' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/posts/p1/reaction', { reaction: '🔥' }));
  });
});

describe('More menu on someone else’s post', () => {
  it('offers reply, save, follow, not interested, mute, block and report, but not edit or delete', async () => {
    render(<PostCard post={others} />);
    openMore();
    for (const name of [/Reply in comments/, /Save or unsave/, /Copy link/, /Not interested/, /Mute Mewacho/, /Block Mewacho/, /Report post/]) {
      expect(screen.getByRole('menuitem', { name })).toBeTruthy();
    }
    expect(await screen.findByRole('menuitem', { name: /Follow Mewacho/ })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'Edit post' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Delete post' })).toBeNull();
  });

  it('Not interested hides the post with Undo', async () => {
    render(<PostCard post={others} />);
    openMore();
    fireEvent.click(screen.getByRole('menuitem', { name: /Not interested/ }));
    expect(await screen.findByText(/won’t see this post/)).toBeTruthy();
    expect(http.post).toHaveBeenCalledWith('/api/posts/p1/hide');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/api/posts/p1/hide'));
    expect(await screen.findByText('Ras hotel vib')).toBeTruthy();
  });

  it('Mute removes the card and offers Undo', async () => {
    const { container } = render(<PostCard post={others} />);
    openMore();
    fireEvent.click(screen.getByRole('menuitem', { name: /Mute Mewacho/ }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/social/mute/author-1'));
    await waitFor(() => expect(container.textContent).not.toContain('Ras hotel vib'));
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Muted Mewacho/), expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }));
  });

  it('Block asks first', async () => {
    render(<PostCard post={others} />);
    openMore();
    fireEvent.click(screen.getByRole('menuitem', { name: /Block Mewacho/ }));
    expect(http.put).not.toHaveBeenCalledWith('/api/social/block/author-1');
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/social/block/author-1'));
  });

  it('Report sends a plain reason', async () => {
    render(<PostCard post={others} />);
    openMore();
    fireEvent.click(screen.getByRole('menuitem', { name: /Report post/ }));
    fireEvent.click(await screen.findByLabelText('Scam or fraud'));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/api/moderation/report', { target_type: 'post', target_id: 'p1', reason: 'scam', details: undefined }));
  });
});

describe('More menu on my own post', () => {
  it('edits settings: pin, who can comment, hide count', async () => {
    render(<PostCard post={mine} />);
    openMore();
    expect(screen.getByRole('menuitem', { name: 'Edit post' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete post' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /Report post/ })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: /Pin to profile/ }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/posts/p2/settings', { pinned: true }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Who can comment/ }));
    fireEvent.click(screen.getByRole('radio', { name: /No one/ }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/posts/p2/settings', { comment_policy: 'off' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /Hide reaction count/ }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/posts/p2/settings', { hide_like_count: true }));
  });
});

describe('comments', () => {
  it('saves a reaction on a comment and edits my own', async () => {
    comments.filter.mockResolvedValue([
      { id: 'c1', author_id: 'viewer-1', author_name: 'Me', content: 'typo hre', parent_id: null },
      { id: 'c2', author_id: 'other-2', author_name: 'Abebe', content: 'nice', parent_id: null },
    ]);
    http.put.mockImplementation(async (url: string, body: Record<string, unknown>) => {
      if (url.endsWith('/comments/c2/reaction')) return { data: { my_reaction: body.reaction, reaction_count: 1 } };
      if (url.endsWith('/comments/c1')) return { data: { id: 'c1', content: body.content, edited_at: new Date().toISOString() } };
      return { data: {} };
    });
    render(<PostCard post={others} />);
    fireEvent.click(screen.getByRole('button', { name: /View comments/ }));
    fireEvent.click(await screen.findByRole('button', { name: "More options for Abebe's comment" }));
    fireEvent.click(screen.getByRole('button', { name: 'Clap' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/posts/p1/comments/c2/reaction', { reaction: '👏' }));
    expect(await screen.findByLabelText('1 reactions')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: "More options for Me's comment" }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Edit comment'), { target: { value: 'typo here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('(edited)')).toBeTruthy();
    expect(screen.getByText(/typo here/)).toBeTruthy();
  });

  it('shows that comments are off instead of the box', async () => {
    render(<PostCard post={{ ...others, comment_policy: 'off' as const }} />);
    fireEvent.click(screen.getByRole('button', { name: /View comments/ }));
    expect(await screen.findByText('Comments are turned off for this post.')).toBeTruthy();
  });
});

describe('Privacy page', () => {
  it('loads and saves who can see my posts', async () => {
    render(<PrivacyAndSecurity />);
    const select = await screen.findByLabelText(/Who can see my posts/);
    fireEvent.change(select, { target: { value: 'followers' } });
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/api/social/privacy', { profile_visibility: 'followers' }));
    expect(screen.getByText('You haven’t blocked anyone.')).toBeTruthy();
  });
});
