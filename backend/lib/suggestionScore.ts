/**
 * lib/suggestionScore.ts — Pure scoring function for the friend suggestion engine.
 * No database or side-effects — safe to unit/property-test in isolation.
 */

export interface SuggestionCandidate {
  mutual_count?: number | string | null;
  location?: string | null;
  last_active_at?: string | null;
}

export interface SuggestionRequester {
  location?: string | null;
}

/**
 * Returns the number of whole days between an ISO timestamp and now.
 * Returns Infinity for null/undefined/unparseable values so that the
 * activity bonus is never awarded for missing data.
 */
export function daysSince(isoTimestamp: string | null | undefined): number {
  if (!isoTimestamp) return Infinity;
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) return Infinity;
  const diffMs = Date.now() - ms;
  // Negative diff (future timestamp) → treat as 0 days → earns activity bonus
  return diffMs < 0 ? 0 : diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Computes a numeric suggestion score for a candidate relative to the requester.
 *
 * Formula:
 *   score = min(mutual_count × 5, 50)
 *         + (location match ? 10 : 0)
 *         + (active within 30 days ? 5 : 0)
 *
 * Max score: 65. All fields treated defensively.
 */
export function computeScore(
  candidate: SuggestionCandidate,
  requester: SuggestionRequester,
): number {
  const c = candidate ?? {};
  const r = requester ?? {};

  const mutual = Number.isFinite(Number(c.mutual_count)) && Number(c.mutual_count) >= 0
    ? Number(c.mutual_count)
    : 0;
  const mutualScore = Math.min(mutual * 5, 50);

  const candidateLoc = typeof c.location === 'string' ? c.location.trim() : '';
  const requesterLoc = typeof r.location === 'string' ? r.location.trim() : '';
  const locationScore = candidateLoc && requesterLoc && candidateLoc === requesterLoc ? 10 : 0;

  const activityScore = daysSince(c.last_active_at) <= 30 ? 5 : 0;

  return mutualScore + locationScore + activityScore;
}

module.exports = { computeScore, daysSince };
