/**
 * Whether admins must use two-factor sign-in (audit F-017). On by default in
 * production; ADMIN_MFA_REQUIRED=true|false overrides it anywhere.
 */
export function adminMfaRequired(): boolean {
  const v = process.env.ADMIN_MFA_REQUIRED;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return process.env.NODE_ENV === 'production';
}
