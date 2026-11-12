/**
 * Text for map marker labels. Leaflet DivIcon html is assigned with
 * innerHTML, so names from the database must be escaped (audit F-057).
 */
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Shortens long names, then escapes, so an entity is never cut in half. */
export function markerLabelHtml(label: string | null | undefined, max = 20): string {
  const text = label ?? '';
  const short = text.length > max ? `${text.slice(0, max - 2)}…` : text;
  return escapeHtml(short);
}
