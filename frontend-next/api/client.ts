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

const API_BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001');

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

function clearLegacyTokenArtifacts() {
  // Pre-TD-014 builds persisted the JWT in localStorage / a JS cookie.
  // Remove them so a stale token can never be resurrected.
  // Wrapped in try/catch — localStorage throws in incognito on some browsers.
  try { localStorage.removeItem('access_token'); } catch { /* incognito — ignore */ }
  try { document.cookie = 'access_token=; path=/; max-age=0'; } catch { /* ignore */ }
}

export function storeToken(token: string) {
  _accessToken = token;
  // Hint cookie only — never the token itself (TD-014).
  if (typeof window !== 'undefined') {
    setHintCookie();
    clearLegacyTokenArtifacts();
    try { localStorage.removeItem('nodbusiness_account_mode'); } catch { /* old mode hint is not authoritative */ }
  }
}

export function clearToken() {
  _accessToken = null;
  if (typeof window !== 'undefined') {
    clearHintCookie();
    clearLegacyTokenArtifacts();
    try { localStorage.removeItem('nodbusiness_account_mode'); } catch { /* old mode hint is not authoritative */ }
  }
}

export function getAccessToken() {
  return _accessToken;
}

// ── ensureFreshToken — used by authSlice to hydrate token on page load ────────
// Returns true if a valid token is available (from memory or refresh cookie).
// Returns false if the user has no valid session at all.
let _ensureRefreshing: Promise<boolean> | null = null;

export async function ensureFreshToken(): Promise<boolean> {
  // Already have a token in memory — nothing to do
  if (_accessToken) return true;

  // Deduplicate concurrent calls
  if (_ensureRefreshing) return _ensureRefreshing;

  _ensureRefreshing = axios
    .post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
    .then(r => {
      const newToken: string = r.data.access_token;
      storeToken(newToken);
      return true;
    })
    .catch(() => false)
    .finally(() => { _ensureRefreshing = null; });

  return _ensureRefreshing;
}

/**
 * Fetch helper for components that use native fetch instead of the Axios
 * client. Keep auth and the Real-only content boundary identical across both
 * request paths.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!_accessToken) await ensureFreshToken();

  const headers = new Headers(
    typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
  );
  new Headers(init.headers).forEach((value, name) => headers.set(name, value));

  if (_accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${_accessToken}`);
  }
  if (typeof window !== 'undefined') {
    try {
      if (localStorage.getItem('nodbusiness_real_mode') === 'true') {
        headers.set('X-Real-Only', '1');
      } else {
        headers.delete('X-Real-Only');
      }
    } catch { /* storage may be disabled; preserve the caller's request state */ }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });
}

// ── Axios instance ────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s — Render free tier cold starts can take 30-50s
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
      // Never attempt refresh on auth pages — there is no session there.
      // Attempting it causes noisy 401s in the console and wastes a round-trip.
      const AUTH_PAGE_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/auth/google/callback'];
      const onAuthPage = AUTH_PAGE_PREFIXES.some(p => window.location.pathname.startsWith(p));

      // Only skip refresh for /refresh and /login endpoints, not all /api/auth/ routes.
      // This allows /api/auth/me to trigger a silent refresh when the access token expires.
      const isAuthEndpoint =
        originalRequest.url?.includes('/api/auth/refresh') ||
        originalRequest.url?.includes('/api/auth/login') ||
        originalRequest.url?.includes('/api/auth/logout');

      if (!isAuthEndpoint && !onAuthPage) {
        originalRequest._retried = true;

        try {
          // Deduplicate concurrent refresh attempts
          if (!_refreshing) {
            _refreshing = axios
              .post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true })
              .then(r => {
                const newToken: string = r.data.access_token;
                storeToken(newToken); // updates memory + nb_auth hint cookie
                return newToken;
              })
              .catch(() => {
                // Refresh token is stale/invalid (JWT_SECRET changed or expired).
                // Clear the nb_auth hint cookie so middleware stops treating this
                // browser as authenticated and stops the infinite 401 cascade.
                clearToken();
                // If the refresh 401'd, clear the hint cookie immediately
                if (typeof document !== 'undefined') {
                  document.cookie = 'nb_auth=; path=/; max-age=0';
                }
                return null;
              })
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

      // Refresh failed or auth endpoint 401 — clear local token.
      // Do NOT force-redirect here; AuthContext and page-level guards handle
      // navigation so we don't get a redirect loop when the initial /me check
      // fires on the login page itself or during SSR hydration.
      clearToken();
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
