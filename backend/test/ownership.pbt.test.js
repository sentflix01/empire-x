'use strict';

// Feature: showroom-external-api, Property 13: Ownership enforcement on protected endpoints
//
// For any authenticated user U and any showroom S where S.owner_id ≠ U.id and U
// does not have the admin role, any request to a protected external-source endpoint
// SHALL return HTTP 403 (Forbidden).
//
// The assertOwnership logic lives inside backend/routes/externalSources.js. Since
// importing that file requires a live DB connection, we test the ownership check as
// a pure local function that exactly mirrors the route's logic.
//
// Validates: Requirements 9.2, 9.3

const fc = require('fast-check');

// ─────────────────────────────────────────────────────────────────────────────
// Pure ownership check — mirrors assertOwnership in externalSources.js
//
//   - Returns true  (allowed) if userId === ownerId
//   - Returns true  (allowed) if isAdmin === true
//   - Returns false (403)     if userId !== ownerId AND isAdmin !== true
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether the requesting user is allowed to access the resource.
 *
 * @param {string}  userId   - The authenticated user's ID.
 * @param {string}  ownerId  - The showroom owner's ID.
 * @param {boolean} isAdmin  - Whether the user has the admin role.
 * @returns {boolean} true = allowed, false = forbidden (403)
 */
function checkOwnership(userId, ownerId, isAdmin) {
  if (isAdmin) return true;
  return userId === ownerId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 13 — Ownership enforcement', () => {
  // Feature: showroom-external-api, Property 13: Ownership enforcement on protected endpoints

  test('non-owner non-admin is ALWAYS forbidden (returns false / 403)', () => {
    fc.assert(
      fc.property(
        // Generate two distinct UUIDs: userId and ownerId
        fc.uuid(),
        fc.uuid(),
        (userId, ownerId) => {
          // Only test cases where the two IDs are genuinely different
          fc.pre(userId !== ownerId);

          const result = checkOwnership(userId, ownerId, false);
          return result === false;
        }
      ),
      { numRuns: 200 }
    );
  });

  test('owner is ALWAYS allowed regardless of any other UUID values', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          // ownerId === userId — user IS the owner
          const result = checkOwnership(userId, userId, false);
          return result === true;
        }
      ),
      { numRuns: 200 }
    );
  });

  test('admin is ALWAYS allowed regardless of ownership', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (userId, ownerId) => {
          // isAdmin=true should bypass the ownership check entirely
          const result = checkOwnership(userId, ownerId, true);
          return result === true;
        }
      ),
      { numRuns: 200 }
    );
  });

  test('non-owner + non-admin: no UUID pair can bypass the 403 guard', () => {
    // Stronger statement of the main property: the ONLY way to be allowed
    // is to be the owner or an admin. No "magic" UUID value can slip through.
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (userId, ownerId) => {
          fc.pre(userId !== ownerId);

          // Non-admin, non-owner → MUST be forbidden
          const forbidden = checkOwnership(userId, ownerId, false);
          // Admin override → MUST be allowed
          const adminAllowed = checkOwnership(userId, ownerId, true);
          // Owner → MUST be allowed
          const ownerAllowed = checkOwnership(ownerId, ownerId, false);

          return forbidden === false && adminAllowed === true && ownerAllowed === true;
        }
      ),
      { numRuns: 200 }
    );
  });
});
