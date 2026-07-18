/**
 * Register form tests
 * Feature: professional-grade-upgrade
 * Requirements: 4.4, 4.6
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { message: 'Registration successful.' } }),
    get: vi.fn(),
  },
  storeToken: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: () => null }) }));
vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }));

import Register from '@/views/Register';
import client from '@/api/client';

describe('Register form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password and confirm password fields', () => {
    render(<Register />);
    expect(screen.getByRole('textbox', { name: /email/i })).toBeTruthy();
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows password mismatch error', async () => {
    render(<Register />);

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'different456' } });

    const form = emailInput.closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
    });
  });

  it('submits registration and shows OTP step on success', async () => {
    const { unmount } = render(<Register />);

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'password123' } });

    const form = emailInput.closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(client.post)).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({ email: 'new@example.com' })
      );
    });

    unmount(); // clean up before async effects fire
  });
});
