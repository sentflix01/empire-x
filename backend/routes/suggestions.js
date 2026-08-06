/**
 * routes/suggestions.js
 * Friend suggestion endpoints.
 *
 * GET  /api/suggestions/people           — returns up to 20 scored suggestions
 * POST /api/suggestions/dismiss/:targetUserId — dismisses a suggestion
 */

const router = require('express').Router();
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');

// ── GET /api/suggestions/people ───────────────────────────────────────────────
// Cache per user for 5 minutes — suggestions don't change that fast
router.get('/people', requireAuth, cacheMiddleware('suggestions', 300, { varyByUser: true, varyByQuery: false }), async (req, res) => {
  const requesterId = req.user.id;

  try {
    // ── Step 1: scored CTE query (design.md Data Models section) ─────────────
    const scoredSql = `
      WITH requester AS (
        SELECT u.id, up.location, u.is_seed
        FROM users u
        JOIN user_profiles up ON up.user_id = u.id
        WHERE u.id = $1
      ),
      mutual AS (
        SELECT f2.follower_id AS candidate_id, COUNT(*) AS mutual_count
        FROM follows f1
        JOIN follows f2 ON f1.followed_id = f2.followed_id
        WHERE f1.follower_id = (SELECT id FROM requester)
          AND f2.follower_id <> (SELECT id FROM requester)
        GROUP BY f2.follower_id
      ),
      -- Users sharing ≥1 common followed user with the current user
      -- Also includes all non-seed real users as fallback with score 0
      candidates AS (
        SELECT
          u.id                              AS user_id,
          COALESCE(up.display_name, u.full_name, u.email) AS display_name,
          up.avatar_url,
          up.business_name,
          up.location,
          COALESCE(up.follower_count, 0)    AS follower_count,
          u.is_seed,
          u.updated_at                      AS last_active_at,
          COALESCE(m.mutual_count, 0)       AS mutual_count,
          LEAST(COALESCE(m.mutual_count, 0) * 5, 50)
            + CASE WHEN up.location = (SELECT location FROM requester) AND up.location IS NOT NULL AND up.location <> '' THEN 10 ELSE 0 END
            + CASE WHEN u.updated_at >= NOW() - INTERVAL '30 days' THEN 5 ELSE 0 END
          AS suggestion_score
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN mutual m ON m.candidate_id = u.id
        WHERE u.id <> $1
          AND u.id NOT IN (
            SELECT followed_id FROM follows WHERE follower_id = $1
          )
          AND u.id NOT IN (
            SELECT target_id FROM dismissed_suggestions WHERE requester_id = $1
          )
      )
      SELECT
        user_id,
        display_name,
        avatar_url,
        business_name,
        location,
        follower_count,
        mutual_count,
        is_seed
      FROM candidates
      ORDER BY
        suggestion_score DESC,
        follower_count DESC,
        is_seed ASC,
        user_id
      LIMIT 20
    `;

    const { rows: scored } = await pool.query(scoredSql, [requesterId]);

    let results = scored;

    // ── Step 2: fallback supplement if < 20 results (Requirement 4.5) ────────
    if (results.length < 20) {
      const needed = 20 - results.length;
      const existingIds = results.map(r => r.user_id);

      // Build exclusion list: already in results + requester + followed + dismissed
      // We re-use the DB exclusions for the new query and also exclude IDs already returned.
      let fallbackSql;
      let fallbackParams;

      if (existingIds.length > 0) {
        // Parameterize the already-returned IDs for the NOT IN clause
        const placeholders = existingIds.map((_, i) => `$${i + 3}`).join(', ');
        fallbackSql = `
          SELECT
            u.id           AS user_id,
            COALESCE(up.display_name, u.full_name, u.email) AS display_name,
            up.avatar_url,
            up.business_name,
            up.location,
            COALESCE(up.follower_count, 0) AS follower_count,
            u.is_seed,
            0              AS mutual_count
          FROM users u
          LEFT JOIN user_profiles up ON up.user_id = u.id
          WHERE u.is_seed = FALSE
            AND u.id <> $1
            AND u.id NOT IN (
              SELECT followed_id FROM follows WHERE follower_id = $1
            )
            AND u.id NOT IN (
              SELECT target_id FROM dismissed_suggestions WHERE requester_id = $1
            )
            AND u.id NOT IN (${placeholders})
          ORDER BY u.created_at DESC
          LIMIT $2
        `;
        fallbackParams = [requesterId, needed, ...existingIds];
      } else {
        fallbackSql = `
          SELECT
            u.id           AS user_id,
            COALESCE(up.display_name, u.full_name, u.email) AS display_name,
            up.avatar_url,
            up.business_name,
            up.location,
            COALESCE(up.follower_count, 0) AS follower_count,
            u.is_seed,
            0              AS mutual_count
          FROM users u
          LEFT JOIN user_profiles up ON up.user_id = u.id
          WHERE u.is_seed = FALSE
            AND u.id <> $1
            AND u.id NOT IN (
              SELECT followed_id FROM follows WHERE follower_id = $1
            )
            AND u.id NOT IN (
              SELECT target_id FROM dismissed_suggestions WHERE requester_id = $1
            )
          ORDER BY u.created_at DESC
          LIMIT $2
        `;
        fallbackParams = [requesterId, needed];
      }

      const { rows: fallback } = await pool.query(fallbackSql, fallbackParams);
      results = [...results, ...fallback];
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// ── POST /api/suggestions/dismiss/:targetUserId ───────────────────────────────
router.post('/dismiss/:targetUserId', requireAuth, async (req, res) => {
  const requesterId = req.user.id;
  const { targetUserId } = req.params;

  // Cannot dismiss yourself (Requirement 6.4)
  if (targetUserId === requesterId) {
    return res.status(400).json({ error: 'Cannot dismiss yourself' });
  }

  try {
    // Idempotency check — if row already exists return 200 immediately (Requirement 6.3)
    const { rows: existing } = await pool.query(
      'SELECT id FROM dismissed_suggestions WHERE requester_id = $1 AND target_id = $2',
      [requesterId, targetUserId]
    );

    if (existing.length > 0) {
      return res.status(200).json({ dismissed: true });
    }

    // Insert the dismissal record (Requirement 6.1)
    await pool.query(
      'INSERT INTO dismissed_suggestions (requester_id, target_id) VALUES ($1, $2)',
      [requesterId, targetUserId]
    );

    return res.status(200).json({ dismissed: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss suggestion' });
  }
});

module.exports = router;
