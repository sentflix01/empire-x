/**
 * realMode.js — Real-users-only filter middleware
 *
 * When a request contains the header X-Real-Only: 1, this middleware sets
 * req.realOnly = true. Routes can then add WHERE is_seed = FALSE filters
 * to exclude demo/seed accounts from their queries.
 *
 * The filter is applied automatically to:
 *   - /api/posts           (author must be real)
 *   - /api/profiles        (profile must be real)
 *   - /api/businesses      (owner must be real)
 *   - /api/showrooms       (owner must be real)
 *   - /api/products        (seller must be real)
 *   - /api/suggestions     (candidates must be real)
 *   - /api/search          (people results must be real)
 *   - /api/friends         (mutual friends must be real)
 *   - /api/trending        (trending posts from real users)
 *   - /api/messages        (conversations with real users only)
 */

function realModeMiddleware(req, _res, next) {
  req.realOnly = req.headers['x-real-only'] === '1';
  next();
}

/**
 * Helper to build a SQL fragment that filters seed users.
 * Appends AND condition to join-based queries.
 *
 * @param {object} req           Express request object
 * @param {string} userIdColumn  Column name of the user's id (default 'user_id')
 * @returns {string} SQL fragment, e.g. "AND u.is_seed = FALSE" or ""
 */
function realOnlyFilter(req, userIdColumn = 'u.id') {
  if (!req.realOnly) return '';
  return `AND ${userIdColumn}.is_seed = FALSE`;
}

/**
 * Helper for routes that join users table — returns extra WHERE clause.
 * Use when you have a users alias `u`.
 *
 * @param {object} req
 * @returns {string} SQL fragment
 */
function realOnlyUserFilter(req) {
  if (!req.realOnly) return '';
  return 'AND u.is_seed = FALSE';
}

module.exports = { realModeMiddleware, realOnlyFilter, realOnlyUserFilter };
