/**
 * Server-side checks for website (showroom) create and update bodies
 * (audit 2026-11-14, docs/audits/2026-11-showroom-builder-audit.md).
 *
 * - Only these columns can be written by an owner: everything else on the row
 *   (view_count, spotlight_*, expires_at, owner_id, is_seed…) is server-owned.
 * - Lengths are capped so one site cannot hold megabytes of text.
 * - Sections must be a JSON array of objects; retired section types
 *   (owner-written testimonials) are dropped, and no string anywhere in a
 *   section may be a script or data URL (links and images are rendered as
 *   href/src on the public page).
 * - A slug is lowercase letters, digits and dashes, 3–80 characters.
 */
const { RETIRED_SECTIONS } = require('./builderSectionRequirements') as { RETIRED_SECTIONS: ReadonlySet<string> };

export const SHOWROOM_LIMITS = Object.freeze({
  title: 120,
  description: 1000,
  category: 80,
  template: 80,
  url: 2048,
  sections: 40,
  sectionBytes: 64 * 1024,
  sectionsBytes: 512 * 1024,
  string: 5000,
});

const WRITABLE = ['title', 'description', 'category', 'template', 'sections', 'status', 'business_id', 'theme_color', 'cover_image', 'logo_url', 'slug'] as const;
const STATUSES = new Set(['draft', 'published', 'archived']);
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,78})[a-z0-9]$/;
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const UNSAFE_URL_RE = /^\s*(?:javascript|vbscript|data|file|blob)\s*:/i;
const SAFE_IMAGE_RE = /^(?:https:\/\/|\/(?!\/))/i;

export type ShowroomInputResult =
  | { ok: true; fields: Record<string, unknown> }
  | { ok: false; status: 400; error: string; message: string; field?: string };

const fail = (error: string, message: string, field?: string): ShowroomInputResult => ({ ok: false, status: 400, error, message, field });

/** Walks every string in a section; returns the dotted path of the first unsafe one. */
function findUnsafe(value: unknown, path: string, depth = 0): { path: string; reason: 'url' | 'length' } | null {
  if (depth > 8) return { path, reason: 'length' };
  if (typeof value === 'string') {
    if (value.length > SHOWROOM_LIMITS.string) return { path, reason: 'length' };
    if (UNSAFE_URL_RE.test(value)) return { path, reason: 'url' };
    return null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findUnsafe(value[i], `${path}[${i}]`, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const hit = findUnsafe(v, path ? `${path}.${k}` : k, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Parses and checks a sections value (JSON string or array). Returns the
 * cleaned array (retired types removed) serialised as the TEXT column expects.
 */
export function cleanSections(value: unknown): { ok: true; sections: string } | { ok: false; message: string; field?: string } {
  let parsed = value;
  if (typeof parsed === 'string') {
    if (parsed.length > SHOWROOM_LIMITS.sectionsBytes) return { ok: false, message: 'Your website is too large. Remove some sections or text.' };
    try { parsed = JSON.parse(parsed); } catch { return { ok: false, message: 'Website sections must be valid JSON.' }; }
  }
  if (!Array.isArray(parsed)) return { ok: false, message: 'Website sections must be a list.' };
  const kept = parsed.filter((s) => !(s && typeof s === 'object' && RETIRED_SECTIONS.has(String((s as Record<string, unknown>).type ?? (s as Record<string, unknown>).key))));
  if (kept.length > SHOWROOM_LIMITS.sections) return { ok: false, message: `A website can have at most ${SHOWROOM_LIMITS.sections} sections.` };
  for (let i = 0; i < kept.length; i++) {
    const section = kept[i];
    if (!section || typeof section !== 'object' || Array.isArray(section)) return { ok: false, message: 'Each website section must be an object.', field: `sections[${i}]` };
    if (JSON.stringify(section).length > SHOWROOM_LIMITS.sectionBytes) return { ok: false, message: 'One of your sections is too large. Shorten its text or remove some items.', field: `sections[${i}]` };
    const hit = findUnsafe(section, '');
    if (hit) {
      const type = String((section as Record<string, unknown>).type ?? 'section');
      return hit.reason === 'url'
        ? { ok: false, message: `The ${type} section has a link or image that is not allowed. Use an https:// web address.`, field: `sections[${i}].${hit.path}` }
        : { ok: false, message: `The ${type} section has text that is too long.`, field: `sections[${i}].${hit.path}` };
    }
  }
  const sections = JSON.stringify(kept);
  if (sections.length > SHOWROOM_LIMITS.sectionsBytes) return { ok: false, message: 'Your website is too large. Remove some sections or text.' };
  return { ok: true, sections };
}

/** Lower-case URL-safe slug from any title; falls back to "site" for non-Latin titles. */
export function slugBase(title: string): string {
  const base = title.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
  return base.length >= 3 ? base : `site${base ? `-${base}` : ''}`;
}

/** Validates an owner's create/update body; returns only writable, checked fields. */
export function checkShowroomInput(body: unknown): ShowroomInputResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_body', 'Send the website as a JSON object.');
  const input = body as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  for (const key of WRITABLE) if (input[key] !== undefined) fields[key] = input[key];

  for (const [key, max] of [['title', SHOWROOM_LIMITS.title], ['description', SHOWROOM_LIMITS.description], ['category', SHOWROOM_LIMITS.category], ['template', SHOWROOM_LIMITS.template]] as const) {
    const v = fields[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string') return fail('invalid_field', `${key} must be text.`, key);
    const trimmed = v.trim();
    if (trimmed.length > max) return fail('field_too_long', `${key === 'title' ? 'The website name' : key} can be at most ${max} characters.`, key);
    fields[key] = trimmed;
  }
  if (fields.title !== undefined && !fields.title) return fail('invalid_field', 'Add your website name.', 'title');
  if (fields.status !== undefined && !STATUSES.has(String(fields.status))) return fail('invalid_status', 'Invalid showroom status', 'status');
  if (fields.business_id !== undefined && fields.business_id !== null && typeof fields.business_id !== 'string') return fail('invalid_field', 'business_id must be text.', 'business_id');
  if (fields.theme_color !== undefined && fields.theme_color !== null && !HEX_RE.test(String(fields.theme_color))) return fail('invalid_field', 'Theme colour must be a hex colour like #2563EB.', 'theme_color');
  for (const key of ['cover_image', 'logo_url'] as const) {
    const v = fields[key];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string' || v.length > SHOWROOM_LIMITS.url || !SAFE_IMAGE_RE.test(v)) return fail('invalid_field', 'Images must be uploaded or use an https:// address.', key);
  }
  if (fields.slug !== undefined) {
    if (typeof fields.slug !== 'string' || !SLUG_RE.test(fields.slug)) return fail('invalid_slug', 'A web address can use only lowercase letters, numbers and dashes (3–80 characters).', 'slug');
  }
  if (fields.sections !== undefined) {
    const cleaned = cleanSections(fields.sections);
    if (!cleaned.ok) return fail('invalid_showroom_sections', cleaned.message, cleaned.field);
    fields.sections = cleaned.sections;
  }
  return { ok: true, fields };
}
