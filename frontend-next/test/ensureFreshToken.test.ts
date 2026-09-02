/**
 * ensureFreshToken unit tests — BUG-7 fix verification
 *
 * The fix changed behaviour in api/client.ts:
 *   OLD: skipped the refresh call when nb_auth hint cookie was absent
 *   NEW: always attempts the refresh call (handles Safari ITP / Firefox strict
 *        mode where JS-readable cookies are cleared but HttpOnly cookies remain)
 *
 * Covers:
 *   1. Returns true immediately when _accessToken is already in memory
 *   2. Attempts refresh even when nb_auth cookie is absent (ITP fix)
 *   3. Returns true and stores token when backend returns access_token
 *   4. Returns false and clears hint cookie on 401 (truly logged out)
 *   5. Returns false on any other network error (fail safe)
 *   6. Deduplicates concurrent calls — only one network request fires
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

// ── Mock axios globally before client.ts is imported ─────────────────────────
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
      create: vi.fn(() => ({
        interceptors: {
          request:  { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

function hasHintCookie(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith('nb_auth='));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ensureFreshToken — ITP / Safari fix', () => {
  beforeEach(() => {
    vi.resetModules();
    clearCookie('nb_auth');
    clearCookie('access_token');
  });

  afterEach(() => {
    vi.resetAllMocks();
    clearCookie('nb_auth');
  });

  it('returns true immediately when access token is already in memory', async () => {
    const mockAxiosPost = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'at-existing' },
    });

    const { storeToken, ensureFreshToken } = await import('@/api/client');
    storeToken('in-memory-token');

    const result = await ensureFreshToken();
    expect(result).toBe(true);
    // Should NOT have made a network call — token was already in memory
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('attempts refresh even when nb_auth hint cookie is absent (ITP fix)', async () => {
    // Ensure hint cookie is absent
    clearCookie('nb_auth');
    expect(hasHintCookie()).toBe(false);

    const mockAxiosPost = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { access_token: 'freshly-issued' },
    });

    const { clearToken, ensureFreshToken } = await import('@/api/client');
    clearToken(); // make sure no in-memory token

    const result = await ensureFreshToken();

    // Must have attempted the refresh despite no hint cookie
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/refresh'),
      {},
      expect.objectContaining({ withCredentials: true }),
    );
    expect(result).toBe(true);
  });

  it('returns true and stores the token when backend returns access_token', async () => {
    vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { access_token: 'brand-new-token' },
    });

    const { clearToken, ensureFreshToken, getAccessToken } = await import('@/api/client');
    clearToken();

    const result = await ensureFreshToken();

    expect(result).toBe(true);
    expect(getAccessToken()).toBe('brand-new-token');
  });

  it('returns false and clears the hint cookie on 401 (no valid session)', async () => {
    setCookie('nb_auth', '1');
    expect(hasHintCookie()).toBe(true);

    vi.spyOn(axios, 'post').mockRejectedValueOnce({ response: { status: 401 } });

    const { clearToken, ensureFreshToken } = await import('@/api/client');
    clearToken();

    const result = await ensureFreshToken();

    expect(result).toBe(false);
    // Hint cookie must be cleared so middleware doesn't serve a stale redirect
    expect(hasHintCookie()).toBe(false);
  });

  it('returns false on network error (fail safe — never throw)', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Network Error'));

    const { clearToken, ensureFreshToken } = await import('@/api/client');
    clearToken();

    const result = await ensureFreshToken();
    expect(result).toBe(false);
  });

  it('deduplicates concurrent calls — fires only one network request', async () => {
    let resolveRefresh!: (value: unknown) => void;
    const inflightPromise = new Promise(r => { resolveRefresh = r; });

    const mockAxiosPost = vi.spyOn(axios, 'post').mockReturnValue(
      inflightPromise as ReturnType<typeof axios.post>,
    );

    const { clearToken, ensureFreshToken } = await import('@/api/client');
    clearToken();

    // Fire three concurrent calls before the first resolves
    const p1 = ensureFreshToken();
    const p2 = ensureFreshToken();
    const p3 = ensureFreshToken();

    // Resolve the shared inflight promise
    resolveRefresh({ data: { access_token: 'deduped-token' } });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
    // Only one actual POST should have fired
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });
});
