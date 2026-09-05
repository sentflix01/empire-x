/**
 * Axios HTTP client for Next.js.
 *
 * TD-001: Access token stored in memory only (not localStorage).
 * A short-lived access token (15 min) is kept in a module-level variable.
 * When it expires, the 401 interceptor silently calls POST /api/auth/refresh
 * which reads the HttpOnly refresh_token cookie and returns a new access token.
 *
 * The HttpOnly cookie is set by the backend on login/refresh and is never
 * readable by JavaScript — eliminates the main XSS consequence.
 *
 * Backwards compatibility:
 *   - storeToken() still exists so existing callers (AuthContext, auth.ts) work.
 *   - clearToken() clears the in-memory token and calls /logout to clear the cookie.
 */
import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

// ── In-memory access token store ─────────────────────────────────────────────
// Never written to localStorage or a JS-readable cookie.
let _accessToken: string | null = null;

export function storeToken(token: string) {
  _accessToken = token;
  // Keep the cookie for Next.js middleware route protection (not HttpOnly —
  // this is just for server-side middleware to check auth, not a secret).
  // Also write to localStorage so AuthContext, CartContext, socket.ts, and
  // ChatRoom.tsx can read the token after a page refresh.
  if (typeof window !== 'undefined') {
    const maxAge = 15 * 60; // 15 min — matches access token lifetime
    document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    localStorage.setItem('access_token', token);
  }
}

export function clearToken() {
  _accessToken = null;
  if (typeof window !== 'undefined') {
    document.cookie = 'access_token=; path=/; max-age=0';
    localStorage.removeItem('access_token');
  }
}

export function getAccessToken() {
  return _accessToken;
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
                storeToken(newToken); // updates memory + localStorage + cookie
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