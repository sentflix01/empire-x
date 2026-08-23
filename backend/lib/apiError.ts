/**
 * lib/apiError.ts — Standardized API error helpers
 *
 * Phase 4 Task 14 + 15:
 *   - Converted from apiError.js → apiError.ts with full types
 *   - Every error response now includes request_id (from req.requestId,
 *     set by middleware/requestId.js). This is critical for production
 *     debugging: when a user reports an error, you search Sentry and
 *     Pino logs by the exact request_id to find the full context.
 *   - Backward compatible: all existing apiError.notFound(res, msg) callers
 *     work unchanged. The request_id is sourced from res.req?.requestId
 *     so it's automatically included without callers needing to pass it.
 *
 * Response shape (all errors):
 *   {
 *     "error":      "human-readable message",
 *     "code":       "MACHINE_READABLE_CODE",
 *     "request_id": "uuid-v4-from-X-Request-ID-header"
 *   }
 *
 * Error codes:
 *   NOT_FOUND          — 404: resource does not exist
 *   VALIDATION_ERROR   — 422: input failed validation
 *   UNAUTHORIZED       — 401: not authenticated
 *   FORBIDDEN          — 403: authenticated but not authorized
 *   METHOD_NOT_ALLOWED — 405: wrong HTTP verb
 *   INTERNAL_ERROR     — 500: unexpected server error
 */
import type { Response } from 'express';

/** Pull request_id off the response's associated request, if available. */
function getRequestId(res: Response): string | undefined {
  return (res.req as any)?.requestId;
}

/** Build the base error body, always including request_id when present. */
function errorBody(
  message: string,
  code: string,
  res: Response,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const body: Record<string, unknown> = { error: message, code };
  const rid = getRequestId(res);
  if (rid) body.request_id = rid;
  if (extra) Object.assign(body, extra);
  return body;
}

// ── 404 Not Found ─────────────────────────────────────────────────────────────
export function notFound(res: Response, msg?: string): Response {
  return res.status(404).json(
    errorBody(msg || 'Resource not found', 'NOT_FOUND', res)
  );
}

// ── 422 Validation Error ──────────────────────────────────────────────────────
export function validationError(
  res: Response,
  summary: string,
  fields?: Array<{ field: string; message: string }>
): Response {
  return res.status(422).json(
    errorBody(summary, 'VALIDATION_ERROR', res, { fields: fields || [] })
  );
}

// ── 401 Unauthorized ──────────────────────────────────────────────────────────
export function unauthorized(res: Response, msg?: string): Response {
  return res.status(401).json(
    errorBody(msg || 'Authentication required', 'UNAUTHORIZED', res)
  );
}

// ── 403 Forbidden ─────────────────────────────────────────────────────────────
export function forbidden(res: Response, msg?: string): Response {
  return res.status(403).json(
    errorBody(msg || 'Forbidden', 'FORBIDDEN', res)
  );
}

// ── 405 Method Not Allowed ────────────────────────────────────────────────────
export function methodNotAllowed(res: Response): Response {
  return res.status(405).json(
    errorBody('Method not allowed', 'METHOD_NOT_ALLOWED', res)
  );
}

// ── 500 Internal Server Error ─────────────────────────────────────────────────
export function serverError(res: Response, msg?: string): Response {
  return res.status(500).json(
    errorBody(msg || 'Internal server error', 'INTERNAL_ERROR', res)
  );
}

// ── CommonJS export for backward compatibility ────────────────────────────────
// All existing require('../lib/apiError') callers work unchanged.
module.exports = {
  notFound,
  validationError,
  unauthorized,
  forbidden,
  methodNotAllowed,
  serverError,
};
