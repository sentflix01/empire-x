/**
 * Two-factor sign-in on the Login page (audit F-017): a password sign-in that
 * answers mfa_required shows the code step, issues no session until the code
 * is verified, offers recovery codes, and restarts when the challenge expires.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const authApi = vi.hoisted(() => ({ loginViaEmailPassword: vi.fn(), verifyMfa: vi.fn(), loginWithProvider: vi.fn() }));
vi.mock('@/api/auth', () => ({ auth: authApi }));
const completeLogin = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ completeLogin }) }));
vi.mock('@/lib/googleAuth', () => ({ renderGoogleSignInButton: () => false, describeGoogleOAuthError: (m: string) => m }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));

import Login from '@/views/Login';

function signIn() {
  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'a@b.test' } });
  fireEvent.change(document.querySelector('input[type="password"]') as HTMLInputElement, { target: { value: 'violet-harbour-tram-91' } });
  fireEvent.submit(screen.getByRole('textbox', { name: /email/i }).closest('form') as HTMLFormElement);
}

beforeEach(() => {
  for (const fn of Object.values(authApi)) fn.mockReset();
  completeLogin.mockClear();
  authApi.loginViaEmailPassword.mockResolvedValue({ mfa_required: true, mfa_token: 'challenge-1' });
});

describe('Login with two-factor sign-in', () => {
  it('asks for the code and completes sign-in only after it is verified', async () => {
    authApi.verifyMfa.mockResolvedValue({ access_token: 'tok', onboarding_mode: 'real', is_demo: false });
    render(<Login />);
    signIn();
    const code = await screen.findByLabelText('Authentication code');
    expect(completeLogin).not.toHaveBeenCalled();
    expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    fireEvent.change(code, { target: { value: '123 456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(authApi.verifyMfa).toHaveBeenCalledWith('challenge-1', '123456'));
    await waitFor(() => expect(completeLogin).toHaveBeenCalled());
  });

  it('accepts a recovery code', async () => {
    authApi.verifyMfa.mockResolvedValue({ access_token: 'tok', is_demo: false });
    render(<Login />);
    signIn();
    fireEvent.click(await screen.findByRole('button', { name: 'Use a recovery code' }));
    fireEvent.change(screen.getByLabelText('Recovery code'), { target: { value: 'k7p2-x9qd-m4tf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(authApi.verifyMfa).toHaveBeenCalledWith('challenge-1', 'k7p2-x9qd-m4tf'));
  });

  it('shows a wrong-code message and stays on the code step', async () => {
    authApi.verifyMfa.mockRejectedValue({ error: 'That code is not correct.', code: 'MFA_CODE_INVALID', status: 401 });
    render(<Login />);
    signIn();
    fireEvent.change(await screen.findByLabelText('Authentication code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not correct.');
    expect(screen.getByLabelText('Authentication code')).toBeInTheDocument();
    expect(completeLogin).not.toHaveBeenCalled();
  });

  it('returns to the password step when the challenge expired', async () => {
    authApi.verifyMfa.mockRejectedValue({ error: 'expired', code: 'MFA_CHALLENGE_EXPIRED', status: 401 });
    render(<Login />);
    signIn();
    fireEvent.change(await screen.findByLabelText('Authentication code'), { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText(/sign-in step expired/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });
});
