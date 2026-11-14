/**
 * Landing logo with a turning Earth (owner, 2026-11-14): the land turns west to
 * east through 720° on load and on hover/tap, then rests; the ring, network and
 * boxes never move; reduced motion keeps it still.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import GlobeLogo, { GLOBE_SPIN_MS, GLOBE_TURN_DEGREES, easeInOut } from '@/components/brand/GlobeLogo';
import { GLOBE_C, GLOBE_R, GLOBE_LON0, GLOBE_LAT0, inverse, landPath, project } from '@/lib/brand/orthographic';
import LAND from '@/lib/brand/globeLand.json';

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
}

/** Drives requestAnimationFrame by hand with a fake clock. */
function fakeFrames() {
  let now = 0;
  let queue: FrameRequestCallback[] = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { queue.push(cb); return queue.length; });
  vi.stubGlobal('cancelAnimationFrame', () => { queue = []; });
  return {
    advance(ms: number) {
      act(() => {
        const end = now + ms;
        while (now < end) {
          now = Math.min(end, now + 16);
          const run = queue; queue = [];
          run.forEach((cb) => cb(now));
        }
      });
    },
  };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('orthographic projection (same maths as scripts/brand/build-logo.mjs)', () => {
  it('puts the view centre in the middle and a point 90° away on the rim', () => {
    const [x, y, visible] = project(GLOBE_LON0, GLOBE_LAT0, GLOBE_LON0);
    expect(x).toBeCloseTo(GLOBE_C, 6);
    expect(y).toBeCloseTo(GLOBE_C, 6);
    expect(visible).toBe(true);
    const [ex, , eVisible] = project(GLOBE_LON0 + 90, 0, GLOBE_LON0, 0);
    expect(ex).toBeCloseTo(GLOBE_C + GLOBE_R, 6);
    expect(eVisible).toBe(true);
    expect(project(GLOBE_LON0 + 180, 0, GLOBE_LON0, 0)[2]).toBe(false);
  });

  it('inverse undoes project for points that face the viewer', () => {
    for (const [lon, lat] of [[-20, 12], [10, 40], [-60, -20], [30, 5]]) {
      const [px, py] = project(lon, lat, GLOBE_LON0);
      const geo = inverse((px - GLOBE_C) / GLOBE_R, (GLOBE_C - py) / GLOBE_R)!;
      expect(geo[0]).toBeCloseTo(lat, 4);
      expect(geo[1] + GLOBE_LON0).toBeCloseTo(lon, 4);
    }
    expect(inverse(0.9, 0.9)).toBeNull(); // outside the globe
  });

  it('draws the resting land from the shipped data', () => {
    expect((LAND as number[][]).length).toBeGreaterThan(50);
    expect(landPath(LAND as number[][]).length).toBeGreaterThan(1000);
  });
});

describe('GlobeLogo', () => {
  beforeEach(() => mockReducedMotion(false));

  it('draws the still logo layers: land, 20 network lines, 8 boxes, ring', () => {
    fakeFrames();
    const { container } = render(<GlobeLogo />);
    expect(screen.getByTestId('globe-land').getAttribute('d')).toBe(landPath(LAND as number[][]));
    expect(container.querySelectorAll('line')).toHaveLength(20);
    expect(container.querySelectorAll('rect')).toHaveLength(16); // a box and its blue bar, eight times
    expect(screen.getByTestId('globe-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('globe-logo')).toHaveAttribute('aria-hidden', 'true');
  });

  it('turns 720° west to east on load, then rests where it started', () => {
    const frames = fakeFrames();
    render(<GlobeLogo />);
    const logo = screen.getByTestId('globe-logo');
    frames.advance(0);
    expect(logo).toHaveAttribute('data-spinning', 'true');
    frames.advance(GLOBE_SPIN_MS / 2);
    const mid = Number(logo.getAttribute('data-lon'));
    // Halfway (eased) the view longitude has moved 360° west: the land moved east.
    expect(mid).toBeCloseTo(GLOBE_LON0 - GLOBE_TURN_DEGREES * easeInOut(0.5), 0);
    frames.advance(GLOBE_SPIN_MS);
    expect(logo).toHaveAttribute('data-spinning', 'false');
    expect(logo).toHaveAttribute('data-lon', String(GLOBE_LON0));
  });

  it('turns again on hover and tap, but never restarts mid-turn', () => {
    const frames = fakeFrames();
    render(<GlobeLogo />);
    const logo = screen.getByTestId('globe-logo');
    frames.advance(GLOBE_SPIN_MS / 4);
    const before = Number(logo.getAttribute('data-lon'));
    fireEvent.mouseEnter(logo); // mid-turn: ignored
    frames.advance(16);
    expect(Number(logo.getAttribute('data-lon'))).toBeLessThan(before);
    frames.advance(GLOBE_SPIN_MS);
    expect(logo).toHaveAttribute('data-spinning', 'false');
    fireEvent.mouseEnter(logo);
    frames.advance(16);
    expect(logo).toHaveAttribute('data-spinning', 'true');
    frames.advance(GLOBE_SPIN_MS + 50);
    fireEvent.click(logo);
    frames.advance(16);
    expect(logo).toHaveAttribute('data-spinning', 'true');
  });

  it('stays still with reduced motion, even on hover and tap', () => {
    mockReducedMotion(true);
    const frames = fakeFrames();
    render(<GlobeLogo />);
    const logo = screen.getByTestId('globe-logo');
    fireEvent.mouseEnter(logo);
    fireEvent.click(logo);
    frames.advance(GLOBE_SPIN_MS);
    expect(logo).toHaveAttribute('data-spinning', 'false');
    expect(logo).toHaveAttribute('data-lon', String(GLOBE_LON0));
  });
});
