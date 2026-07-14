import { vi } from 'vitest';

/**
 * Manual mock for @/api/auth
 * Usage in tests: vi.mock('@/api/auth')
 * Then override per-test: (auth.me as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'u1' })
 */
export const auth = {
  me: vi.fn().mockResolvedValue({ id: 'u1' }),
  loginViaEmailPassword: vi.fn().mockResolvedValue({}),
  loginWithProvider: vi.fn(),
  register: vi.fn().mockResolvedValue({}),
  verifyOtp: vi.fn().mockResolvedValue({}),
  resendOtp: vi.fn().mockResolvedValue({}),
  setToken: vi.fn(),
  resetPasswordRequest: vi.fn().mockResolvedValue({}),
  resetPassword: vi.fn().mockResolvedValue({}),
  logout: vi.fn(),
  redirectToLogin: vi.fn(),
};
