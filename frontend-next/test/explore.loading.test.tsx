/**
 * Explore waits for both trending data and trending hashtags before showing
 * content (performance audit 2026-11-09, CLS 0.35): the hashtag section sits
 * above the posts, so rendering it later pushed the whole page down.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const get = vi.fn();
vi.mock('@/api/client', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/feed/PostCard', () => ({ default: ({ post }: { post: { content: string } }) => <article>{post.content}</article> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import Explore from '@/views/Explore';

describe('Explore loading', () => {
  it('does not show posts until the hashtags have answered too', async () => {
    let answerHashtags: (v: unknown) => void = () => {};
    get.mockImplementation((url: string) => url === '/api/trending'
      ? Promise.resolve({ data: { trending_posts: [{ id: 'p1', content: 'Hello market' }] } })
      : new Promise((resolve) => { answerHashtags = resolve; }));

    render(<Explore />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByText('Hello market')).not.toBeInTheDocument();

    await act(async () => { answerHashtags({ data: [{ name: 'coffee', post_count: 3 }] }); });
    expect(await screen.findByText('Hello market')).toBeInTheDocument();
    expect(screen.getByText('coffee')).toBeInTheDocument();
  });

  it('still shows trending content when the hashtag request fails', async () => {
    get.mockImplementation((url: string) => url === '/api/trending'
      ? Promise.resolve({ data: { trending_posts: [{ id: 'p2', content: 'Fresh bread' }] } })
      : Promise.reject(new Error('offline')));
    render(<Explore />);
    expect(await screen.findByText('Fresh bread')).toBeInTheDocument();
  });
});
