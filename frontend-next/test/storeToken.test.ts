/**
 * Bug condition exploration tests — token storage mismatch
 *
 * Task 1: Write bug condition exploration test
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * IMPORTANT: Tests 1 is EXPECTED TO FAIL on unfixed code.
 * Failure of Test 1 confirms Bug 1 exists:
 *   storeToken() does NOT write to localStorage.
 *
 * These tests encode the EXPECTED (correct) behavior.
 * They will all pass once the fix is applied in Task 3.1.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storeToken, clearToken, getAccessToken } from '@/api/client';

beforeEach(() => {
  // Clear localStorage between tests to avoid state leakage
  localStorage.clear();
});

afterEach(() => {
  // Clean up in-memory token and cookie state after each test
  clearToken();
  localStorage.clear();
});

describe('storeToken — token storage mismatch bug condition', () => {
  /**
   * Test 1 (Bug 1): storeToken should write to localStorage
   *
   * Bug condition: storeToken('abc') is called but localStorage.getItem('access_token')
   * returns null because storeToken only writes to memory + cookie, not localStorage.
   *
   * Counterexample: storeToken('abc') → localStorage.getItem('access_token') === null (NOT 'abc')
   *
   * **Validates: Requirements 1.1**
   */
  it('Bug 1: storeToken writes access_token to localStorage', () => {
    storeToken('abc');
    expect(localStorage.getItem('access_token')).toBe('abc');
  });

  /**
   * Test 2 (Bug 2 mirror): storeToken should keep in-memory store in sync
   *
   * This test verifies that the in-memory _accessToken variable is also set,
   * so the axios interceptor can attach the Authorization header immediately.
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  it('Bug 2 mirror: storeToken keeps in-memory store (getAccessToken) in sync', () => {
    storeToken('abc');
    expect(getAccessToken()).toBe('abc');
  });

  /**
   * Test 3: clearToken removes from both localStorage and in-memory store
   *
   * After calling clearToken, both localStorage and the in-memory variable
   * must be null so that no stale token survives a logout.
   *
   * **Validates: Requirements 1.1, 3.2**
   */
  it('clearToken removes access_token from localStorage AND clears in-memory store', () => {
    // First store a token so there is something to clear
    storeToken('abc');

    // Now clear it
    clearToken();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation property tests — Task 2
// Validates: Requirements 3.1, 3.2, 3.3
//
// EXPECTED OUTCOME (unfixed code):
//   All three properties PASS — these confirm the baseline behaviors that must
//   NOT regress after the fix is applied in Task 3.1.
//
//   Note: Test 1 from Task 1 (Bug 1) still fails — that is correct and expected.
// ─────────────────────────────────────────────────────────────────────────────

import * as fc from 'fast-check';

describe('Preservation properties — existing token flows must be unchanged after fix', () => {
  /**
   * Property 2a: In-memory store is always set by storeToken
   *
   * For ALL random token strings t:
   *   storeToken(t) → getAccessToken() === t
   *
   * This preserves the core in-memory behaviour that the axios interceptor
   * relies on to attach the Authorization header.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it('Property 2a: storeToken(t) always sets getAccessToken() to t (in-memory preservation)', () => {
    fc.assert(
      fc.property(
        // Generate non-empty strings that look like realistic tokens
        fc.string({ minLength: 1, maxLength: 256 }),
        (t) => {
          storeToken(t);
          const result = getAccessToken();
          clearToken(); // clean up before next iteration
          return result === t;
        }
      )
    );
  });

  /**
   * Property 2b: clearToken always results in getAccessToken() === null
   *
   * For ALL random token strings t:
   *   storeToken(t) followed by clearToken() → getAccessToken() === null
   *
   * This ensures logout never leaves a stale in-memory token behind.
   *
   * **Validates: Requirements 3.2**
   */
  it('Property 2b: clearToken() always results in getAccessToken() === null', () => {
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
   * Property 2c: storeToken(t) always sets the JS cookie access_token=t
   *
   * For ALL random token strings t (restricted to characters valid in a cookie value):
   *   storeToken(t) → document.cookie includes 'access_token=<t>'
   *
   * The JS-readable cookie is used by Next.js middleware for server-side route
   * protection. It must continue to be set by storeToken after the fix.
   *
   * **Validates: Requirements 3.1, 3.3**
   */
  it('Property 2c: storeToken(t) always sets document.cookie to include access_token=t (cookie preservation)', () => {
    fc.assert(
      fc.property(
        // Cookie values must not contain ';', ',', ' ', or control chars.
        // Restrict to alphanumeric + common JWT/token chars: - _ . ~
        fc.stringMatching(/^[A-Za-z0-9\-_.~]{1,128}$/),
        (t) => {
          storeToken(t);
          const cookieSet = document.cookie.includes(`access_token=${t}`);
          clearToken(); // clean up
          return cookieSet;
        }
      )
    );
  });
});
