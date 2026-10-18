/**
 * Email sign-ups from a published website's Newsletter section
 * (table showroom_newsletter_signups, migrate66). Visitors add an address;
 * only the site's owner can list them.
 */
import pool from '../db/pool';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trimmed, lower-cased address, or null when it is not a plausible email. */
export function normaliseSignupEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return email.length >= 3 && email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** True when the stored sections include a Newsletter section. */
export function hasNewsletterSection(sections: unknown): boolean {
  let list = sections;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { return false; }
  }
  return Array.isArray(list) && list.some((s) => s === 'newsletter' || (s && typeof s === 'object' && (s as { type?: unknown }).type === 'newsletter'));
}

/** Saves the address once per site; signing up again is a no-op. */
export async function addSignup(showroomId: string, email: string): Promise<void> {
  await pool.query(
    `INSERT INTO showroom_newsletter_signups (showroom_id, email) VALUES ($1, $2)
     ON CONFLICT (showroom_id, lower(email)) DO NOTHING`,
    [showroomId, email],
  );
}

export async function listSignups(showroomId: string, limit = 500): Promise<{ total: number; signups: Array<{ email: string; created_at: string }> }> {
  const [{ rows }, { rows: count }] = await Promise.all([
    pool.query<{ email: string; created_at: string }>(
      'SELECT email, created_at FROM showroom_newsletter_signups WHERE showroom_id = $1 ORDER BY created_at DESC LIMIT $2',
      [showroomId, limit],
    ),
    pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM showroom_newsletter_signups WHERE showroom_id = $1', [showroomId]),
  ]);
  return { total: Number(count[0]?.total ?? 0), signups: rows };
}
