/**
 * Converts between a website's stored `showrooms.sections` JSON and the
 * builder's editing model: an ordered list of section keys plus one flat
 * map of field values. Showroom Studio and the profile's "Your website" panel
 * both use it, so a site edited in either place saves the same way.
 */
import { getSectionType } from '@/lib/builderSections';

export interface EditableSections {
  /** Section keys in display order, e.g. ["hero", "about", "products"]. */
  keys: string[];
  /** Field values for every section, keyed by field key. */
  fields: Record<string, unknown>;
}

/** Reads `sections` as stored (a JSON string or an array). Unknown section types are skipped. */
export function parseShowroomSections(raw: unknown): EditableSections {
  let sections = raw;
  if (typeof sections === 'string') {
    try { sections = JSON.parse(sections); } catch { sections = undefined; }
  }
  const saved: unknown[] = Array.isArray(sections) ? sections : [];
  const keys = saved
    .map((section) => (typeof section === 'string' ? section : (section as { type?: unknown } | null)?.type))
    .filter((key): key is string => typeof key === 'string' && Boolean(getSectionType(key)));
  const fields = Object.assign({}, ...saved
    .filter((section): section is Record<string, unknown> => Boolean(section) && typeof section === 'object' && !Array.isArray(section))
    .map(({ type: _type, ...rest }) => rest));
  return { keys, fields };
}

/** Builds the stored section objects: each section keeps only its own fields. */
export function serializeShowroomSections(keys: string[], fields: Record<string, unknown>): Array<Record<string, unknown>> {
  return keys.flatMap((key) => {
    const sec = getSectionType(key);
    if (!sec) return [];
    const data: Record<string, unknown> = { type: key };
    sec.fields.forEach((f) => { if (fields[f.key] !== undefined) data[f.key] = fields[f.key]; });
    return [data];
  });
}
