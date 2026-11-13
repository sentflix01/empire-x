/**
 * lib/locationPrivacy.ts — How precisely a place's location leaves the server.
 *
 * A business's exact map pin is shown to other people only when its owner
 * made the address public (public_contact_fields includes business_address).
 * Otherwise viewers get coordinates rounded to about 1 km (enough to place a
 * pin in the right neighbourhood) and distances rounded to 0.5 km. Owners and
 * admins always see the exact pin. See project-brain/DECISIONS.md
 * ("Business location: exact pin only when the address is public") and
 * docs/decisions/platform-model-decisions.md §2.3.
 *
 * People never get coordinates at all, only a distance from
 * roundedDistanceKm (project-brain/DECISIONS.md 2026-11-12).
 */

/** Two decimal places of a degree is about 1.1 km of latitude. */
const COARSE_DECIMALS = 2;

export function coarseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const f = 10 ** COARSE_DECIMALS;
  return Math.round(n * f) / f;
}

/** Distances are reported in buckets of this size, in kilometres. */
export const DISTANCE_BUCKET_KM = 0.5;

/**
 * Rounds an exact distance up to the next 0.5 km bucket, so a value means
 * "within X km" (people and hidden-address businesses alike; see
 * project-brain/DECISIONS.md 2026-11-12). The smallest value is 0.5, which
 * the UI shows as "< 0.5 km". Accepts numbers or numeric strings (SQL
 * NUMERIC). Returns null for a missing, negative or non-finite distance, and
 * for 999 or more, the placeholder routes use for "no pin".
 */
export function roundedDistanceKm(km: unknown): number | null {
  if (km === null || km === undefined || km === '') return null;
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0 || n >= 999) return null;
  return Math.max(DISTANCE_BUCKET_KM, Math.ceil(n / DISTANCE_BUCKET_KM) * DISTANCE_BUCKET_KM);
}

/** Whether the owner chose to show the business address (and so the exact pin). */
export function isAddressPublic(row: Record<string, unknown>): boolean {
  const fields = row.public_contact_fields;
  return Array.isArray(fields) && fields.map(String).includes('business_address');
}

/**
 * Replaces latitude/longitude with coarse values unless the exact pin may be
 * shown. Rows without location columns are returned unchanged.
 */
export function protectCoordinates<T extends Record<string, unknown>>(row: T, exactAllowed: boolean): T {
  if (exactAllowed || !row || !('latitude' in row || 'longitude' in row)) return row;
  const copy: Record<string, unknown> = { ...row };
  if ('latitude' in copy) copy.latitude = coarseCoordinate(copy.latitude);
  if ('longitude' in copy) copy.longitude = coarseCoordinate(copy.longitude);
  return copy as T;
}

/**
 * Validates an owner's pin. Both values must be given together (or both null
 * to clear the pin). Returns an error message, or null when valid; on success
 * the values in `updates` are normalised to numbers or null.
 */
export function locationFieldError(updates: Record<string, unknown>): string | null {
  const hasLat = updates.latitude !== undefined;
  const hasLon = updates.longitude !== undefined;
  if (!hasLat && !hasLon) return null;
  if (hasLat !== hasLon) return 'latitude and longitude must be set together';
  if (updates.latitude === null && updates.longitude === null) return null;
  const lat = Number(updates.latitude);
  const lon = Number(updates.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return 'latitude must be between -90 and 90 and longitude between -180 and 180';
  }
  updates.latitude = Math.round(lat * 1e7) / 1e7;
  updates.longitude = Math.round(lon * 1e7) / 1e7;
  return null;
}
