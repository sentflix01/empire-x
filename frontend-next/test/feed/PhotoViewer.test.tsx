/**
 * Tap a photo to see it full screen; the personal feed opens personal
 * profiles. The viewer zooms, moves between photos and closes like other
 * social apps.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 'viewer-1' } }) }));
vi.mock('@/api/entities', () => ({
  entities: {
    Post: { update: vi.fn(), delete: vi.fn() },
    UserProfile: { filter: vi.fn().mockResolvedValue([]) },
    Business: { filter: vi.fn().mockResolvedValue([{ id: 'b1', business_name: 'Mountain Climb' }]) },
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

import PhotoViewer from '@/components/feed/PhotoViewer';
import PostCard from '@/components/feed/PostCard';

const photos = [{ src: 'https://cdn.example.test/a.jpg', alt: 'First' }, { src: 'https://cdn.example.test/b.jpg', alt: 'Second' }];

describe('PhotoViewer', () => {
  it('opens full screen with the close button focused, and closes on Escape', () => {
    const onClose = vi.fn();
    render(<PhotoViewer photos={photos} author="Mewacho" caption="Ras hotel vib" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Photo viewer' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close photo' }));
    expect(screen.getByText('Ras hotel vib')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('moves between photos with the buttons and the arrow keys', () => {
    render(<PhotoViewer photos={photos} onClose={() => {}} />);
    expect(screen.getByRole('img', { name: 'First' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByRole('img', { name: 'Second' })).toBeTruthy();
    expect(screen.getByText('2 / 2')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('img', { name: 'First' })).toBeTruthy();
  });

  it('zooms on double-click and back', () => {
    render(<PhotoViewer photos={photos.slice(0, 1)} onClose={() => {}} />);
    const img = screen.getByRole('img', { name: 'First' });
    fireEvent.doubleClick(img);
    expect(img.style.transform).toContain('scale(2.5)');
    fireEvent.doubleClick(img);
    expect(img.style.transform).toContain('scale(1)');
  });
});

describe('PostCard photos and profile links', () => {
  const post = { id: 'p1', author_id: 'author-1', author_name: 'Mewacho', content: 'Ras hotel vib', post_type: 'image', image_url: 'https://cdn.example.test/poetry.jpg', created_at: new Date().toISOString() };

  it('in the personal feed, the author opens the personal profile; business names open the business profile', async () => {
    render(<PostCard post={post} />);
    expect(screen.getByRole('link', { name: 'Mewacho' }).getAttribute('href')).toBe('/profile/author-1?view=personal');
    expect(screen.getByRole('link', { name: /View Mewacho's profile/ }).getAttribute('href')).toBe('/profile/author-1?view=personal');
    expect((await screen.findByRole('link', { name: /Mountain Climb/ })).getAttribute('href')).toBe('/profile/author-1?view=business');
  });

  it('tapping the photo opens it full screen with Like and Comments', () => {
    render(<PostCard post={post} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open photo full screen' }));
    const viewer = screen.getByRole('dialog', { name: 'Photo viewer' });
    expect(viewer).toBeTruthy();
    expect(screen.getByRole('button', { name: /Like photo/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Comments \(/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }));
    expect(screen.queryByRole('dialog', { name: 'Photo viewer' })).toBeNull();
  });
});
