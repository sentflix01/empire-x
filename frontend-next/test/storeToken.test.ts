/**
 * Token storage tests — TD-014 (memory-only access token)
 *
 * History: these began as bug-condition tests for a storage mismatch, then the
 * storage design changed twice. Since TD-014 the CORRECT behavior is:
 *   - The JWT is NEVER written to localStorage or any JS-readable cookie.
 *   - storeToken() sets only the in-memory token plus a non-sensitive hint
 *     cookie (`nb_auth=1`) used by Next.js middleware for route gating.
 * These tests lock that contract in.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storeToken, clearToken, getAccessToken } from '@/api/client';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  clearToken();
  localStorage.clear();
});

describe('storeToken — memory-only token contract (TD-014)', () => {
  it('storeToken NEVER writes the token to localStorage', () => {
    storeToken('abc');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('storeToken NEVER exposes the token via document.cookie', () => {
    storeToken('secret-jwt-value');
    expect(document.cookie).not.toContain('access_token=');
    expect(document.cookie).not.toContain('secret-jwt-value');
  });

  it('storeToken sets the non-sensitive nb_auth hint cookie for middleware gating', () => {
    storeToken('abc');
    expect(document.cookie).toContain('nb_auth=1');
  });

  it('clearToken removes the hint cookie and clears the in-memory store', () => {
    storeToken('abc');
    clearToken();
    expect(getAccessToken()).toBeNull();
    expect(document.cookie).not.toContain('nb_auth=1');
  });

  it('clearToken removes legacy access_token entries from localStorage', () => {
    // Simulate a pre-TD-014 build having persisted a token
    localStorage.setItem('access_token', 'legacy-token');
    clearToken();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('getAccessToken stays in sync with the last stored token', () => {
    storeToken('abc');
    expect(getAccessToken()).toBe('abc');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation property tests — core behaviors that must never regress.
// ─────────────────────────────────────────────────────────────────────────────

import * as fc from 'fast-check';

describe('Preservation properties — token flows', () => {
  /**
   * Property A: For ALL tokens t, storeToken(t) → getAccessToken() === t
   * (the axios request interceptor depends on this to attach Authorization).
   */
  it('Property A: storeToken(t) always sets getAccessToken() to t', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 256 }),
        (t) => {
          storeToken(t);
          const result = getAccessToken();
          clearToken();
          return result === t;
        }
      )
    );
  });

  /**
   * Property B: storeToken(t) followed by clearToken() → getAccessToken() === null
   * (logout must never leave a stale in-memory token behind).
   */
  it('Property B: clearToken() always results in getAccessToken() === null', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 256 }),
        (t) => {
          storeToken(t);
          clearToken();
          return getAccessToken() === null;
        }
      )
    );
  });

  /**
   * Property C: The token value itself NEVER reaches document.cookie or
   * localStorage — for ALL random token strings (TD-014 security contract).
   */
  it('Property C: token value is never persisted anywhere readable (security invariant)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9\-_.~]{8,128}$/),
        (t) => {
          storeToken(t);
          const leaked =
            document.cookie.includes(`access_token=${t}`) ||
            document.cookie.includes(t) ||
            localStorage.getItem('access_token') === t;
          clearToken();
          return !leaked;
        }
      )
    );
  });
});
