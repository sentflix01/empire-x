/**
 * Input rules for Studio fields, matching what the server accepts
 * (backend/lib/showroomInput.ts: title ≤ 120, description ≤ 1000, any text
 * ≤ 5000, no javascript:/data:/file: links). Checking here means the owner
 * sees the problem next to the field instead of a failed publish.
 */

export type FieldKind = 'phone' | 'email' | 'url' | 'text';

export interface FieldRule {
  kind: FieldKind;
  /** HTML input type and keyboard hints for phones. */
  inputType: 'tel' | 'email' | 'url' | 'text';
  inputMode?: 'tel' | 'email' | 'url' | 'text';
  autoComplete?: string;
  maxLength: number;
  /** Shows a live "12 / 120" counter (only for fields with a tight limit). */
  counter: boolean;
}

/** Server limits by form key (the form's title → showroom title, subtitle → description). */
const LIMITS: Record<string, number> = { title: 120, subtitle: 1000 };
const TEXT_MAX = 5000;

const PHONE_KEYS = /^(phone|whatsapp|mobile|tel|telephone)$/i;
const EMAIL_KEYS = /^(email|e-?mail)$/i;
const URL_KEYS = /^(facebook|instagram|telegram|youtube|tiktok|linkedin|twitter|x|website|url|link|videoUrl|video|mapUrl|bookingUrl|menuUrl)$/i;

export function fieldRule(key: string, label = ''): FieldRule {
  if (PHONE_KEYS.test(key) || /phone|whatsapp/i.test(label)) return { kind: 'phone', inputType: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 30, counter: false };
  if (EMAIL_KEYS.test(key)) return { kind: 'email', inputType: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 254, counter: false };
  if (URL_KEYS.test(key) || /\blink\b/i.test(label)) return { kind: 'url', inputType: 'url', inputMode: 'url', autoComplete: 'url', maxLength: 2048, counter: false };
  const max = LIMITS[key] ?? TEXT_MAX;
  return { kind: 'text', inputType: 'text', maxLength: max, counter: max <= 1000 };
}

const UNSAFE_URL = /^\s*(?:javascript|vbscript|data|file|blob)\s*:/i;

/** Returns a plain-words problem with the value, or null when it is fine (empty is fine). */
export function checkField(rule: FieldRule, raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (value.length > rule.maxLength) return `Keep this to ${rule.maxLength.toLocaleString()} characters or fewer.`;
  if (UNSAFE_URL.test(value)) return 'This kind of link is not allowed. Use a web address that starts with https://';
  switch (rule.kind) {
    case 'phone': {
      const digits = value.replace(/\D/g, '');
      if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) return 'Enter a phone number with digits only, for example +251 91 234 5678.';
      return null;
    }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : 'Enter an email address like name@example.com.';
    case 'url': {
      // A bare handle-free address like "facebook.com/selam" is fine: we add https:// for the owner.
      const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
      try {
        const u = new URL(withScheme);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'Use a web address that starts with https://';
        if (!u.hostname.includes('.')) return 'Enter the full web address, for example https://facebook.com/yourpage.';
        return null;
      } catch {
        return 'Enter the full web address, for example https://facebook.com/yourpage.';
      }
    }
    default:
      return null;
  }
}

/** Tidies a link when the owner leaves the field: adds https:// to "facebook.com/x". */
export function normaliseUrl(raw: string): string {
  const value = raw.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('/')) return value;
  return /^[^\s/]+\.[^\s/]+/.test(value) ? `https://${value}` : value;
}
