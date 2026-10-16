/**
 * lib/contactPrivacy.ts — Server-side contact-field visibility.
 *
 * Only the contact fields an owner marked public leave the server for other
 * viewers (default: business phone and email). The business address is private
 * unless chosen, and the pickup address is never public: it is shared with a
 * buyer only on their order. Owners and admins always see everything.
 * See docs/decisions/platform-model-decisions.md §2.3.
 */
export const CONTACT_FIELDS = ['business_contact_phone', 'business_contact_email', 'business_address'] as const;
export type ContactField = typeof CONTACT_FIELDS[number];
export const DEFAULT_PUBLIC_CONTACT_FIELDS: ContactField[] = ['business_contact_phone', 'business_contact_email'];

/** Fields that never leave the server for anyone but the owner. */
const OWNER_ONLY_FIELDS = ['pickup_address'];

function publicFieldsOf(row: Record<string, unknown>): Set<string> {
  const configured = row.public_contact_fields;
  return new Set(Array.isArray(configured) ? configured.map(String) : DEFAULT_PUBLIC_CONTACT_FIELDS);
}

export function redactContactFields<T extends Record<string, unknown>>(row: T, canSeeAll: boolean): T {
  if (canSeeAll || !row) return row;
  const visible = publicFieldsOf(row);
  const copy: Record<string, unknown> = { ...row };
  for (const field of CONTACT_FIELDS) if (!visible.has(field)) copy[field] = null;
  for (const field of OWNER_ONLY_FIELDS) delete copy[field];
  return copy as T;
}

/** Validates an owner's chosen list; returns null when the input is invalid. */
export function parsePublicContactFields(value: unknown): ContactField[] | null {
  if (!Array.isArray(value)) return null;
  const allowed = new Set<string>(CONTACT_FIELDS);
  if (!value.every((item) => typeof item === 'string' && allowed.has(item))) return null;
  return [...new Set(value as ContactField[])];
}
