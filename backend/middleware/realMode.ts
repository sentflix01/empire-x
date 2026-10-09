/**
 * middleware/realMode.ts — Real-users-only filter
 *
 * The signed Demo session selects the Demo schema. Requests in the Real
 * schema also exclude any legacy seed/Demo rows left during migration.
 */
import type { Request, Response, NextFunction } from 'express';
import { getCurrentDatabaseEnvironment } from '../db/pool';

export function realModeMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Real and Demo use separate schemas (or databases), so the server-selected
  // database context is the authoritative environment boundary.
  req.realOnly = getCurrentDatabaseEnvironment() === 'real';
  // Intermediary caches must not reuse Demo/all-user responses in Real mode.
  res.vary('X-Real-Only');
  next();
}

/**
 * Returns `AND <userIdColumn>.is_seed = FALSE` when realOnly is active.
 * Suitable for queries with an aliased users table column (e.g. `u.id`).
 */
export function realOnlyFilter(req: Request, userIdColumn = 'u.id'): string {
  return req.realOnly ? `AND ${userIdColumn}.is_seed = FALSE AND ${userIdColumn}.is_demo = FALSE` : '';
}

/**
 * Returns `AND u.is_seed = FALSE` for queries that join the users table as `u`.
 */
export function realOnlyUserFilter(req: Request): string {
  return req.realOnly ? 'AND u.is_seed = FALSE AND u.is_demo = FALSE' : '';
}

module.exports = { realModeMiddleware, realOnlyFilter, realOnlyUserFilter };
