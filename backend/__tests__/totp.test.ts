/** TOTP against the RFC 6238 Appendix B test vectors (SHA-1). */
import { base32Encode, base32Decode, hotp, verifyTotp, otpauthUri, generateTotpSecret } from '../lib/totp';

const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');

describe('RFC 6238 vectors (8 digits, SHA-1)', () => {
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('T=%i -> %s', (t, expected) => {
    expect(hotp(RFC_SECRET, Math.floor(t / 30), 8)).toBe(expected);
  });
});

describe('verifyTotp', () => {
  const secret = base32Encode(RFC_SECRET);
  const at = 1111111111 * 1000;
  const code = hotp(RFC_SECRET, Math.floor(1111111111 / 30));

  it('accepts the current code and returns its step', () => {
    expect(verifyTotp(secret, code, { timeMs: at })).toBe(Math.floor(1111111111 / 30));
  });
  it('accepts one step of clock drift either way, not two', () => {
    expect(verifyTotp(secret, code, { timeMs: at + 30_000 })).not.toBeNull();
    expect(verifyTotp(secret, code, { timeMs: at - 30_000 })).not.toBeNull();
    expect(verifyTotp(secret, code, { timeMs: at + 61_000 })).toBeNull();
  });
  it('rejects malformed codes', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 456']) expect(verifyTotp(secret, bad, { timeMs: at })).toBeNull();
  });
});

describe('helpers', () => {
  it('round-trips base32', () => {
    expect(base32Decode(base32Encode(RFC_SECRET)).equals(RFC_SECRET)).toBe(true);
    expect(base32Encode(RFC_SECRET)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });
  it('makes 160-bit secrets', () => {
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });
  it('builds an otpauth URI', () => {
    const uri = otpauthUri('ABC', 'a@b.test');
    expect(uri).toMatch(/^otpauth:\/\/totp\/Nodbusiness%3Aa%40b\.test\?/);
    expect(uri).toContain('secret=ABC');
    expect(uri).toContain('issuer=Nodbusiness');
  });
});
