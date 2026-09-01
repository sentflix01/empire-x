/**
 * Login form tests
 * Feature: professional-grade-upgrade
 * Requirements: 4.4, 4.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the auth module before importing the component
vi.mock('@/api/auth', () => ({
  auth: {
    loginViaEmailPassword: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
    loginWithProvider: vi.fn(),
  },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));

import Login from '@/views/Login';
import { auth } from '@/api/auth';

describe('Login form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs', () => {
    render(<Login />);
    expect(screen.getByRole('textbox', { name: /email/i })).toBeTruthy();
    // Password input exists
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBeGreaterThan(0);
  });

  it('submit button is present', () => {
    render(<Login />);
    const submitBtn = screen.getByRole('button', { name: /log.?in|login|auth\.login/i });
    expect(submitBtn).toBeTruthy();
  });

  it('calls loginViaEmailPassword with trimmed lowercase email on submit', async () => {
    render(<Login />);

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    const form = emailInput.closest('form') as HTMLFormElement;

    fireEvent.change(emailInput, { target: { value: ' Test@Example.com ' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(auth.loginViaEmailPassword).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message when login fails', async () => {
    vi.mocked(auth.loginViaEmailPassword).mockRejectedValueOnce({ error: 'Invalid email or password' });

    render(<Login />);

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    const form = emailInput.closest('form') as HTMLFormElement;

    fireEvent.change(emailInput, { target: { value: 'bad@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeTruthy();
    });
  });
});
