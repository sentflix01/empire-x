/**
 * The feed banner (owner, 13 Nov 2026): the promo plays inside the banner and
 * shows first; a slider next to "Join Free" fades the text in and covers the
 * clip, only when the clip can play.
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
  it('starts with the animation: text hidden, clip uncovered, Join Free visible', () => {
    const { container } = render(<FeedPromoBanner isAuthenticated={false} />);
    show();
    const banner = container.querySelector('[data-page-guide="feed-banner"]')!;
    expect(banner.contains(screen.getByTestId('promo-video'))).toBe(true);
    expect(screen.getByTestId('feed-banner-text').style.opacity).toBe('0');
    expect(screen.getByTestId('feed-banner-scrim').style.opacity).toBe('0');
    // The heading stays readable to screen readers; the button is always shown.
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Join Free' }).getAttribute('href')).toBe('/register');
  });

  it('the slider fades the text in and covers the clip, all the way at the top', () => {
    render(<FeedPromoBanner isAuthenticated />);
    show();
    const slider = screen.getByRole('slider', { name: 'Show the text over the animation' });
    fireEvent.change(slider, { target: { value: '40' } });
    expect(screen.getByTestId('feed-banner-text').style.opacity).toBe('0.4');
    expect(screen.getByTestId('feed-banner-scrim').style.opacity).toBe('0.4');
    expect(slider.getAttribute('aria-valuetext')).toBe('40% text');
    fireEvent.change(slider, { target: { value: '100' } });
    expect(screen.getByTestId('feed-banner-text').style.opacity).toBe('1');
    expect(screen.getByTestId('feed-banner-scrim').style.opacity).toBe('1');
  });

  it('shows the text and no controls when the clip cannot play (reduced motion or data saving)', () => {
    motion.allowed = false;
    render(<FeedPromoBanner isAuthenticated={false} />);
    show();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByTestId('feed-banner-text').style.opacity).toBe('1');
    expect(screen.getByTestId('feed-banner-scrim').style.opacity).toBe('1');
  });
});
