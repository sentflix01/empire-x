/**
 * The section types a business chose for its Feed Spotlight, from whatever
 * shape the API returns: a list, a JSON string of a list, or a bad stored
 * value such as `{}` (written by an old save bug). Anything that isn't a list
 * of strings counts as "none chosen", so the feed never crashes on it.
 */
export function spotlightSectionIds(value: unknown): string[] {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}
