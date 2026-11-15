/**
 * Register form tests
 * Feature: professional-grade-upgrade
 * Requirements: 4.4, 4.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/api/client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { message: 'Registration successful.' } }),
    get: vi.fn(),
  },
  storeToken: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // English defaults, as the screens show them (keys fall back to the key).
    t: (key: string, opts?: any) => typeof opts === 'string' ? opts : (opts?.defaultValue ?? key),
    i18n: { language: 'en' },
  }),
}));

vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));
vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/googleAuth', () => ({
  renderGoogleSignInButton: vi.fn(() => true),
}));

import Register from '@/views/Register';
import client from '@/lib/api/client';
import { renderGoogleSignInButton } from '@/lib/googleAuth';
import { setSearchParams, clearSearchParams } from './setup';

describe('Register form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSearchParams({ mode: 'real' });
  });

  it('has one password field with show/hide and its rule always visible (no confirm field)', () => {
    render(<Register />);
    expect(screen.getByRole('textbox', { name: /email/i })).toBeTruthy();
    expect(document.querySelectorAll('input[type="password"]').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
    expect(screen.getByText(/8 or more characters/i)).toBeTruthy();
  });

  it('never disables Create account: it says what is missing, next to the field, out loud', async () => {
    render(<Register />);
    const submit = screen.getByRole('button', { name: 'Create account' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'test@example.com' } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'password123' } });
    fireEvent.click(submit);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Tick the box to agree/i);
    expect(screen.getByRole('checkbox').getAttribute('aria-invalid')).toBe('true');
    expect(vi.mocked(client.post)).not.toHaveBeenCalled();
  });

  it('catches a typo email and offers the fix', async () => {
    render(<Register />);
    const email = screen.getByRole('textbox', { name: /email/i });
    fireEvent.change(email, { target: { value: 'selam@gmial' } });
    fireEvent.blur(email);
    expect((await screen.findByRole('alert')).textContent).toMatch(/name@example\.com/);
    fireEvent.click(screen.getByRole('button', { name: 'selam@gmail.com' }));
    expect((email as HTMLInputElement).value).toBe('selam@gmail.com');
  });

  it('a short password is explained under the field', async () => {
    render(<Register />);
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'test@example.com' } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 8 characters/i);
    expect(document.querySelector('#password')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('a used email offers Sign in and Reset password', async () => {
    vi.mocked(client.post).mockRejectedValueOnce({ status: 409, error: 'An account with this email already exists' });
    render(<Register />);
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'used@example.com' } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/already has an account/i);
    const signIn = screen.getAllByRole('link', { name: 'Sign in' }).find((a) => /email=used/.test(a.getAttribute('href') ?? ''));
    expect(signIn).toBeTruthy();
    expect(screen.getByRole('link', { name: /Forgot password/ })).toBeTruthy();
  });

  it('renders Google’s official button for mobile-safe sign-in', async () => {
    render(<Register />);

    await waitFor(() => {
      expect(renderGoogleSignInButton).toHaveBeenCalled();
    });
  });

  it('submits registration and shows OTP step on success', async () => {
    const { unmount } = render(<Register />);
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'New@Example.com ' } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => {
      expect(vi.mocked(client.post)).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({ email: 'new@example.com' }),
        { headers: { 'X-Account-Mode': 'real' } },
      );
    });
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeTruthy();
    unmount();
  });

  it('clears the code boxes after a wrong code', async () => {
    setSearchParams({ mode: 'real', verify: 'pending@example.com' });
    vi.mocked(client.post).mockRejectedValueOnce({ error: 'Invalid verification code' });
    render(<Register />);
    const code = screen.getByRole('textbox', { name: 'Verification code' }) as HTMLInputElement;
    fireEvent.change(code, { target: { value: '000000' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/Invalid verification code/);
    await waitFor(() => expect(code.value).toBe(''));
  });

  it('opens code entry for an unverified account redirected from login', () => {
    setSearchParams({ mode: 'real', verify: 'pending@example.com' });
    render(<Register />);
    expect(screen.getByRole('heading', { name: /check your email/i })).toBeTruthy();
    expect(screen.getByText(/pending@example\.com/i)).toBeTruthy();
    // The code field has an accessible name (audit F-035, WCAG 4.1.2).
    const code = screen.getByRole('textbox', { name: 'Verification code' });
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');
  });
});
