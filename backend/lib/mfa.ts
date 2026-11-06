/**
 * lib/mfa.ts — storage and checks for two-factor sign-in (audit F-017).
 *
 * The TOTP secret is encrypted with AES-256-GCM. The key is derived with HKDF
 * from MFA_ENCRYPTION_KEY when set, otherwise from JWT_SECRET; changing the
 * source secret makes existing secrets unreadable, and people then sign in
 * with a recovery code and set up again.
 * Recovery codes are stored as HMAC-SHA256 hashes and work once each.
 */
import crypto from 'crypto';
import pool from '../db/pool';
import { generateTotpSecret, verifyTotp } from './totp';

export const RECOVERY_CODE_COUNT = 10;

interface RecoveryCode { hash: string; used_at: string | null }
export interface MfaRow {
  user_id: string;
  totp_secret_enc: string;
  enabled_at: Date | null;
  last_used_step: string | number | null;
  recovery_codes: RecoveryCode[];
}

function keyMaterial(): string {
  const source = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) throw new Error('MFA needs MFA_ENCRYPTION_KEY or JWT_SECRET');
  return source;
}

function derive(purpose: string): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', keyMaterial(), 'nodbusiness-mfa', purpose, 32));
}

export function encryptSecret(secret: string, userId: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derive('totp-secret'), iv);
  cipher.setAAD(Buffer.from(userId));
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

export function decryptSecret(payload: string, userId: string): string {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unknown MFA secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', derive('totp-secret'), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

function hashRecoveryCode(code: string): string {
  const normal = code.toLowerCase().replace(/[^a-z0-9]/g, '');
  return crypto.createHmac('sha256', derive('recovery-codes')).update(normal).digest('hex');
}

/** Ten codes like "k7p2-x9qd-m4tf" (60 bits each), shown once. */
export function generateRecoveryCodes(): { codes: string[]; stored: RecoveryCode[] } {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const bytes = crypto.randomBytes(12);
    const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
  });
  return { codes, stored: codes.map((c) => ({ hash: hashRecoveryCode(c), used_at: null })) };
}

export async function getMfa(userId: string): Promise<MfaRow | null> {
  const { rows } = await pool.query<MfaRow>('SELECT user_id, totp_secret_enc, enabled_at, last_used_step, recovery_codes FROM user_mfa WHERE user_id = $1', [userId]);
  return rows[0] ?? null;
}

export async function isMfaEnabled(userId: string): Promise<boolean> {
  const row = await getMfa(userId);
  return Boolean(row?.enabled_at);
}

/** Starts (or restarts) setup with a fresh secret; does not affect an enabled setup. */
export async function startSetup(userId: string): Promise<string> {
  const secret = generateTotpSecret();
  const enc = encryptSecret(secret, userId);
  await pool.query(
    `INSERT INTO user_mfa (user_id, totp_secret_enc) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET totp_secret_enc = EXCLUDED.totp_secret_enc, last_used_step = NULL, updated_at = NOW()
     WHERE user_mfa.enabled_at IS NULL`,
    [userId, enc],
  );
  return secret;
}

/**
 * Checks a 6-digit code (and records its step so it cannot be reused) or a
 * recovery code (and marks it used). Returns which one matched, or null.
 */
export async function checkSecondFactor(userId: string, code: string, opts: { allowRecovery: boolean; requireEnabled: boolean }): Promise<'totp' | 'recovery' | null> {
  const row = await getMfa(userId);
  if (!row || (opts.requireEnabled && !row.enabled_at)) return null;
  const trimmed = code.trim();

  if (/^\d{6}$/.test(trimmed.replace(/\s/g, ''))) {
    let secret: string;
    try { secret = decryptSecret(row.totp_secret_enc, userId); } catch { return null; }
    const step = verifyTotp(secret, trimmed.replace(/\s/g, ''));
    if (step === null) return null;
    // Atomic replay guard: only one request can move last_used_step past this step.
    const { rowCount } = await pool.query(
      'UPDATE user_mfa SET last_used_step = $2, updated_at = NOW() WHERE user_id = $1 AND (last_used_step IS NULL OR last_used_step < $2)',
      [userId, step],
    );
    return rowCount ? 'totp' : null;
  }

  if (!opts.allowRecovery) return null;
  const hash = hashRecoveryCode(trimmed);
  const codes = Array.isArray(row.recovery_codes) ? row.recovery_codes : [];
  const idx = codes.findIndex((c) => !c.used_at && crypto.timingSafeEqual(Buffer.from(c.hash), Buffer.from(hash)));
  if (idx === -1) return null;
  const { rowCount } = await pool.query(
    `UPDATE user_mfa SET recovery_codes = jsonb_set(recovery_codes, $2::text[], to_jsonb(NOW()::text)), updated_at = NOW()
     WHERE user_id = $1 AND recovery_codes -> $3::int ->> 'used_at' IS NULL`,
    [userId, `{${idx},used_at}`, idx],
  );
  return rowCount ? 'recovery' : null;
}

export async function enable(userId: string): Promise<string[]> {
  const { codes, stored } = generateRecoveryCodes();
  await pool.query('UPDATE user_mfa SET enabled_at = NOW(), recovery_codes = $2::jsonb, updated_at = NOW() WHERE user_id = $1', [userId, JSON.stringify(stored)]);
  return codes;
}

export async function replaceRecoveryCodes(userId: string): Promise<string[]> {
  const { codes, stored } = generateRecoveryCodes();
  await pool.query('UPDATE user_mfa SET recovery_codes = $2::jsonb, updated_at = NOW() WHERE user_id = $1', [userId, JSON.stringify(stored)]);
  return codes;
}

export async function disable(userId: string): Promise<void> {
  await pool.query('DELETE FROM user_mfa WHERE user_id = $1', [userId]);
}

export function unusedRecoveryCodes(row: MfaRow | null): number {
  return (row?.recovery_codes ?? []).filter((c) => !c.used_at).length;
}
