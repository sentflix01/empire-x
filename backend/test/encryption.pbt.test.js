'use strict';

/**
 * encryption.pbt.test.js — Property-based tests for credential encryption
 *
 * Feature: showroom-external-api
 *
 * Covers:
 *   Property 3: Credential encryption round-trip
 *
 * Requirements: 1.6
 */

const fc = require('fast-check');
const { encrypt, decrypt } = require('../services/credentialEncryption');

// ─── Setup: provide a valid 64-hex-char key for the test environment ──────────

beforeAll(() => {
  // 32 bytes = 64 hex chars; use a fixed test key so tests are reproducible
  process.env.EXTERNAL_API_ENCRYPTION_KEY =
    'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
});

afterAll(() => {
  delete process.env.EXTERNAL_API_ENCRYPTION_KEY;
});

// ─── Property 3: Credential Encryption Round-Trip ────────────────────────────
// Feature: showroom-external-api, Property 3: Credential encryption round-trip

describe('Property 3 — Credential encryption round-trip', () => {
  /**
   * For any plaintext string, encrypt(plaintext) followed by decrypt(result)
   * MUST return a value strictly equal to the original plaintext.
   *
   * Validates: Requirement 1.6
   */
  test('encrypt → decrypt round-trip always recovers the original plaintext', () => {
    fc.assert(
      fc.property(fc.string(), (plaintext) => {
        const encrypted = encrypt(plaintext);
        const recovered = decrypt(encrypted);
        expect(recovered).toBe(plaintext);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * For any non-empty plaintext string, the ciphertext field of the encrypted
   * object MUST differ from the plaintext (i.e., encryption is not a no-op).
   *
   * We compare the hex-encoded ciphertext against the hex-encoded plaintext to
   * work in the same encoding space. An identity transform would produce the
   * same bytes — AES-256-GCM must not.
   *
   * Validates: Requirement 1.6
   */
  test('encrypted ciphertext always differs from the plaintext for non-empty inputs', () => {
    const nonEmptyStringArb = fc.string({ minLength: 1 });

    fc.assert(
      fc.property(nonEmptyStringArb, (plaintext) => {
        const { ciphertext } = encrypt(plaintext);

        // The hex-encoded ciphertext must not equal the hex-encoded plaintext.
        // This confirms that the encrypted bytes differ from the raw plaintext bytes.
        const plaintextHex = Buffer.from(plaintext, 'utf8').toString('hex');
        expect(ciphertext).not.toBe(plaintextHex);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * AES-256-GCM uses a random IV on every call, so encrypting the same non-empty
   * plaintext twice MUST produce different iv and ciphertext values.
   *
   * For empty-string plaintext the ciphertext is always an empty hex string "" —
   * that is expected AES-GCM behaviour (zero bytes in → zero bytes out). The
   * random-IV property is therefore only meaningful for non-empty inputs.
   *
   * Validates: Requirement 1.6
   */
  test('two encryptions of the same plaintext produce different ciphertexts (random IV)', () => {
    const nonEmptyStringArb = fc.string({ minLength: 1 });

    fc.assert(
      fc.property(nonEmptyStringArb, (plaintext) => {
        const enc1 = encrypt(plaintext);
        const enc2 = encrypt(plaintext);

        // IVs must differ (random per call)
        expect(enc1.iv).not.toBe(enc2.iv);

        // Ciphertexts must differ because the IVs differ
        expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
      }),
      { numRuns: 100 },
    );
  });
});
