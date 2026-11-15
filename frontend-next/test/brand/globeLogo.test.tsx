/**
 * Landing logo with a turning Earth (owner, 2026-11-14): the land turns west to
 * east very slowly, 720° over a minute, rests, then turns again; signals run along
 * the network lines while it turns; no pause button; reduced motion keeps it still.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import GlobeLogo, { GLOBE_REST_MS, GLOBE_TURN_DEGREES, GLOBE_TURN_MS, SIGNALS, easeInOut, globeAt } from '@/components/brand/GlobeLogo';
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
  const lon = () => Number(screen.getByTestId('globe-logo').getAttribute('data-lon'));

  it('draws the still logo layers: land, 20 network lines, 8 boxes, ring', () => {
    fakeFrames();
    const { container } = render(<GlobeLogo />);
    expect(screen.getByTestId('globe-land').getAttribute('d')).toBe(landPath(LAND as number[][]));
    expect(container.querySelectorAll('line')).toHaveLength(20);
    expect(screen.getByTestId('globe-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('globe-art')).toHaveAttribute('aria-hidden', 'true');
  });

  it('turns slowly: 720° west to east over a minute, easing in and out', () => {
    expect(GLOBE_TURN_DEGREES).toBe(720);
    expect(GLOBE_TURN_MS).toBe(60000);
    expect(globeAt(0)).toEqual({ lon: GLOBE_LON0, turning: true, cycle: 1 });
    expect(globeAt(GLOBE_TURN_MS / 2).lon).toBeCloseTo(GLOBE_LON0 - 360, 6);
    const frames = fakeFrames();
    render(<GlobeLogo />);
    const logo = screen.getByTestId('globe-logo');
    frames.advance(16);
    expect(logo).toHaveAttribute('data-spinning', 'true');
    frames.advance(GLOBE_TURN_MS / 2);
    // Halfway the view longitude has moved 360° west: the land moved east.
    expect(Math.abs(lon() - (GLOBE_LON0 - GLOBE_TURN_DEGREES * easeInOut(0.5)))).toBeLessThan(2);
  });

  it('rests between turns, then turns again', () => {
    const frames = fakeFrames();
    render(<GlobeLogo />);
    const logo = screen.getByTestId('globe-logo');
    frames.advance(GLOBE_TURN_MS + 1000);
    expect(logo).toHaveAttribute('data-spinning', 'false');
    expect(logo).toHaveAttribute('data-lon', String(GLOBE_LON0));
    frames.advance(GLOBE_REST_MS);
    expect(logo).toHaveAttribute('data-spinning', 'true');
    expect(logo).toHaveAttribute('data-cycle', '2');
    expect(lon()).toBeLessThan(GLOBE_LON0);
  });

  it('has no play or pause button', () => {
    fakeFrames();
    render(<GlobeLogo />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sends a signal along every network line, and the boxes glow on arrival', () => {
    fakeFrames();
    const { container } = render(<GlobeLogo />);
    expect(SIGNALS).toHaveLength(20);
    expect(screen.getByTestId('globe-signals').querySelectorAll('path.globe-signal')).toHaveLength(20);
    expect(container.querySelectorAll('rect.globe-glow').length).toBeGreaterThan(0);
    for (const s of SIGNALS) expect(s.from).not.toBe(s.to);
  });

  it('stays still with reduced motion: no turn, no signals', () => {
    mockReducedMotion(true);
    const frames = fakeFrames();
    render(<GlobeLogo />);
    const logo = screen.getByTestId('globe-logo');
    frames.advance(5000);
    expect(logo).toHaveAttribute('data-spinning', 'false');
    expect(logo).toHaveAttribute('data-lon', String(GLOBE_LON0));
    expect(screen.queryByTestId('globe-signals')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
