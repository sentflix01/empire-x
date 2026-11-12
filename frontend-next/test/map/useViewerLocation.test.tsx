/** The viewer's location: real position when allowed, Addis Ababa when not. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DEFAULT_VIEWER_LOCATION, useViewerLocation } from '@/hooks/useViewerLocation';

const setGeo = (impl: unknown) => Object.defineProperty(navigator, 'geolocation', { value: impl, configurable: true });

describe('useViewerLocation', () => {
  afterEach(() => setGeo(undefined));

  it('uses the browser position when allowed', async () => {
    setGeo({ getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 8.98, longitude: 38.79 } }) });
    const { result } = renderHook(() => useViewerLocation());
    let loc;
    await act(async () => { loc = await result.current.request(); });
    expect(loc).toEqual({ lat: 8.98, lon: 38.79 });
    expect(result.current.status).toBe('ok');
  });

  it('falls back to Addis Ababa and says so when location is blocked', async () => {
    setGeo({ getCurrentPosition: (_ok: unknown, fail: () => void) => fail() });
    const { result } = renderHook(() => useViewerLocation());
    let loc;
    await act(async () => { loc = await result.current.request(); });
    expect(loc).toEqual(DEFAULT_VIEWER_LOCATION);
    expect(result.current.status).toBe('fallback');
  });

  it('falls back when the browser has no geolocation', async () => {
    setGeo(undefined);
    const { result } = renderHook(() => useViewerLocation());
    await act(async () => { await result.current.request(); });
    expect(result.current.location).toEqual(DEFAULT_VIEWER_LOCATION);
  });
});
