/**
 * Read a failed API call's error body, whichever shape the failure took.
 *
 * The `@/api/client` interceptor (and therefore `entities`) rejects with the
 * response BODY itself, with the HTTP `status` attached — not an axios error.
 * Reading `err.response?.data` on those rejections is always `undefined`, so
 * server messages and code-based recovery branches silently never run.
 * Raw axios errors (no interceptor) still carry the body on `response.data`.
 */
export interface ApiErrorBody {
  /** Human message, or a machine code on some routes (e.g. `business_profile_required`). */
  error?: unknown;
  message?: unknown;
  code?: unknown;
  status?: number;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function apiErrorBody(err: unknown): ApiErrorBody | undefined {
  if (typeof err === 'string') return { error: err };
  if (!isRecord(err)) return undefined;

  const response = err.response;
  if (isRecord(response) && response.data !== undefined) {
    const data = response.data;
    const status = typeof response.status === 'number' ? response.status : undefined;
    const body: ApiErrorBody = isRecord(data) ? { ...data } : { error: data };
    if (status !== undefined && body.status === undefined) body.status = status;
    return body;
  }

  // A network or JS failure (no HTTP response) is an Error; its `message` is
  // not a server message, so do not surface it as one.
  if (err instanceof Error) return undefined;
  return err as ApiErrorBody;
}

// snake_case machine codes such as `business_profile_required`.
const MACHINE_CODE = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;

/** The server's human-readable message for a failed call, or `fallback`. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const body = apiErrorBody(err);
  const error = typeof body?.error === 'string' ? body.error.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (error && !MACHINE_CODE.test(error)) return error;
  return message || fallback;
}
