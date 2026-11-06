/**
 * lib/totp.ts — time-based one-time passwords (RFC 6238 / RFC 4226), as used
 * by authenticator apps: HMAC-SHA1, 30-second steps, 6 digits (audit F-017).
 * Uses Node's crypto only.
 */
import crypto from 'crypto';

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0; let value = 0; let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0; let value = 0; const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** A new random secret: 20 bytes (160 bits), base32. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** HOTP value for a counter (RFC 4226). */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac('sha1', secret).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

export function totpStep(timeMs = Date.now()): number {
  return Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);
}

/**
 * The matching time step for `code` within ±`window` steps of now, or null.
 * The caller rejects steps at or before the last one used (no replay).
 */
export function verifyTotp(secretBase32: string, code: string, opts: { timeMs?: number; window?: number } = {}): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const now = totpStep(opts.timeMs);
  const window = opts.window ?? 1;
  for (let delta = -window; delta <= window; delta += 1) {
    const candidate = hotp(secret, now + delta);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(code))) return now + delta;
  }
  return null;
}

/** otpauth:// URI for the QR code an authenticator app scans. */
export function otpauthUri(secretBase32: string, accountName: string, issuer = 'Nodbusiness'): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
