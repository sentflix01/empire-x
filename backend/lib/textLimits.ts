/**
 * Maximum lengths for text sent to the API (audit F-058).
 *
 * Every JSON request body is checked once, right after parsing
 * (middleware/textLimits.ts), so the limit holds for every route, including
 * the ones that write with their own SQL. A field gets the limit for its name;
 * any other text field gets DEFAULT_MAX. Fields that carry JSON as text
 * (website sections, profile lists) get a larger allowance.
 *
 * Owner decision 2026-11-12 (project-brain/DECISIONS.md): product name 200,
 * description 5,000, post 5,000, business name 100 characters.
 */

/** Characters, counted as JavaScript string length. */
export const TEXT_LIMITS: Readonly<Record<string, number>> = Object.freeze({
  // Names and titles
  title: 200,
  name: 100,
  business_name: 100,
  display_name: 100,
  full_name: 100,
  username: 50,
  headline: 160,
  tagline: 160,
  subtitle: 300,
  category: 100,
  business_category: 100,
  // Longer text
  description: 5_000,
  business_description: 5_000,
  content: 5_000,
  caption: 2_200,
  bio: 1_000,
  message: 5_000,
  text: 5_000,
  note: 1_000,
  notes: 2_000,
  reason: 1_000,
  ticker_text: 300,
  address: 300,
  business_address: 300,
  pickup_address: 300,
  // JSON stored as text
  sections: 200_000,
  business_sections: 200_000,
  skills: 20_000,
  languages: 20_000,
  experience: 20_000,
  education: 20_000,
  certifications: 20_000,
  awards: 20_000,
  services: 20_000,
  service_areas: 20_000,
  attributes: 20_000,
  bundle_components: 20_000,
  images: 20_000,
});

/** Any text field without its own limit. */
export const DEFAULT_MAX = 10_000;

/** Bodies are not inspected deeper than this; deeper text is still capped by the body-size limit. */
const MAX_DEPTH = 6;

export interface TextLimitViolation {
  field: string;
  max: number;
  length: number;
}

function limitFor(key: string): number {
  return TEXT_LIMITS[key] ?? DEFAULT_MAX;
}

/**
 * The first string in `body` that is longer than its limit, or null.
 * Objects and arrays are walked; inside an array the parent key's name applies
 * to plain strings (e.g. `tags: ["…"]`), and object items use their own keys.
 */
export function findTextLimitViolation(body: unknown, key = '', depth = 0): TextLimitViolation | null {
  if (typeof body === 'string') {
    const max = limitFor(key);
    return body.length > max ? { field: key || 'value', max, length: body.length } : null;
  }
  if (!body || typeof body !== 'object' || depth > MAX_DEPTH) return null;
  if (Array.isArray(body)) {
    for (const item of body) {
      const hit = findTextLimitViolation(item, key, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  for (const [childKey, value] of Object.entries(body as Record<string, unknown>)) {
    const hit = findTextLimitViolation(value, childKey, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** "business_name" -> "Business name" for the error message. */
export function fieldLabel(field: string): string {
  const words = field.replace(/_/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Text';
}
