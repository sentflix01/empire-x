/**
 * Location privacy: people (and, where the business rule applies, businesses
 * that hide their address) are shown with a coarse distance only, never with
 * coordinates. See project-brain/DECISIONS.md (2026-11-12).
 */

/** Distances are reported in buckets of this size, in kilometres. */
export const DISTANCE_BUCKET_KM = 0.5;

/**
 * Rounds an exact distance up to the next 0.5 km bucket, so a value means
 * "within X km". The smallest value is 0.5, which the UI shows as "< 0.5 km".
 * Returns null for a missing or non-finite distance.
 */
export function roundedDistanceKm(km: number | null | undefined): number | null {
  if (km == null || !Number.isFinite(km) || km < 0) return null;
  return Math.max(DISTANCE_BUCKET_KM, Math.ceil(km / DISTANCE_BUCKET_KM) * DISTANCE_BUCKET_KM);
}
