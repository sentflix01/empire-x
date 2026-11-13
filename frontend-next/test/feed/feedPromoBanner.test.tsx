/**
 * The feed banner (owner, 13 Nov 2026): the promo plays inside the banner,
 * behind the text, with no separate strip, and an eye button hides the text
 * to show the whole animation, only when the clip can play.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const motion = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/lib/brandMotion', () => ({ useBrandMotion: () => motion.allowed }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/components/promo/PromoGuide', () => ({ default: () => <button type="button">Watch the guide</button> }));

import FeedPromoBanner from '@/components/feed/FeedPromoBanner';

let observe: IntersectionObserverCallback | null = null;
beforeEach(() => {
  motion.allowed = true;
  observe = null;
  global.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) { observe = cb; }
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});
const show = () => act(() => { observe?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });

describe('Feed promo banner', () => {
  it('plays the clip inside the banner, behind the text', () => {
    const { container } = render(<FeedPromoBanner isAuthenticated={false} />);
    show();
    const banner = container.querySelector('[data-page-guide="feed-banner"]')!;
    const video = screen.getByTestId('promo-video');
    expect(banner.contains(video)).toBe(true);
    // The clip fills the banner (absolute); nothing is stacked below the text.
    expect(video.parentElement!.className).toContain('absolute inset-0');
    expect(banner.lastElementChild?.tagName).not.toBe('DIV');
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Join Free' }).getAttribute('href')).toBe('/register');
  });

  it('the eye button hides the text to show the animation, and brings it back', () => {
    render(<FeedPromoBanner isAuthenticated />);
    show();
    const eye = screen.getByRole('button', { name: 'Show animation' });
    expect(eye.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(eye);
    const text = screen.getByTestId('feed-banner-text');
    expect(text.className).toContain('opacity-0');
    expect(text.hasAttribute('inert')).toBe(true);
    expect(text.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('feed-banner-scrim').className).toContain('opacity-0');
    const back = screen.getByRole('button', { name: 'Show text' });
    expect(back.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(back);
    expect(screen.getByTestId('feed-banner-text').className).toContain('opacity-100');
    expect(screen.getByTestId('feed-banner-text').hasAttribute('inert')).toBe(false);
  });

  it('shows no eye button when the clip cannot play (reduced motion or data saving)', () => {
    motion.allowed = false;
    render(<FeedPromoBanner isAuthenticated={false} />);
    show();
    expect(screen.queryByRole('button', { name: 'Show animation' })).toBeNull();
    expect(screen.getByTestId('feed-banner-text').className).toContain('opacity-100');
  });
});
