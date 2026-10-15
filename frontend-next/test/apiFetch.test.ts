import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, clearToken, storeToken } from '@/api/client';

describe('apiFetch request policy', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    storeToken('api-fetch-test-token');
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    clearToken();
    vi.unstubAllGlobals();
  });

  it('sends the current bearer token and Real-only boundary for Real mode requests', async () => {
    localStorage.setItem('nodbusiness_real_mode', 'true');

    await apiFetch('/api/showrooms/real-showroom');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe('/api/showrooms/real-showroom');
    expect(headers.get('Authorization')).toBe('Bearer api-fetch-test-token');
    expect(headers.get('X-Real-Only')).toBe('1');
    expect(init.credentials).toBe('include');
  });

  it('does not leak the Real-only header into Demo mode requests', async () => {
    localStorage.setItem('nodbusiness_real_mode', 'false');

    await apiFetch('/api/showrooms/demo-showroom', { headers: { 'X-Real-Only': '1' } });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).has('X-Real-Only')).toBe(false);
  });

  it('selects Demo for anonymous read requests from the guest feed', async () => {
    clearToken();
    window.history.pushState({}, '', '/feed');

    await apiFetch('/api/posts?feed=true');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('X-Public-Demo-Read')).toBe('1');
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('keeps a real QR showroom lookup on the Real public path', async () => {
    clearToken();
    window.history.pushState({}, '', '/showroom/real-business');

    await apiFetch('/api/showrooms/slug/real-business');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).has('X-Public-Demo-Read')).toBe(false);
  });
});
