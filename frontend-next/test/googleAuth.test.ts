/**
 * googleAuth.ts unit tests
 *
 * Covers:
 *  1. GIS initialises exactly once regardless of how many times it's called
 *  2. renderGoogleSignInButton: happy path, missing credential error, backend error
 *  3. signInWithGoogle: rejects cleanly when GIS unavailable
 *  4. signInWithGoogle: rejects cleanly on isNotDisplayed (mobile Safari / Firefox strict)
 *  5. signInWithGoogle: rejects cleanly on isSkippedMoment
 *  6. signInWithGoogle: rejects on isDismissedMoment (non-credential reason)
 *  7. signInWithGoogle: resolves when credential_returned dismissal fires the callback
 *  8. sendIdTokenToBackend: posts to /api/auth/google and calls storeToken
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

// ── Shared mock for @/api/client ──────────────────────────────────────────────
const mockPost = vi.fn();
const mockStoreToken = vi.fn();
vi.mock('@/api/client', () => ({
  default: { post: (...args: unknown[]) => mockPost(...args) },
  storeToken: (...args: unknown[]) => mockStoreToken(...args),
}));

// ── GIS window stub factory ───────────────────────────────────────────────────
function makeGIS({
  initialize  = vi.fn(),
  renderButton = vi.fn(),
  prompt      = vi.fn(),
}: {
  initialize?:   ReturnType<typeof vi.fn>;
  renderButton?: ReturnType<typeof vi.fn>;
  prompt?:       ReturnType<typeof vi.fn>;
} = {}) {
  return { accounts: { id: { initialize, renderButton, prompt } } };
}

describe('initGoogleSignIn', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as any).google;
  });

  it('calls initialize exactly once even if called multiple times', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const initialize = vi.fn();
    (window as any).google = makeGIS({ initialize });

    const { initGoogleSignIn } = await import('@/lib/googleAuth');
    initGoogleSignIn();
    initGoogleSignIn();
    initGoogleSignIn();

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id' }),
    );
  });

  it('does nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
    const initialize = vi.fn();
    (window as any).google = makeGIS({ initialize });

    const { initGoogleSignIn } = await import('@/lib/googleAuth');
    initGoogleSignIn();

    expect(initialize).not.toHaveBeenCalled();
  });

  it('does nothing when window.google is not loaded yet', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    delete (window as any).google;

    const { initGoogleSignIn } = await import('@/lib/googleAuth');
    // Should not throw
    expect(() => initGoogleSignIn()).not.toThrow();
  });
});

describe('renderGoogleSignInButton', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as any).google;
    mockPost.mockReset();
    mockStoreToken.mockReset();
  });

  it('renders the button and returns true when GIS is available', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const initialize = vi.fn();
    const renderButton = vi.fn();
    (window as any).google = makeGIS({ initialize, renderButton });

    const { initGoogleSignIn, renderGoogleSignInButton } = await import('@/lib/googleAuth');
    initGoogleSignIn();

    const container = document.createElement('div');
    const result = renderGoogleSignInButton(container, {
      onSuccess: vi.fn(),
      onError: vi.fn(),
    });

    expect(result).toBe(true);
    expect(renderButton).toHaveBeenCalledTimes(1);
    expect(renderButton).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ type: 'standard', size: 'large' }),
    );
  });

  it('returns false when GIS is not yet loaded', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    delete (window as any).google;

    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const result = renderGoogleSignInButton(document.createElement('div'), {
      onSuccess: vi.fn(),
      onError: vi.fn(),
    });

    expect(result).toBe(false);
  });

  it('calls onError when credential is missing in the GIS callback', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const initialize = vi.fn();
    const renderButton = vi.fn();
    (window as any).google = makeGIS({ initialize, renderButton });

    const { initGoogleSignIn, renderGoogleSignInButton } = await import('@/lib/googleAuth');
    initGoogleSignIn();

    // Capture the credential callback set on initialize
    const initCall = initialize.mock.calls[0][0] as { callback: (r: unknown) => void };

    const onError = vi.fn();
    renderGoogleSignInButton(document.createElement('div'), {
      onSuccess: vi.fn(),
      onError,
    });

    // Fire the GIS callback with no credential
    initCall.callback({ credential: undefined });

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('credential') }),
    );
  });

  it('calls onError when the backend /api/auth/google returns an error', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const initialize = vi.fn();
    const renderButton = vi.fn();
    (window as any).google = makeGIS({ initialize, renderButton });
    mockPost.mockRejectedValueOnce({ error: 'Google sign-in could not be verified.' });

    const { initGoogleSignIn, renderGoogleSignInButton } = await import('@/lib/googleAuth');
    initGoogleSignIn();
    const initCall = initialize.mock.calls[0][0] as { callback: (r: unknown) => void };

    const onError = vi.fn();
    renderGoogleSignInButton(document.createElement('div'), {
      onSuccess: vi.fn(),
      onError,
    });

    initCall.callback({ credential: 'fake-id-token' });

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it('calls onSuccess and storeToken when backend returns access_token', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const initialize = vi.fn();
    const renderButton = vi.fn();
    (window as any).google = makeGIS({ initialize, renderButton });
    mockPost.mockResolvedValueOnce({ data: { access_token: 'at-xyz' } });

    const { initGoogleSignIn, renderGoogleSignInButton } = await import('@/lib/googleAuth');
    initGoogleSignIn();
    const initCall = initialize.mock.calls[0][0] as { callback: (r: unknown) => void };

    const onSuccess = vi.fn();
    renderGoogleSignInButton(document.createElement('div'), {
      onSuccess,
      onError: vi.fn(),
    });

    initCall.callback({ credential: 'valid-id-token' });

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith('/api/auth/google', { id_token: 'valid-id-token' });
    expect(mockStoreToken).toHaveBeenCalledWith('at-xyz');
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'at-xyz' }));
  });
});

describe('signInWithGoogle — mobile Safari / blocking browser fallback', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as any).google;
  });

  it('rejects immediately when window.google is not available', async () => {
    delete (window as any).google;
    const { signInWithGoogle } = await import('@/lib/googleAuth');
    await expect(signInWithGoogle()).rejects.toThrow('not available');
  });

  it('rejects with actionable message when isNotDisplayed() (Safari ITP)', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const prompt = vi.fn((cb: (n: unknown) => void) => {
      cb({ isNotDisplayed: () => true, isSkippedMoment: () => false, isDismissedMoment: () => false });
    });
    (window as any).google = makeGIS({ prompt });

    const { signInWithGoogle } = await import('@/lib/googleAuth');
    await expect(signInWithGoogle()).rejects.toThrow(/popup could not be shown/i);
  });

  it('rejects with actionable message when isSkippedMoment()', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const prompt = vi.fn((cb: (n: unknown) => void) => {
      cb({ isNotDisplayed: () => false, isSkippedMoment: () => true, isDismissedMoment: () => false });
    });
    (window as any).google = makeGIS({ prompt });

    const { signInWithGoogle } = await import('@/lib/googleAuth');
    await expect(signInWithGoogle()).rejects.toThrow(/skipped/i);
  });

  it('rejects with "popup was closed" when dismissed for non-credential reason', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const prompt = vi.fn((cb: (n: unknown) => void) => {
      cb({
        isNotDisplayed: () => false,
        isSkippedMoment: () => false,
        isDismissedMoment: () => true,
        getDismissedReason: () => 'user_cancel',
      });
    });
    (window as any).google = makeGIS({ prompt });

    const { signInWithGoogle } = await import('@/lib/googleAuth');
    await expect(signInWithGoogle()).rejects.toThrow(/closed/i);
  });

  it('does NOT reject on credential_returned dismissal (resolved via credential callback)', async () => {
    // When credential_returned fires, the promise resolves through the credential
    // callback — the dismissed event must not also reject it.
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const initialize = vi.fn();
    mockPost.mockResolvedValueOnce({ data: { access_token: 'at-from-prompt' } });

    const prompt = vi.fn((cb: (n: unknown) => void) => {
      // Simulate: dismissed with credential_returned, then GIS fires the credential callback
      cb({
        isNotDisplayed:   () => false,
        isSkippedMoment:  () => false,
        isDismissedMoment: () => true,
        getDismissedReason: () => 'credential_returned',
      });
    });
    (window as any).google = makeGIS({ initialize, prompt });

    const { initGoogleSignIn, signInWithGoogle } = await import('@/lib/googleAuth');
    initGoogleSignIn();

    const initCall = initialize.mock.calls[0][0] as { callback: (r: unknown) => void };

    // Start signInWithGoogle — it sets credentialHandler
    const resultPromise = signInWithGoogle();

    // Then fire the credential callback as GIS would
    initCall.callback({ credential: 'from-prompt-token' });

    const result = await resultPromise;
    expect(result).toMatchObject({ access_token: 'at-from-prompt' });
  });
});
