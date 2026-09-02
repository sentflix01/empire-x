import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Google Identity Services initialization', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete window.google;
  });

  it('initializes GIS once when rendering the registration button', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
    const initialize = vi.fn();
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };

    const { initGoogleSignIn, renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const container = document.createElement('div');

    initGoogleSignIn();
    initGoogleSignIn();
    renderGoogleSignInButton(container, {
      onSuccess: vi.fn(),
      onError: vi.fn(),
    });

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(renderButton).toHaveBeenCalledTimes(1);
  });
});
