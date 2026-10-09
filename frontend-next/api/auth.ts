/**
 * auth.ts — all authentication helpers (Next.js version).
 * Uses storeToken/clearToken to keep cookie in sync for middleware.
 */
import client, { storeToken, clearToken } from './client';

// Login and account recovery always start from the canonical Real identity.
// The server treats this only as a request to clear any stale Demo selector;
// it does not grant access to Demo or choose a database from client input.
const realIdentityRequest = { headers: { 'X-Account-Mode': 'real' } };

interface RegisterParams {
  email: string;
  password: string;
  full_name?: string;
}

interface VerifyOtpParams {
  email: string;
  otpCode: string;
}

export const auth = {
  async me(): Promise<Record<string, unknown>> {
    const res = await client.get('/api/auth/me');
    return res.data as Record<string, unknown>;
  },

  async loginViaEmailPassword(email: string, password: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/login', { email, password }, realIdentityRequest);
    const { access_token } = res.data as { access_token: string };
    storeToken(access_token); // stores in memory, localStorage, and cookie
    return res.data as Record<string, unknown>;
  },

  loginWithProvider(provider: string, redirectPath?: string): void {
    if (provider === 'google') {
      const g = (window as Window & { __googleSignIn?: () => Promise<void> }).__googleSignIn;
      if (g) {
        g().then(() => { window.location.href = redirectPath ?? '/'; })
          .catch(err => console.error('Google sign-in failed:', err));
      } else {
        console.warn('Google Sign-In not initialised. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local');
      }
    }
  },

  async register({ email, password, full_name }: RegisterParams): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/register', { email, password, full_name }, realIdentityRequest);
    return res.data as Record<string, unknown>;
  },

  async verifyOtp({ email, otpCode }: VerifyOtpParams): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/verify-otp', { email, otpCode }, realIdentityRequest);
    const data = res.data as { access_token?: string };
    if (data.access_token) storeToken(data.access_token);
    return data;
  },

  async resendOtp(email: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/resend-otp', { email }, realIdentityRequest);
    return res.data as Record<string, unknown>;
  },

  async resetPasswordRequest(email: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/forgot-password', { email }, { headers: { 'X-Account-Mode': 'real' } });
    return res.data as Record<string, unknown>;
  },

  async resetPassword(token: string, password: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/reset-password', { token, password }, { headers: { 'X-Account-Mode': 'real' } });
    return res.data as Record<string, unknown>;
  },

  async logout(redirectTo?: string): Promise<void> {
    // Always call the backend to revoke the refresh token cookie server-side,
    // using the current account environment even if the caller immediately
    // changes the selected mode. Wait briefly so navigation cannot cancel it.
    clearToken();
    try {
      await client.post('/api/auth/logout', {}, { timeout: 5000 });
    } catch { /* local logout must still finish if the server is unavailable */ }
    if (typeof window !== 'undefined') {
      // Default redirect to landing page (not login) after logout
      window.location.href = typeof redirectTo === 'string' ? redirectTo : '/';
    }
  },

  redirectToLogin(returnUrl?: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = `/login${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ''}`;
    }
  },
};
