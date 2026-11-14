/**
 * Landing badge icon (owner, 2026-11-14): bigger, and the globe turns 720°
 * when the page opens and again on hover or tap, then rests (no endless
 * motion, WCAG 2.2.2).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import SpinningGlobeIcon, { GLOBE_SPIN_MS } from '@/components/brand/SpinningGlobeIcon';
import { BRAND } from '@/lib/brandAssets';

const css = readFileSync(join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8');
const rule = css.match(/\.animate-globe-spin\s*{([^}]*)}/)?.[1] ?? '';

afterEach(() => vi.useRealTimers());

describe('SpinningGlobeIcon', () => {
  it('turns two full turns once, not forever, in the time the component waits', () => {
    expect(css).toMatch(/@keyframes globe-spin-720\s*{\s*from\s*{\s*transform:\s*rotate\(0deg\);\s*}\s*to\s*{\s*transform:\s*rotate\(720deg\)/);
    expect(rule).toMatch(/globe-spin-720/);
    expect(rule).not.toMatch(/infinite/);
    expect(rule).toContain(`${GLOBE_SPIN_MS / 1000}s`);
  });

  it('spins on load, rests, and spins again on hover or tap', () => {
    vi.useFakeTimers();
    render(<SpinningGlobeIcon />);
    const first = screen.getByTestId('spinning-globe');
    expect(first).toHaveClass('animate-globe-spin');
    expect(first).toHaveAttribute('src', BRAND.iconOnBlue);

    // Hovering mid-turn does not restart it.
    fireEvent.mouseEnter(first.parentElement!);
    expect(screen.getByTestId('spinning-globe')).toBe(first);

    act(() => { vi.advanceTimersByTime(GLOBE_SPIN_MS); });
    fireEvent.mouseEnter(first.parentElement!);
    const second = screen.getByTestId('spinning-globe');
    expect(second).not.toBe(first); // a fresh element replays the animation

    act(() => { vi.advanceTimersByTime(GLOBE_SPIN_MS); });
    fireEvent.click(second.parentElement!);
    expect(screen.getByTestId('spinning-globe')).not.toBe(second);
  });

  it('is decorative: hidden from screen readers', () => {
    render(<SpinningGlobeIcon />);
    expect(screen.getByTestId('spinning-globe')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('spinning-globe')).toHaveAttribute('alt', '');
  });
});
