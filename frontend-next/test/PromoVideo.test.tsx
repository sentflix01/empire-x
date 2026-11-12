/**
 * Promo videos load only when visible, never with reduced motion or data
 * saving, and can be paused (decision "Promo videos load when visible").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { PROMO, pickRendition } from '@/lib/promoAssets';

const motion = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/lib/brandMotion', () => ({ useBrandMotion: () => motion.allowed }));

import PromoVideo from '@/components/promo/PromoVideo';
import PromoGuide from '@/components/promo/PromoGuide';

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

const show = (visible: boolean) => act(() => {
  observe?.([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver);
});

describe('PromoVideo', () => {
  it('shows the poster and no video before the frame is visible', () => {
    const { container } = render(<PromoVideo clip={PROMO.banner} description="A seller builds a shop" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(PROMO.banner.small.poster);
    expect(screen.queryByTestId('promo-video')).toBeNull();
    expect(screen.getByText('A seller builds a shop')).toBeInTheDocument();
  });

  it('loads the video once visible, and pauses on request', () => {
    render(<PromoVideo clip={PROMO.banner} />);
    show(true);
    const video = screen.getByTestId('promo-video');
    expect(video.querySelector('source')?.getAttribute('src')).toMatch(/^\/promo\/banner-\d+x\d+-v\d+\.mp4$/);
    expect(video.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }));
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play animation' })).toBeInTheDocument();
  });

  it('never loads the video with reduced motion or data saving', () => {
    motion.allowed = false;
    const { container } = render(<PromoVideo clip={PROMO.landing} />);
    show(true);
    expect(screen.queryByTestId('promo-video')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });
});

describe('pickRendition', () => {
  it('uses the small file unless the frame needs more pixels', () => {
    expect(pickRendition(PROMO.landing, 280, 498, 1)).toBe(PROMO.landing.small);
    expect(pickRendition(PROMO.landing, 280, 498, 2)).toBe(PROMO.landing.large);
    // A short, wide banner frame is filled by height: 186 px tall needs 496 px of width.
    expect(pickRendition(PROMO.banner, 432, 186, 1)).toBe(PROMO.banner.small);
    expect(pickRendition(PROMO.banner, 432, 186, 2)).toBe(PROMO.banner.large);
  });
});

describe('PromoGuide', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
  });

  it('loads nothing until the button is pressed, then plays the guide in a dialog', () => {
    render(<PromoGuide />);
    expect(screen.queryByTestId('promo-guide-video')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Watch how it works' }));
    const dialog = screen.getByRole('dialog', { name: 'How Nodbusiness works' });
    const video = screen.getByTestId('promo-guide-video');
    expect(dialog).toContainElement(video);
    expect(video.querySelector('source')?.getAttribute('src')).toMatch(/^\/promo\/guide-\d+x\d+-v\d+\.mp4$/);
    expect(video).toHaveAttribute('controls');
    const track = video.querySelector('track');
    expect(track?.getAttribute('src')).toMatch(/^\/promo\/guide-v\d+\.en\.vtt$/);
    expect(track?.getAttribute('srclang')).toBe('en');
  });

  it('closes with Escape or the close button, and focus returns to the button', async () => {
    render(<PromoGuide variant="icon" />);
    const open = screen.getByRole('button', { name: 'Watch how it works' });
    open.focus(); // a keyboard user is on the button when they open it
    fireEvent.click(open);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(open));
    fireEvent.click(open);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('promo-guide-video')).toBeNull();
  });
});
