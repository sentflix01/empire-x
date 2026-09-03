/**
 * Axios HTTP client for Next.js.
 *
 * TD-001 / TD-014 (completed): access token is stored IN MEMORY ONLY.
 * A short-lived token (15 min) lives in a module-level variable. On expiry,
 * the 401 interceptor silently calls POST /api/auth/refresh, which uses the
 * HttpOnly refresh_token cookie — JavaScript can never read that cookie.
 *
 * For middleware route gating we set a NON-SENSITIVE hint cookie (`nb_auth=1`)
 * whose only meaning is "this browser may have a session" — stealing it
 * grants nothing. The real session always re-hydrates through /refresh.
 *
 * Nothing about the JWT is ever written to localStorage or a JS-readable cookie.
 */
import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

// ── In-memory access token store ─────────────────────────────────────────────
let _accessToken: string | null = null;

const AUTH_HINT_COOKIE = 'nb_auth';
const HINT_MAX_AGE = 7 * 24 * 60 * 60; // 7 days — matches refresh-token lifetime

function setHintCookie() {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${AUTH_HINT_COOKIE}=1; path=/; max-age=${HINT_MAX_AGE}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

function clearHintCookie() {
  document.cookie = `${AUTH_HINT_COOKIE}=; path=/; max-age=0`;
}

/** True when this browser may hold a refreshable session (hint cookie present). */
export function hasAuthHint(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(c => c.trim().startsWith(`${AUTH_HINT_COOKIE}=`));
}

export function storeToken(token: string) {
  _accessToken = token;
  // Hint cookie only — never the token itself (TD-014).
  if (typeof document !== 'undefined') setHintCookie();
}

export function clearToken() {
  _accessToken = null;
  if (typeof window !== 'undefined') {
    clearHintCookie();
    // Legacy cleanup: remove tokens persisted by pre-TD-014 builds.
    localStorage.removeItem('access_token');
  }
}

export function getAccessToken() {
  return _accessToken;
}

/**
 * Silently obtain a fresh access token via the HttpOnly refresh cookie.
 * Deduplicated across callers. Returns true when a token is now in memory.
 *
 * BUG-7 fix: we attempt the refresh call even when the nb_auth hint cookie
 * is absent. Some browsers (Safari ITP, Firefox strict mode) clear JS-readable
 * cookies while preserving HttpOnly cookies, which would otherwise cause a
 * false-negative — the user appears logged out but has a valid session.
 * The hint cookie remains the primary signal for the Next.js edge middleware;
 * here we fall through to a single cheap network call to be sure.
 */
let _ensureInflight: Promise<boolean> | null = null;

export async function ensureFreshToken(): Promise<boolean> {
  if (_accessToken) return true;
  // Deduplicate concurrent calls (e.g. multiple components mounting at once)
  if (_ensureInflight) return _ensureInflight;
  _ensureInflight = _doRefresh().finally(() => { _ensureInflight = null; });
  return _ensureInflight;
}

async function _doRefresh(): Promise<boolean> {
  // Fast path: if neither the hint cookie NOR any other session signal exists
  // we can skip the network call on truly anonymous page loads.
  // We still attempt if the hint is missing because of ITP/browser quirks.
  try {
    const r = await axios.post(
      `${API_BASE_URL}/api/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token: string | undefined = r.data?.access_token;
    if (!token) return false;
    storeToken(token);
    return true;
  } catch {
    // 401 = no valid refresh cookie — truly logged out. Clear stale hint cookie.
    clearHintCookie();
    return false;
  }
}

// ── Axios instance ────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s — matches design requirement 2.7
  withCredentials: true, // send HttpOnly refresh_token cookie on every request
});

// Attach access token from memory on every request
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── 401 interceptor — silent token refresh ───────────────────────────────────
let _refreshing: Promise<string | null> | null = null;

client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and only once per request
    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      typeof window !== 'undefined'
    ) {
  // Fix #10: Only skip refresh for /refresh and /login endpoints, not all /api/auth/ routes.
      // This allows /api/auth/me to trigger a silent refresh when the access token expires.
      const isAuthEndpoint =
        originalRequest.url?.includes('/api/auth/refresh') ||
        originalRequest.url?.includes('/api/auth/login') ||
        originalRequest.url?.includes('/api/auth/logout');
      if (!isAuthEndpoint) {
        originalRequest._retried = true;

        try {
          // Deduplicate concurrent refresh attempts
          if (!_refreshing) {
            _refreshing = axios
              .post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
              .then(r => {
                const newToken: string = r.data.access_token;
                storeToken(newToken);
                return newToken;
              })
              .catch(() => null)
              .finally(() => { _refreshing = null; });
          }

          const newToken = await _refreshing;

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }
        } catch {
          // refresh failed — fall through to redirect
        }
      }

      // Refresh failed or auth endpoint 401 — clear token and redirect to login
      clearToken();
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register'
      ) {
        window.location.href = '/login';
      }
    }

    // Normalise timeout errors into a consistent shape
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
      return Promise.reject({
        error: 'Request timed out. Please try again.',
        isTimeout: true,
      });
    }

    // Reject with the response body, but keep the HTTP status attached so
    // callers can branch on it (e.g. checkout treating 503 "payments not
    // configured" differently from 4xx validation failures).
    const payload = error.response?.data ?? error;
    if (error.response?.status) {
      return Promise.reject(
        Object.assign(
          payload && typeof payload === 'object' ? payload : { error: payload },
          { status: error.response.status },
        ),
      );
    }
    return Promise.reject(payload);
  }
);

export default client;