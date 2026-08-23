/**
 * encryption.pbt.test.js — Property-based tests for credential encryption
 *
 * Feature: showroom-external-api
 * Covers: Property 3 — Credential encryption round-trip
 * Requirements: 1.6
 */

const fc = require('fast-check');
const { encrypt, decrypt } = require('../services/credentialEncryption');

// ─── Setup: provide a valid 64-hex-char key for the test environment ──────────
beforeAll(() => {
  process.env.EXTERNAL_API_ENCRYPTION_KEY =
    'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
});
afterAll(() => {
  delete process.env.EXTERNAL_API_ENCRYPTION_KEY;
});

// Valid-UTF-8 strings only: lone surrogates are legitimately replaced with
// U+FFFD by Buffer utf8 encoding, so they can never round-trip byte-for-byte.
const roundtripsUtf8 = (s) =>
  Buffer.from(Buffer.from(s, 'utf8').toString('utf8'), 'utf8').toString('utf8') === s;
const validTextArb = fc
  .string({ minLength: 1, maxLength: 256 })
  .filter(roundtripsUtf8);
const validTextArbNonEmpty = validTextArb;

// ─── Property 3: Credential Encryption Round-Trip ────────────────────────────
describe('Property 3 — Credential encryption round-trip', () => {
  test('encrypt → decrypt round-trip always recovers the original plaintext', () => {
    fc.assert(
      fc.property(validTextArb, (plaintext) => {
        const encrypted = encrypt(plaintext);
        const recovered = decrypt(encrypted);
        expect(recovered).toBe(plaintext);
      }),
      { numRuns: 100 },
    );
  });

  test('encrypted ciphertext always differs from the plaintext for non-empty inputs', () => {
    fc.assert(
      fc.property(validTextArbNonEmpty, (plaintext) => {
        const { ciphertext } = encrypt(plaintext);
        const plaintextHex = Buffer.from(plaintext, 'utf8').toString('hex');
        expect(ciphertext).not.toBe(plaintextHex);
      }),
      { numRuns: 100 },
    );
  });

  test('two encryptions of the same plaintext produce different ciphertexts (random IV)', () => {
    fc.assert(
      fc.property(validTextArbNonEmpty, (plaintext) => {
        const enc1 = encrypt(plaintext);
        const enc2 = encrypt(plaintext);
        expect(enc1.iv).not.toBe(enc2.iv);
        const combined1 = enc1.iv + enc1.ciphertext;
        const combined2 = enc2.iv + enc2.ciphertext;
        expect(combined1).not.toBe(combined2);
      }),
      { numRuns: 100 },
    );
  });
});
