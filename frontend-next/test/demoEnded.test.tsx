/**
 * A Demo practice session that has ended (the API answers 401/503 with a
 * DEMO_* code) must take the visitor out of Demo with an explanation, not
 * leave them on a Demo screen full of "check your connection" errors.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import axios from 'axios';

// Capture the response interceptor that api/client.ts installs.
const handlers: { rejected?: (error: unknown) => Promise<unknown> } = {};
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const instance = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn((_ok: unknown, rejected: (error: unknown) => Promise<unknown>) => { handlers.rejected = rejected; }) },
    },
  });
  return { ...actual, default: { ...actual.default, post: vi.fn(), create: vi.fn(() => instance) } };
});

const failure = (status: number, data: unknown, url = '/api/businesses') => ({ response: { status, data }, config: { url } });

describe('API client: Demo session ended', () => {
  beforeEach(() => { vi.resetModules(); handlers.rejected = undefined; vi.mocked(axios.post).mockReset(); });

  it('recognises only the Demo-ended codes', async () => {
    const { isDemoEndedResponse } = await import('@/api/client');
    expect(isDemoEndedResponse(401, { code: 'DEMO_SESSION_INVALID' })).toBe(true);
    expect(isDemoEndedResponse(401, { code: 'DEMO_SESSION_EXPIRED' })).toBe(true);
    expect(isDemoEndedResponse(503, { code: 'DEMO_DISABLED' })).toBe(true);
    expect(isDemoEndedResponse(503, { code: 'DEMO_UNAVAILABLE' })).toBe(false); // a hiccup, not the end
    expect(isDemoEndedResponse(401, { code: 'TOKEN_EXPIRED' })).toBe(false);
    expect(isDemoEndedResponse(500, { code: 'DEMO_SESSION_INVALID' })).toBe(false);
    expect(isDemoEndedResponse(503, { code: 'AUTH_UNAVAILABLE' })).toBe(false); // backend auth outage
  });

  it('announces the end once and does not try to refresh', async () => {
    const { DEMO_ENDED_EVENT } = await import('@/api/client');
    const heard = vi.fn();
    window.addEventListener(DEMO_ENDED_EVENT, heard);
    for (const url of ['/api/businesses', '/api/showrooms']) {
      await expect(handlers.rejected!(failure(401, { code: 'DEMO_SESSION_INVALID', error: 'Demo session is invalid or expired' }, url)))
        .rejects.toMatchObject({ status: 401, code: 'DEMO_SESSION_INVALID' });
    }
    window.removeEventListener(DEMO_ENDED_EVENT, heard);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('still refreshes on an ordinary expired token', async () => {
    await import('@/api/client');
    vi.mocked(axios.post).mockRejectedValue(new Error('no session'));
    await expect(handlers.rejected!(failure(401, { code: 'TOKEN_EXPIRED' }))).rejects.toMatchObject({ status: 401 });
    expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', {}, { withCredentials: true });
  });

  it('keeps the session on 503 AUTH_UNAVAILABLE (backend outage): no refresh, no Demo exit', async () => {
    const { DEMO_ENDED_EVENT } = await import('@/api/client');
    const heard = vi.fn();
    window.addEventListener(DEMO_ENDED_EVENT, heard);
    await expect(handlers.rejected!(failure(503, { code: 'AUTH_UNAVAILABLE', error: 'Sign-in is temporarily unavailable. Please try again.' })))
      .rejects.toMatchObject({ status: 503, code: 'AUTH_UNAVAILABLE' });
    window.removeEventListener(DEMO_ENDED_EVENT, heard);
    expect(heard).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('Feed load error message', () => {
  it('blames the connection only when no answer came back', async () => {
    const { feedLoadErrorMessage } = await import('@/components/feed/BusinessShowroomFeed');
    expect(feedLoadErrorMessage({ error: 'Network Error' })).toMatch(/Check your connection/);
    expect(feedLoadErrorMessage({ status: 503, code: 'DEMO_UNAVAILABLE' })).toMatch(/right now/);
    expect(feedLoadErrorMessage({ status: 500 })).not.toMatch(/connection/);
  });
});

describe('Landing notice after Demo ends', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('explains the end once and clears the flag from the address', async () => {
    window.history.replaceState(null, '', '/landing?demo=ended');
    const { default: DemoEndedNotice } = await import('@/components/landing/DemoEndedNotice');
    await act(async () => { render(<DemoEndedNotice />); });
    expect(screen.getByRole('status')).toHaveTextContent('Your Demo practice session has ended.');
    expect(window.location.search).toBe('');
  });

  it('shows nothing on a normal visit', async () => {
    window.history.replaceState(null, '', '/landing');
    const { default: DemoEndedNotice } = await import('@/components/landing/DemoEndedNotice');
    const { container } = render(<DemoEndedNotice />);
    expect(container).toBeEmptyDOMElement();
  });
});
