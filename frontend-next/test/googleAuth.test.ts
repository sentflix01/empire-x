/**
 * googleAuth.ts unit tests — OAuth2 popup flow (no GIS script)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();
const mockStoreToken = vi.fn();
vi.mock('@/api/client', () => ({
  default: { post: (...args: unknown[]) => mockPost(...args) },
  storeToken: (...args: unknown[]) => mockStoreToken(...args),
}));

describe('initGoogleSignIn', () => {
  it('is a no-op', async () => {
    const { initGoogleSignIn } = await import('@/lib/googleAuth');
    expect(() => initGoogleSignIn()).not.toThrow();
  });
});

describe('isGoogleReady', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('true when CLIENT_ID set', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-id');
    const { isGoogleReady } = await import('@/lib/googleAuth');
    expect(isGoogleReady()).toBe(true);
  });

  it('false when CLIENT_ID empty', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
    const { isGoogleReady } = await import('@/lib/googleAuth');
    expect(isGoogleReady()).toBe(false);
  });
});

describe('renderGoogleSignInButton', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-id');
    mockPost.mockReset();
    mockStoreToken.mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('returns false when no CLIENT_ID', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    expect(renderGoogleSignInButton(document.createElement('div'), { onSuccess: vi.fn(), onError: vi.fn() })).toBe(false);
  });

  it('renders button synchronously', async () => {
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    expect(renderGoogleSignInButton(el, { onSuccess: vi.fn(), onError: vi.fn() })).toBe(true);
    expect(el.querySelector('button')).not.toBeNull();
  });

  it('default label is "Sign in with Google"', async () => {
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    renderGoogleSignInButton(el, { onSuccess: vi.fn(), onError: vi.fn() });
    expect(el.querySelector('button')?.textContent).toContain('Sign in with Google');
  });

  it('signup_with label is "Sign up with Google"', async () => {
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    renderGoogleSignInButton(el, { buttonText: 'signup_with', onSuccess: vi.fn(), onError: vi.fn() });
    expect(el.querySelector('button')?.textContent).toContain('Sign up with Google');
  });

  it('click opens popup to Google auth URL', async () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window);
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    renderGoogleSignInButton(el, { onSuccess: vi.fn(), onError: vi.fn() });
    el.querySelector('button')!.click();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('accounts.google.com/o/oauth2/v2/auth');
    spy.mockRestore();
  });

  it('popup blocked → onError', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    const onError = vi.fn();
    renderGoogleSignInButton(el, { onSuccess: vi.fn(), onError });
    el.querySelector('button')!.click();
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0].message).toContain('blocked');
  });

  it('popup closed silently → no onError (user cancelled)', async () => {
    vi.useFakeTimers();
    const popup = { closed: false } as { closed: boolean };
    vi.spyOn(window, 'open').mockReturnValue(popup as Window);
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    const onError = vi.fn();
    const onSuccess = vi.fn();
    renderGoogleSignInButton(el, { onSuccess, onError });
    el.querySelector('button')!.click();
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(600);
    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('postMessage id_token → onSuccess + storeToken', async () => {
    // Intercept window.addEventListener to capture the message handler directly
    const origAdd = window.addEventListener.bind(window);
    let capturedHandler: ((e: MessageEvent) => void) | null = null;
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler, ...rest) => {
      if (type === 'message') {
        capturedHandler = handler as (e: MessageEvent) => void;
      }
      return origAdd(type, handler as EventListenerOrEventListenerObject, ...rest);
    });

    vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window);
    mockPost.mockResolvedValueOnce({ data: { access_token: 'at-xyz' } });

    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    const onSuccess = vi.fn();
    renderGoogleSignInButton(el, { onSuccess, onError: vi.fn() });

    el.querySelector('button')!.click();
    // By this point capturedHandler should be set (synchronous in Promise constructor)
    expect(capturedHandler).not.toBeNull();

    // Fire the message event directly on the captured handler
    capturedHandler!({
      origin: window.location.origin,
      data: { type: 'GOOGLE_OAUTH_CALLBACK', id_token: 'fake-id-token' },
    } as MessageEvent);

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 3000 });
    expect(mockPost).toHaveBeenCalledWith('/api/auth/google', { id_token: 'fake-id-token' });
    expect(mockStoreToken).toHaveBeenCalledWith('at-xyz');
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'at-xyz' }));

    addSpy.mockRestore();
  });

  it('postMessage error → onError', async () => {
    const origAdd = window.addEventListener.bind(window);
    let capturedHandler: ((e: MessageEvent) => void) | null = null;
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler, ...rest) => {
      if (type === 'message') capturedHandler = handler as (e: MessageEvent) => void;
      return origAdd(type, handler as EventListenerOrEventListenerObject, ...rest);
    });

    vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window);
    const { renderGoogleSignInButton } = await import('@/lib/googleAuth');
    const el = document.createElement('div');
    const onError = vi.fn();
    renderGoogleSignInButton(el, { onSuccess: vi.fn(), onError });

    el.querySelector('button')!.click();
    expect(capturedHandler).not.toBeNull();

    capturedHandler!({
      origin: window.location.origin,
      data: { type: 'GOOGLE_OAUTH_CALLBACK', error: 'access_denied' },
    } as MessageEvent);

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0].message).toContain('access_denied');

    addSpy.mockRestore();
  });
});

describe('incognito compatibility', () => {
  it('storeToken does not throw when localStorage throws SecurityError', async () => {
    const orig = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: { removeItem: () => { throw new DOMException('SecurityError'); }, getItem: () => null, setItem: () => {}, clear: () => {}, length: 0, key: () => null },
      writable: true, configurable: true,
    });
    const { storeToken: st } = await import('@/api/client');
    expect(() => st('tok')).not.toThrow();
    Object.defineProperty(window, 'localStorage', { value: orig, writable: true, configurable: true });
    vi.resetModules();
  });
});
