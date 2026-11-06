/**
 * lib/passwordPolicy.ts — rules for new passwords (audit F-017, ASVS 5.0 V6.2).
 *
 * 8 to 128 characters, not one of 17,950 common passwords (data/common-passwords.txt,
 * case-insensitive), and not the person's email address or its local part.
 * No composition rules: length and the blocklist matter more (NIST SP 800-63B).
 */
import fs from 'fs';
import path from 'path';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

let common: Set<string> | null = null;

/** Finds the list next to the source (ts) or the compiled output (dist). */
function loadCommonPasswords(): Set<string> {
  if (common) return common;
  const candidates = [
    path.join(__dirname, '..', 'data', 'common-passwords.txt'),
    path.join(__dirname, '..', '..', 'data', 'common-passwords.txt'),
    path.join(process.cwd(), 'data', 'common-passwords.txt'),
  ];
  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) throw new Error('data/common-passwords.txt is missing; the password blocklist cannot run');
  common = new Set(fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean));
  return common;
}

export function isCommonPassword(password: string): boolean {
  return loadCommonPasswords().has(password.toLowerCase());
}

/** Returns a message for the person, or null when the password is acceptable. */
export function newPasswordProblem(password: string, context: { email?: string | null } = {}): string | null {
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (password.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`;
  if (isCommonPassword(password)) return 'This password is too common and easy to guess. Choose a different one.';
  const email = (context.email ?? '').trim().toLowerCase();
  if (email) {
    const lower = password.toLowerCase();
    if (lower === email || lower === email.split('@')[0]) return 'Password must not be your email address.';
  }
  return null;
}

/** Loads the list at startup so a missing file fails the deploy, not a sign-up. */
export function assertPasswordPolicyReady(): void {
  loadCommonPasswords();
}
