/**
 * lib/uuidParams.ts — route params that must be UUIDs (audit F-034).
 *
 * A malformed ID used to reach Postgres, which rejects the cast, and the
 * route answered 500. With these checks a non-UUID value skips the route
 * (next('route')), so a later matching route handles it or the app answers
 * 404 — the documented contract for IDs that aren't UUIDs.
 */
import type { NextFunction, Request, Response, Router } from 'express';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Registers a UUID check for each named param on this router only. */
export function uuidParams(router: Router, names: string[]): void {
  for (const name of names) {
    router.param(name, (_req: Request, _res: Response, next: NextFunction, value: unknown) => {
      if (isUuid(value)) next();
      else next('route');
    });
  }
}
