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

/** A stored section object as the public page renders it. */
export type StoredSection = Record<string, any>;

/**
 * The stored sections as a list of section objects, whatever was stored:
 * a JSON string, an array, null or bad JSON. `JSON.parse(null)` is null, so a
 * site saved without sections used to crash the public page on `.find`.
 */
export function sectionList(raw: unknown): StoredSection[] {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(value)
    ? value.filter((section): section is StoredSection => Boolean(section) && typeof section === 'object' && !Array.isArray(section))
    : [];
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
