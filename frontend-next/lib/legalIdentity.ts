/**
 * Who operates Nodbusiness, as shown on legal pages, receipts of contact and
 * policy footers. Change these in one place when the company is registered.
 *
 * Audit LEGAL-02 / LEGAL-03: the pages showed "City, Country" and addresses on
 * nodbusiness.app, a domain the project doesn't own, so no mail arrived.
 * The registration number stays "pending" until a real one exists: an
 * invented official number would itself be misleading.
 */
export const LEGAL_NAME = 'Nodbusiness';
export const LEGAL_ADDRESS = 'Addis Ababa, Ethiopia';
export const LEGAL_REGISTRATION = 'Business registration pending';
/** The one inbox the team reads, for privacy, legal, seller and support requests. */
export const CONTACT_EMAIL = 'nodbusinesses@gmail.com';
export const POLICIES_UPDATED = 'October 2026';

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
