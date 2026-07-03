/**
 * auth.ts — all authentication helpers.
 */
import client from './client';

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
    localStorage.setItem('access_token', access_token);
    return res.data as Record<string, unknown>;
  },

  loginWithProvider(provider: string, redirectPath?: string): void {
    if (provider === 'google') {
      const g = (window as Window & { __googleSignIn?: () => Promise<void> }).__googleSignIn;
      if (g) {
        g().then(() => { window.location.href = redirectPath ?? '/'; })
          .catch(err => console.error('Google sign-in failed:', err));
      } else {
        console.warn('Google Sign-In not initialised. Set VITE_GOOGLE_CLIENT_ID in .env.local');
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
    if (data.access_token) localStorage.setItem('access_token', data.access_token);
    return data;
  },

  async resendOtp(email: string): Promise<Record<string, unknown>> {
    const res = await client.post('/api/auth/resend-otp', { email });
    return res.data as Record<string, unknown>;
  },

  setToken(token: string): void {
    localStorage.setItem('access_token', token);
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
    localStorage.removeItem('access_token');
    window.location.href = typeof redirectTo === 'string' ? redirectTo : '/login';
  },

  redirectToLogin(returnUrl?: string): void {
    window.location.href = `/login${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ''}`;
  },
};
