/**
 * lib/response.ts — Standardized success response helpers
 *
 * Phase 4 Task 15:
 *   Provides typed wrappers for consistent success responses.
 *   Using these is optional — existing routes that call res.json(rows)
 *   directly continue to work. New routes should use these for the
 *   standard { data, meta } envelope that the frontend can rely on.
 *
 * Examples:
 *   res.json(rows)                          ← legacy, still works
 *   success(res, rows)                      ← { data: rows }
 *   success(res, rows, { next_cursor })     ← { data: rows, meta: { next_cursor } }
 *   created(res, product)                   ← 201 { data: product }
 *
 * The request_id is automatically included in all error responses via
 * apiError.ts. Success responses don't include it by default (not needed
 * for debugging non-error flows) but callers can add it via the meta param.
 */
import type { Response } from 'express';
import type { ApiSuccess } from './types';

/**
 * Send a 200 success response with optional pagination metadata.
 *
 * @param res      Express Response
 * @param data     The payload — array or object
 * @param meta     Optional: { next_cursor, total, has_more }
 * @param status   HTTP status code (default 200)
 */
export function success<T>(
  res: Response,
  data: T,
  meta?: ApiSuccess<T>['meta'],
  status = 200
): Response {
  const body: ApiSuccess<T> = { data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Send a 201 Created response.
 */
export function created<T>(res: Response, data: T): Response {
  return success(res, data, undefined, 201);
}

/**
 * Send a paginated list response.
 * Convenience wrapper for the most common cursor-pagination pattern.
 *
 * @param res         Express Response
 * @param rows        Array of records
 * @param next_cursor Cursor for the next page, or null if this is the last page
 * @param total       Optional total count
 */
export function paginated<T>(
  res: Response,
  rows: T[],
  next_cursor: string | number | null,
  total?: number
): Response {
  const meta: ApiSuccess<T[]>['meta'] = {
    next_cursor,
    has_more: next_cursor !== null,
  };
  if (total !== undefined) meta.total = total;
  return success(res, rows, meta);
}

// CommonJS export for backward compatibility
module.exports = { success, created, paginated };
