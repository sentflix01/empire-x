/**
 * Label for how far away a person is. The API gives people a distance rounded
 * up to 0.5 km and never their coordinates (project-brain/DECISIONS.md,
 * 2026-11-12), so the label never shows metres or more precision than that.
 */
export function formatPersonDistance(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km) || km < 0) return null;
  if (km <= 0.5) return '< 0.5 km away';
  const bucket = Math.ceil(km * 2) / 2;
  return `≈ ${Number.isInteger(bucket) ? bucket : bucket.toFixed(1)} km away`;
}
