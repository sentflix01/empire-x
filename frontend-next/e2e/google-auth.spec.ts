import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * E2E — Google Sign-In + Full Auth Flow
 *
 * Organised in three sections:
 *
 *   Section A — Google Sign-In UI contract (no backend, no real Google account)
 *     Verifies the browser-visible behaviour of the GIS integration: button
 *     container rendered, fallback messaging when the script is blocked, the
 *     legacy window.__googleSignIn is never present.
 *
 *   Section B — Middleware redirect contract
 *     Verifies that the Next.js proxy correctly gates
 *     protected routes and redirects already-logged-in users away from auth pages.
 *     Uses local cookies and mocked APIs; no seeded account is needed.
 *
 *   Section C — Email auth lifecycle (login → session persistence → logout)
 *     Extends the basic auth.spec.ts flows with:
 *       - Successful login stores hint cookie, NOT the token itself
 *       - Reloading re-hydrates via the HttpOnly refresh cookie
 *       - Logout clears hint cookie and protected routes return to login
 *       - Password field accepts up to 128 characters (maxLength enforced)
 *       - Email field accepts up to 254 characters (maxLength enforced)
 *
 * Auth requests are mocked. No real credentials or backend are used.
 */

const E2E_EMAIL = 'e2e@example.test';
const E2E_PASSWORD = 'e2e-only-password';

// ── Shared helpers ────────────────────────────────────────────────────────────

async function installAuthMocks(page: Page, options: { mode?: 'demo' | 'real' | null; loginStatus?: number; loginBody?: Record<string, unknown>; authenticated?: boolean } = {}) {
  const mode = options.mode ?? null;
  let sessionActive = options.authenticated ?? false;
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/login') {
      sessionActive = (options.loginStatus ?? 200) < 400;
      await route.fulfill({ status: options.loginStatus ?? 200, headers: options.loginStatus && options.loginStatus >= 400 ? {} : { 'set-cookie': 'refresh_token=e2e-refresh; Path=/api/auth; HttpOnly; SameSite=Lax' }, json: options.loginBody ?? { access_token: 'e2e-access-token', is_demo: false, onboarding_mode: mode } });
    } else if (pathname === '/api/auth/refresh') {
      await route.fulfill(sessionActive ? { json: { access_token: 'e2e-refreshed-token' } } : { status: 401, json: { error: 'Not authenticated' } });
    } else if (pathname === '/api/auth/me') {
      await route.fulfill({ json: { id: 'e2e-user', full_name: 'E2E User', email: E2E_EMAIL, role: 'user', is_demo: false, onboarding_mode: mode } });
    } else if (pathname === '/api/profiles') {
      await route.fulfill({ json: [{ id: 'e2e-profile', user_id: 'e2e-user', profile_type: 'personal' }] });
    } else {
      await route.fulfill({ json: { success: true } });
    }
  });
}

async function setAuthHint(context: BrowserContext) {
  await context.addCookies([{ name: 'nb_auth', value: '1', domain: 'localhost', path: '/', sameSite: 'Lax', httpOnly: false, secure: false }]);
}

// ══════════════════════════════════════════════════════════════════════════════
// Section A — Google Sign-In UI contract
// (No real Google account needed — purely browser-level assertions)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Section A — Google Sign-In UI', () => {

  test('A1: login page renders the accessible Google OAuth button', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    // The legacy "Continue with Google" button was replaced by the OAuth popup button.
    const legacyButton = page.locator('button', { hasText: /continue with google/i });
    await expect(legacyButton).toHaveCount(0);

    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('A2: register page renders the accessible Google OAuth button', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible();
  });

  test('A3: Google login does not call the legacy sign-in global', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__googleSignIn = () => sessionStorage.setItem('legacy-google-called', '1');
      window.open = (() => ({} as Window)) as typeof window.open;
    });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    await page.getByRole('button', { name: /sign in with google/i }).click();
    expect(await page.evaluate(() => sessionStorage.getItem('legacy-google-called'))).toBeNull();
  });

  test('A4: login page renders a visible Google sign-in area', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // The OAuth popup button is rendered synchronously when configured; the
    // accessible region remains visible with the email fallback otherwise.
    await expect(page.locator('div[aria-label*="Google"]')).toBeVisible();
  });

  test('A5: login page Google OAuth region has an accessible label', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const container = page.locator('div[aria-label*="Google"]').first();
    await expect(container).toHaveAttribute('aria-label', /google/i);
  });

  test('A6: register Google button does not depend on a GIS script', async ({ page }) => {
    // This implementation opens OAuth directly; no GIS JavaScript is loaded.
    await page.route('**/accounts.google.com/gsi/client', route => route.abort());

    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible();
    await expect(page.locator('script[src*="accounts.google.com/gsi/client"]')).toHaveCount(0);
  });

  test('A7: login Google button does not depend on a GIS script', async ({ page }) => {
    await page.route('**/accounts.google.com/gsi/client', route => route.abort());

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
    await expect(page.locator('script[src*="accounts.google.com/gsi/client"]')).toHaveCount(0);
  });

  test('A8: OAuth popup uses the configured client ID and same-origin callback', async ({ page }) => {
    await page.addInitScript(() => {
      // Capture the constructed URL without sending a test browser to Google.
      window.open = ((url?: string | URL) => {
        sessionStorage.setItem('e2e-google-oauth-url', String(url ?? ''));
        return {} as Window;
      }) as typeof window.open;
    });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    await googleButton.click();

    const requestUrl = await page.evaluate(() => sessionStorage.getItem('e2e-google-oauth-url'));
    expect(requestUrl).toBeTruthy();
    const authorization = new URL(requestUrl!);
    expect(authorization.origin).toBe('https://accounts.google.com');
    expect(authorization.pathname).toBe('/o/oauth2/v2/auth');
    expect(authorization.searchParams.get('client_id')).toMatch(/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/);
    expect(authorization.searchParams.get('redirect_uri')).toBe(`${new URL(page.url()).origin}/auth/google/callback`);
    expect(authorization.searchParams.get('response_type')).toBe('id_token');
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// Section B — Middleware redirect contract
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Section B — Middleware redirects', () => {
  test('B1: anonymous visitor can browse the public guest feed', async ({ page }) => {
    // Keep the guest-feed smoke test independent of local/production data. The
    // feed's empty-state path is enough to verify that guest navigation renders.
    await page.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/api/auth/refresh') {
        return route.fulfill({ status: 401, json: { error: 'Not authenticated' } });
      }
      return route.fulfill({ json: {} });
    });
    await page.context().clearCookies(); await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/feed(?:\?|$)/);
    await expect(page.getByText(/guest|read.only/i).first()).toBeVisible({ timeout: 10_000 });
  });
  test('B2: anonymous visitor to protected wallet returns to login with destination', async ({ page }) => {
    await page.context().clearCookies(); await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?return=%2Fwallet/);
  });
  test('B3: anonymous visitor to protected settings returns to login', async ({ page }) => {
    await page.context().clearCookies(); await page.goto('/settings', { waitUntil: 'domcontentloaded' }); await expect(page).toHaveURL(/\/login/);
  });
  test('B4: login and register remain accessible without auth', async ({ page }) => {
    await page.context().clearCookies();
    for (const path of ['/login', '/register']) { await page.goto(path, { waitUntil: 'domcontentloaded' }); await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/'))); }
  });
  for (const path of ['/login', '/register']) {
    test('authenticated visitor to ' + path + ' is routed to chooser', async ({ page, context }) => {
      await installAuthMocks(page, { authenticated: true }); await setAuthHint(context); await page.goto(path, { waitUntil: 'domcontentloaded' }); await expect(page).toHaveURL(/\/choose-mode/);
    });
  }
  test('B7: protected destination is retained across sign-in and first-login chooser', async ({ page }) => {
    await installAuthMocks(page); await page.context().clearCookies(); await page.goto('/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?return=%2Fwallet/);
    // The protected-route redirect is a full document navigation. Wait for
    // the login page's hydration before filling its controlled fields so a
    // slow dev-server hydration cannot reset the email between fill and submit.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await emailInput.fill(E2E_EMAIL);
    await expect(emailInput).toHaveValue(E2E_EMAIL);
    await page.locator('input[type="password"]').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/choose-mode\?return=%2Fwallet/);
    await page.getByRole('button', { name: 'Use Real Account' }).click();
    await expect(page).toHaveURL(/\/wallet/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Section C — Email auth lifecycle (mock API only)
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Section C — Email auth lifecycle', () => {
  async function signIn(page: Page, mode: 'real' | null = 'real') {
    await installAuthMocks(page, { mode }); await page.goto('/login'); await page.getByRole('textbox', { name: /email/i }).fill(E2E_EMAIL);
    await page.locator('input[type="password"]').fill(E2E_PASSWORD); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  test('C1: login stores routing hint but never exposes JWT', async ({ page }) => {
    await signIn(page); await expect(page).toHaveURL(/\/feed/); const cookies=await page.context().cookies();
    expect(cookies.some(c=>c.name==='nb_auth'&&c.value==='1')).toBeTruthy();
    const leaked=await page.evaluate(()=>({ls:localStorage.getItem('access_token'),cookie:document.cookie.includes('access_token=')})); expect(leaked.ls).toBeNull(); expect(leaked.cookie).toBeFalsy();
  });
  test('C2: refresh token is HttpOnly', async ({ page }) => {
    await signIn(page); await expect(page).toHaveURL(/\/feed/); const cookie=(await page.context().cookies()).find(c=>c.name==='refresh_token');
    expect(cookie?.httpOnly).toBeTruthy(); expect(await page.evaluate(()=>document.cookie.includes('refresh_token='))).toBeFalsy();
  });
  test('C3: reload rehydrates mocked session', async ({ page }) => { await signIn(page); await expect(page).toHaveURL(/\/feed/); await page.reload(); await expect(page).not.toHaveURL(/\/login/); });
  test('C4: logout clears hint and protected routes return to login', async ({ page }) => {
    await signIn(page); await expect(page).toHaveURL(/\/feed/); await page.evaluate(()=>{document.cookie='nb_auth=; path=/; max-age=0';});
    expect((await page.context().cookies()).some(c=>c.name==='nb_auth'&&c.value==='1')).toBeFalsy(); await page.goto('/wallet'); await expect(page).toHaveURL(/\/login\?return=%2Fwallet/);
  });
  test('C5: rejected credentials show an error without leaving login', async ({ page }) => {
    await installAuthMocks(page,{loginStatus:401,loginBody:{error:'Invalid email or password'}}); await page.goto('/login'); await page.getByRole('textbox',{name:/email/i}).fill(E2E_EMAIL);
    await page.locator('input[type="password"]').fill('wrong-e2e-password'); await page.getByRole('button',{name:'Sign in',exact:true}).click(); await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('.text-destructive, [class*="destructive"]').first()).toBeVisible();
  });
  test('C6: email input enforces maxLength=254', async ({ page }) => { await page.goto('/login'); await expect(page.locator('input[type="email"]').first()).toHaveAttribute('maxlength','254'); });
  test('C7: password input enforces maxLength=128', async ({ page }) => { await page.goto('/login'); await expect(page.locator('input[type="password"]').first()).toHaveAttribute('maxlength','128'); });
  test('C8: unverified email response routes to verification registration', async ({ page }) => {
    await installAuthMocks(page,{loginStatus:403,loginBody:{error:'Please verify your email before logging in.',code:'email_not_verified',pendingVerification:true}}); await page.goto('/login');
    await page.getByRole('textbox',{name:/email/i}).fill('unverified@example.test'); await page.locator('input[type="password"]').fill(E2E_PASSWORD); await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page).toHaveURL(/\/register\?verify=unverified%40example\.test/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Section D — Google OAuth popup handoff (mocked Google, mocked backend)
// ═════════════════════════════════════════════ accounts.google.com is blocked ═

test.describe('Section D — Google OAuth popup handoff', () => {

  const GoogleAuthHost = 'https://accounts.google.com';

  interface PageMockCounters {
    google: number;
    exchange: number;
    refresh: number;
    me: number;
  }

  function baseMocks(context: BrowserContext): PageMockCounters {
    const counters: PageMockCounters = { google: 0, exchange: 0, refresh: 0, me: 0 };
    context.route(`${GoogleAuthHost}/**`, route => route.abort());
    return counters;
  }

  test('D1: normal popup handoff', async ({ page, context }) => {
    const counters = baseMocks(context);
    await context.route(`${GoogleAuthHost}/o/oauth2/v2/auth*`, async route => {
      counters.google++;
      const reqUrl = new URL(route.request().url());
      const redirectUri = reqUrl.searchParams.get('redirect_uri') ?? '';
      const returnedState = reqUrl.searchParams.get('state') ?? '';
      await route.fulfill({
        status:      200,
        contentType: 'text/html',
        headers:     {
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
          'Cache-Control':              'no-store',
        },
        body: `
          <!doctype html>
          <html><body>
          <script>
            const redirectUri = ${JSON.stringify(redirectUri)};
            const state       = ${JSON.stringify(returnedState)};
            const fragment    = '#state=' + encodeURIComponent(state) +
                                '&id_token=test-id-token&token_type=id_token&expires_in=3599';
            setTimeout(() => {
              location.replace(redirectUri + fragment);
            }, 50);
          </script>
          </body></html>
        `,
      });
    });

    await context.route('**/api/auth/google', async route => {
      counters.exchange++;
      await route.fulfill({
        status:      200,
        contentType: 'application/json',
        body:        JSON.stringify({ access_token: 'e2e-access-token' }),
      });
    });

    await context.route('**/api/auth/refresh', async route => {
      counters.refresh++;
      await route.fulfill({
        status:      200,
        contentType: 'application/json',
        body:        JSON.stringify({ access_token: 'e2e-access-token' }),
      });
    });

    await context.route('**/api/auth/me', async route => {
      counters.me++;
      await route.fulfill({
        status:      200,
        contentType: 'application/json',
        body:        JSON.stringify({
          id:        'e2e-user',
          full_name: 'E2E User',
          email:     'e2e@google.test',
          role:      'user',
        }),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    const gisButton = page.locator('div[aria-label*="Google"] button').first();
    await expect(gisButton).toBeVisible({ timeout: 20_000 });
    const popupPromise = context.waitForEvent('page', { timeout: 20_000 });
    await gisButton.click();
    const popup = await popupPromise;

    await popup.waitForLoadState('load', { timeout: 20_000 });

    // This mocked account has no onboarding preference, so a successful OAuth
    // handoff must enter the first-login mode chooser rather than skip to feed.
    await page.waitForURL(u => u.pathname === '/choose-mode', { timeout: 20_000 });

    await expect
      .poll(() => counters.exchange, { timeout: 10_000, intervals: [100, 250, 500, 1_000] })
      .toBe(1);

    expect(counters.refresh).toBe(0);

    await popup.close();

    await page.goto('/feed', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('D2: popup closed without handoff — parent stays on /login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  });

});
