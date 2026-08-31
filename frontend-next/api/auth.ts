/**
 * auth.ts — all authentication helpers (Next.js version).
 * Uses storeToken/clearToken to keep cookie in sync for middleware.
 */
import client, { storeToken, clearToken } from './client';

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
    const res = await client.post('/api/auth/login', { email, password });
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
    const res = await client.post('/api/auth/register', { email, password, full_name });
    return res.data as Record<string, unknown>;
  },

  async verifyOtp({ email, otpCode }: VerifyOtpParams): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/verify-otp', { email, otpCode });
    const data = res.data as { access_token?: string };
    if (data.access_token) storeToken(data.access_token);
    return data;
  },

  async resendOtp(email: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/resend-otp', { email });
    return res.data as Record<string, unknown>;
  },

  async resetPasswordRequest(email: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/forgot-password', { email });
    return res.data as Record<string, unknown>;
  },

  async resetPassword(token: string, password: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/reset-password', { token, password });
    return res.data as Record<string, unknown>;
  },

  logout(redirectTo?: string): void {
    // Always call the backend to revoke the refresh token cookie server-side,
    // then clear local state regardless of whether the request succeeds.
    client.post('/api/auth/logout').catch(() => {});
    clearToken();
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
