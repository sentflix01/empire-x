/**
 * middleware/realMode.ts — Real-users-only filter
 *
 * When X-Real-Only: 1 header is present, sets req.realOnly = true.
 * Routes use helper functions below to inject seed-user exclusion clauses
 * into their SQL queries.
 */
import type { Request, Response, NextFunction } from 'express';

export function realModeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.realOnly = req.headers['x-real-only'] === '1';
  next();
}

/**
 * Returns `AND <userIdColumn>.is_seed = FALSE` when realOnly is active.
 * Suitable for queries with an aliased users table column (e.g. `u.id`).
 */
export function realOnlyFilter(req: Request, userIdColumn = 'u.id'): string {
  return req.realOnly ? `AND ${userIdColumn}.is_seed = FALSE` : '';
}

/**
 * Returns `AND u.is_seed = FALSE` for queries that join the users table as `u`.
 */
export function realOnlyUserFilter(req: Request): string {
  return req.realOnly ? 'AND u.is_seed = FALSE' : '';
}

module.exports = { realModeMiddleware, realOnlyFilter, realOnlyUserFilter };
