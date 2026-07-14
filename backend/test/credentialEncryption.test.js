'use strict';

/**
 * Unit tests for backend/services/credentialEncryption.js
 *
 * Validates: Requirements 1.6
 * Design refs: Testing Strategy → Unit Tests (credentialEncryption.test.js)
 */

// Set a valid 64-hex-char encryption key for all tests before loading the module
process.env.EXTERNAL_API_ENCRYPTION_KEY = 'a'.repeat(64);

const { encrypt, decrypt } = require('../services/credentialEncryption');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a hex string that differs from `original` by one bit in the ciphertext */
function tamperCiphertext(ciphertext) {
  const buf = Buffer.from(ciphertext, 'hex');
  buf[0] ^= 0x01;
  return buf.toString('hex');
}

// ---------------------------------------------------------------------------
// Group: encrypt / decrypt round-trip
// ---------------------------------------------------------------------------

describe('credentialEncryption — round-trip', () => {
  const cases = [
    { label: 'single ASCII char', value: 'x' },
    { label: 'short ASCII string', value: 'hello' },
    { label: 'typical API key (64 chars)', value: 'sk_live_' + 'A'.repeat(56) },
    { label: 'long string (1000 chars)', value: 'z'.repeat(1000) },
    { label: 'unicode / emoji', value: '🔑密码パスワード' },
    { label: 'whitespace only', value: '   ' },
    { label: 'newlines and tabs', value: 'line1\nline2\ttabbed' },
    { label: 'JSON-like string', value: '{"token":"abc123","expiry":9999}' },
    { label: 'special chars', value: '!@#$%^&*()_+-=[]{}|;\':",./<>?' },
    { label: 'null-byte-adjacent (not actual null)', value: '\x01\x02\x03' },
  ];

  test.each(cases)('round-trip: $label', ({ value }) => {
    const encrypted = encrypt(value);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(value);
  });

  test('round-trip: empty string', () => {
    // Empty string is a valid plaintext — should round-trip cleanly
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Group: encrypt(x) !== x  (ciphertext ≠ plaintext)
// ---------------------------------------------------------------------------

describe('credentialEncryption — ciphertext differs from plaintext', () => {
  const inputs = [
    'secret',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'a',
    'A'.repeat(100),
    '1234567890',
  ];

  test.each(inputs)('encrypt("%s") output differs from plaintext', (plaintext) => {
    const { iv, authTag, ciphertext } = encrypt(plaintext);

    // Neither the individual fields nor any combination should equal the plaintext
    expect(iv).not.toBe(plaintext);
    expect(authTag).not.toBe(plaintext);
    expect(ciphertext).not.toBe(plaintext);

    // The full serialized object must not equal the plaintext
    const serialized = JSON.stringify({ iv, authTag, ciphertext });
    expect(serialized).not.toBe(plaintext);

    // For inputs long enough to avoid coincidental substring matches in hex,
    // verify the ciphertext hex doesn't contain the plaintext as a substring
    // (avoids false positives from single-char plaintexts appearing in long hex strings)
    if (plaintext.length >= 4) {
      expect(ciphertext).not.toContain(plaintext);
    }
  });
});

// ---------------------------------------------------------------------------
// Group: random IV — two encryptions of the same value produce different ciphertexts
// ---------------------------------------------------------------------------

describe('credentialEncryption — random IV per call', () => {
  const inputs = ['sameSecret', 'anotherValue', 'A'.repeat(50)];

  test.each(inputs)('two encryptions of "%s" produce different IVs and ciphertexts', (plaintext) => {
    const first = encrypt(plaintext);
    const second = encrypt(plaintext);

    // IVs must differ (random IV)
    expect(first.iv).not.toBe(second.iv);

    // Ciphertexts must differ (different IV → different ciphertext, even for identical plaintext)
    expect(first.ciphertext).not.toBe(second.ciphertext);

    // But both must still decrypt to the same original plaintext
    expect(decrypt(first)).toBe(plaintext);
    expect(decrypt(second)).toBe(plaintext);
  });

  test('running encrypt 10 times on the same input yields 10 distinct IVs', () => {
    const plaintext = 'testValue';
    const ivs = new Set();
    for (let i = 0; i < 10; i++) {
      const { iv } = encrypt(plaintext);
      ivs.add(iv);
    }
    expect(ivs.size).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Group: output structure
// ---------------------------------------------------------------------------

describe('credentialEncryption — output structure', () => {
  test('encrypt returns object with iv, authTag, ciphertext as hex strings', () => {
    const result = encrypt('some-api-key');
    expect(result).toEqual(
      expect.objectContaining({
        iv: expect.any(String),
        authTag: expect.any(String),
        ciphertext: expect.any(String),
      })
    );

    // All values must be valid hex strings
    expect(result.iv).toMatch(/^[0-9a-f]+$/i);
    expect(result.authTag).toMatch(/^[0-9a-f]+$/i);
    expect(result.ciphertext).toMatch(/^[0-9a-f]+$/i);

    // IV is 96 bits = 12 bytes = 24 hex chars
    expect(result.iv).toHaveLength(24);

    // AuthTag is 128 bits = 16 bytes = 32 hex chars
    expect(result.authTag).toHaveLength(32);
  });
});

// ---------------------------------------------------------------------------
// Group: tamper / wrong key detection
// ---------------------------------------------------------------------------

describe('credentialEncryption — tamper detection', () => {
  test('decrypt throws when ciphertext is tampered', () => {
    const encrypted = encrypt('sensitive-data');
    const tampered = {
      ...encrypted,
      ciphertext: tamperCiphertext(encrypted.ciphertext),
    };
    expect(() => decrypt(tampered)).toThrow();
  });

  test('decrypt throws when authTag is tampered', () => {
    const encrypted = encrypt('sensitive-data');
    const tampered = {
      ...encrypted,
      authTag: tamperCiphertext(encrypted.authTag), // flip a bit
    };
    expect(() => decrypt(tampered)).toThrow();
  });

  test('decrypt throws when iv is wrong', () => {
    const encrypted = encrypt('sensitive-data');
    // Use IV from a different encryption
    const other = encrypt('other-value');
    const tampered = { ...encrypted, iv: other.iv };
    expect(() => decrypt(tampered)).toThrow();
  });

  test('decrypt throws with wrong encryption key', () => {
    const encrypted = encrypt('secret-value');

    // Temporarily swap the key to a different value
    const originalKey = process.env.EXTERNAL_API_ENCRYPTION_KEY;
    process.env.EXTERNAL_API_ENCRYPTION_KEY = 'b'.repeat(64);
    try {
      expect(() => decrypt(encrypted)).toThrow();
    } finally {
      process.env.EXTERNAL_API_ENCRYPTION_KEY = originalKey;
    }
  });

  test('decrypt throws when called with missing fields', () => {
    expect(() => decrypt({ iv: null, authTag: null, ciphertext: null })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Group: input validation
// ---------------------------------------------------------------------------

describe('credentialEncryption — input validation', () => {
  test('encrypt throws TypeError for non-string input', () => {
    expect(() => encrypt(123)).toThrow(TypeError);
    expect(() => encrypt(null)).toThrow(TypeError);
    expect(() => encrypt(undefined)).toThrow(TypeError);
    expect(() => encrypt({})).toThrow(TypeError);
  });

  test('encrypt throws when EXTERNAL_API_ENCRYPTION_KEY is missing', () => {
    const saved = process.env.EXTERNAL_API_ENCRYPTION_KEY;
    delete process.env.EXTERNAL_API_ENCRYPTION_KEY;
    try {
      expect(() => encrypt('test')).toThrow(/EXTERNAL_API_ENCRYPTION_KEY/);
    } finally {
      process.env.EXTERNAL_API_ENCRYPTION_KEY = saved;
    }
  });

  test('encrypt throws when EXTERNAL_API_ENCRYPTION_KEY is wrong length', () => {
    const saved = process.env.EXTERNAL_API_ENCRYPTION_KEY;
    process.env.EXTERNAL_API_ENCRYPTION_KEY = 'abc123'; // too short
    try {
      expect(() => encrypt('test')).toThrow(/EXTERNAL_API_ENCRYPTION_KEY/);
    } finally {
      process.env.EXTERNAL_API_ENCRYPTION_KEY = saved;
    }
  });
});
