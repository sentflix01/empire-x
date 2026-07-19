/**
 * suggestionScore.js
 * Pure scoring function for the friend suggestion engine.
 * No database or side-effects — safe to unit/property-test in isolation.
 */

/**
 * Returns the number of whole days between an ISO timestamp and now.
 * Returns Infinity for null/undefined/unparseable values so that the
 * activity bonus is never awarded for missing data.
 *
 * @param {string|null|undefined} isoTimestamp
 * @returns {number}
 */
function daysSince(isoTimestamp) {
  if (!isoTimestamp) return Infinity;
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) return Infinity;
  const diffMs = Date.now() - ms;
  // Negative diff (future timestamp) → treat as 0 days ago → earns activity bonus
  if (diffMs < 0) return 0;
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Computes a numeric suggestion score for a candidate relative to the requester.
 *
 * Formula (Requirement 5.1):
 *   score = min(mutual_count * 5, 50)
 *         + (candidate.location === requester.location && both non-empty ? 10 : 0)
 *         + (daysSince(candidate.last_active_at) <= 30 ? 5 : 0)
 *
 * All fields are treated defensively — null/undefined yields 0 for that component.
 *
 * @param {{ mutual_count?: number, location?: string|null, last_active_at?: string|null }} candidate
 * @param {{ location?: string|null }} requester
 * @returns {number} Score in the range [0, 65]
 */
function computeScore(candidate, requester) {
  // Guard: treat missing objects as empty
  const c = candidate || {};
  const r = requester || {};

  // Mutual connections component: 5 pts each, capped at 50
  const mutual = Number.isFinite(Number(c.mutual_count)) && Number(c.mutual_count) >= 0
    ? Number(c.mutual_count)
    : 0;
  const mutualScore = Math.min(mutual * 5, 50);

  // Location match component: +10 only when both sides have a non-empty location string
  const candidateLoc = c.location && typeof c.location === 'string' ? c.location.trim() : '';
  const requesterLoc = r.location && typeof r.location === 'string' ? r.location.trim() : '';
  const locationScore = candidateLoc && requesterLoc && candidateLoc === requesterLoc ? 10 : 0;

  // Activity recency component: +5 if active within the last 30 days
  const activityScore = daysSince(c.last_active_at) <= 30 ? 5 : 0;

  return mutualScore + locationScore + activityScore;
}

module.exports = { computeScore, daysSince };
