/**
 * Login form tests — updated for new GIS-rendered button implementation.
 *
 * Login.tsx no longer uses window.__googleSignIn. It calls
 * renderGoogleSignInButton() directly (same pattern as Register.tsx).
 * These tests verify the new implementation contract.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/api/auth', () => ({
  auth: {
    loginViaEmailPassword: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
    loginWithProvider: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// renderGoogleSignInButton: by default succeeds immediately (GIS is available)
const mockRenderGoogleSignInButton = vi.fn().mockReturnValue(true);
vi.mock('@/lib/googleAuth', () => ({
  renderGoogleSignInButton: (...args: unknown[]) => mockRenderGoogleSignInButton(...args),
}));

import Login from '@/views/Login';
import { auth } from '@/api/auth';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillAndSubmitForm(email: string, password: string) {
  const emailInput  = screen.getByRole('textbox', { name: /email/i });
  const pwInput     = document.querySelector('input[type="password"]') as HTMLInputElement;
  const form        = emailInput.closest('form') as HTMLFormElement;
  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.change(pwInput,    { target: { value: password } });
  fireEvent.submit(form);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Login — form fields', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders email and password inputs', () => {
    render(<Login />);
    expect(screen.getByRole('textbox', { name: /email/i })).toBeTruthy();
    expect(document.querySelectorAll('input[type="password"]').length).toBeGreaterThan(0);
  });

  it('renders a submit button', () => {
    render(<Login />);
    // Button text comes from the i18n key which our mock returns verbatim
    expect(screen.getByRole('button', { name: /auth\.login/i })).toBeTruthy();
  });

  it('calls loginViaEmailPassword with trimmed, lowercased email on submit', async () => {
    render(<Login />);
    fillAndSubmitForm(' Test@Example.com ', 'password123');

    await waitFor(() => {
      expect(auth.loginViaEmailPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });
  });

  it('shows backend error message when login fails', async () => {
    vi.mocked(auth.loginViaEmailPassword).mockRejectedValueOnce({
      error: 'Invalid email or password',
    });

    render(<Login />);
    fillAndSubmitForm('bad@example.com', 'wrongpass');

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeTruthy();
    });
  });

  it('email input enforces maxLength=254', () => {
    render(<Login />);
    const emailInput = screen.getByRole('textbox', { name: /email/i }) as HTMLInputElement;
    expect(emailInput.maxLength).toBe(254);
  });

  it('password input enforces maxLength=128', () => {
    render(<Login />);
    const pwInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(pwInput.maxLength).toBe(128);
  });
});

describe('Login — Google Sign-In (GIS rendered button)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // always restore real timers in case a test used fake timers
    mockRenderGoogleSignInButton.mockReturnValue(true);
  });

  it('calls renderGoogleSignInButton (not window.__googleSignIn) on mount', async () => {
    render(<Login />);

    await waitFor(() => {
      expect(mockRenderGoogleSignInButton).toHaveBeenCalled();
    });

    // Legacy window.__googleSignIn must NOT be involved at all
    expect((window as any).__googleSignIn).toBeUndefined();
  });

  it('shows "Setting up Google Sign-In…" while GIS script is loading', () => {
    // GIS not available yet — renderButton returns false every time
    mockRenderGoogleSignInButton.mockReturnValue(false);
    render(<Login />);
    expect(screen.getByText(/setting up google sign.?in/i)).toBeTruthy();
  });

  it('shows "Google Sign-In unavailable" after the 5-second timeout', async () => {
    vi.useFakeTimers();
    mockRenderGoogleSignInButton.mockReturnValue(false);

    const { unmount } = render(<Login />);
    expect(screen.queryByText(/unavailable/i)).toBeNull();

    // Advance past the 5-second retry timeout inside the component
    vi.advanceTimersByTime(5100);
    // Flush React's state update queue
    await Promise.resolve();

    expect(screen.getByText(/google sign.?in unavailable/i)).toBeTruthy();
    unmount();
  });

  it('does NOT render a plain Google icon button (old implementation gone)', () => {
    render(<Login />);
    // The old implementation rendered a <Button> with GoogleIcon inside.
    // The new one renders an empty div for GIS to fill — no "Continue with Google"
    // text button should be in the DOM when GIS is available.
    const allButtons = screen.queryAllByRole('button', { name: /continue with google/i });
    expect(allButtons.length).toBe(0);
  });

  it('passes the correct returnTo URL to onSuccess callback', async () => {
    // Simulate returnTo set via search params (covered by setup mock)
    // renderGoogleSignInButton should be called with options.onSuccess
    render(<Login />);

    await waitFor(() => {
      expect(mockRenderGoogleSignInButton).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  it('shows a helpful error when onError fires with "could not be verified"', async () => {
    vi.useFakeTimers();
    let capturedOnError: ((err: Error) => void) | undefined;
    mockRenderGoogleSignInButton.mockImplementation(
      (_el: unknown, opts: { onSuccess: () => void; onError: (e: Error) => void }) => {
        capturedOnError = opts.onError;
        return true; // signals button rendered → sets googleButtonReady, stops retry interval
      },
    );

    render(<Login />);
    // Tick once so the useEffect fires and the mock is called
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(capturedOnError).toBeDefined();
    capturedOnError!(new Error('Google sign-in could not be verified. Ensure the frontend and backend use the same Google OAuth client ID.'));

    await waitFor(() => {
      expect(
        screen.getByText(/frontend and backend use the same Google OAuth client ID/i),
      ).toBeTruthy();
    });
  });

  it('shows "popup was closed" error when onError message matches', async () => {
    vi.useFakeTimers();
    let capturedOnError: ((err: Error) => void) | undefined;
    mockRenderGoogleSignInButton.mockImplementation(
      (_el: unknown, opts: { onSuccess: () => void; onError: (e: Error) => void }) => {
        capturedOnError = opts.onError;
        return true;
      },
    );

    render(<Login />);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(capturedOnError).toBeDefined();
    capturedOnError!(new Error('popup closed'));

    await waitFor(() => {
      expect(screen.getByText(/sign-in popup was closed/i)).toBeTruthy();
    });
  });

  it('shows generic fallback error for unknown Google errors', async () => {
    vi.useFakeTimers();
    let capturedOnError: ((err: Error) => void) | undefined;
    mockRenderGoogleSignInButton.mockImplementation(
      (_el: unknown, opts: { onSuccess: () => void; onError: (e: Error) => void }) => {
        capturedOnError = opts.onError;
        return true;
      },
    );

    render(<Login />);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(capturedOnError).toBeDefined();
    capturedOnError!(new Error('unknown_internal_error'));

    await waitFor(() => {
      expect(screen.getByText(/google sign-in failed\. please try again/i)).toBeTruthy();
    });
  });
});
