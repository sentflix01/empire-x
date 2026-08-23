/**
 * externalMappingPreview.ts — client-side twin of the server's mapping engine
 * (backend/services/proxyGateway.ts resolveDotPath + envelope-unwrap heuristic).
 *
 * Patent 4 dependent-claim embodiment: mapping editor with live sample-response
 * preview — lets a tenant verify declarative field mappings against a pasted
 * sample payload BEFORE saving, entirely client-side.
 */

export interface PreviewRow {
  targetField: string;
  label: string;
  sourcePath: string;
}

export interface PreviewResult {
  /** Dot-path resolved value for one row (empty string when unset/missing). */
  values: Record<string, string>;
  /** Top-level keys detected on the first item of the sample. */
  detectedKeys: string[];
  /** Human-readable parse error, or null. */
  parseError: string | null;
  /** The fully-mapped display object (null when nothing usable). */
  mappedSample: Record<string, unknown> | null;
}

/** Resolve a dot path against a plain object; undefined when any hop is missing. */
export function resolveDotPath(obj: unknown, path: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return undefined;
  if (typeof path !== 'string' || !path) return undefined;
  let current: unknown = obj;
  for (const seg of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(current as Record<string, unknown>, seg)) return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Normalize a pasted sample response the same way the backend gateway does:
 * - arrays pass through;
 * - objects with exactly one top-level array member are unwrapped to that array;
 * - anything else becomes a single-item array.
 * Returns the first item for key detection / path preview.
 */
export function unwrapSample(body: unknown): unknown {
  if (Array.isArray(body)) return body.length > 0 ? body[0] : body;
  if (body !== null && typeof body === 'object') {
    const keys = Object.keys(body as Record<string, unknown>);
    if (keys.length === 1 && Array.isArray((body as Record<string, unknown>)[keys[0]])) {
      const arr = (body as Record<string, unknown>)[keys[0]] as unknown[];
      return arr.length > 0 ? arr[0] : body;
    }
    return body;
  }
  return body;
}

/** Stringify any resolved value for display; undefined/missing renders as empty. */
function display(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Compute the live preview for the mapping editor from a pasted sample payload.
 * Pure and synchronous — safe to run on every keystroke via useMemo.
 */
export function computePreview(rawSample: string, rows: PreviewRow[]): PreviewResult {
  if (!rawSample.trim()) {
    return { values: {}, detectedKeys: [], parseError: null, mappedSample: null };
  }
  let body: unknown;
  try {
    body = JSON.parse(rawSample);
  } catch (e) {
    return {
      values: {},
      detectedKeys: [],
      parseError: `Invalid JSON: ${(e as Error).message.slice(0, 120)}`,
      mappedSample: null,
    };
  }

  const sample = unwrapSample(body);
  const detectedKeys =
    sample !== null && typeof sample === 'object' ? Object.keys(sample as Record<string, unknown>) : [];

  const values: Record<string, string> = {};
  const mappedSample: Record<string, unknown> = {};
  for (const row of rows) {
    const trimmed = row.sourcePath.trim();
    if (!trimmed) continue;
    const v = resolveDotPath(sample, trimmed);
    values[row.targetField] = display(v);
    if (v !== undefined) mappedSample[row.targetField] = v;
  }

  return { values, detectedKeys, parseError: null, mappedSample };
}

