import { test, expect, type Page } from '@playwright/test';

async function mockSession(
  page: Page,
  calls: string[],
  identities: string[],
  initialOnboardingMode: 'demo' | 'real' | null = null,
  preferenceWrites: string[] = [],
) {
  let demoMode = false;
  let onboardingMode = initialOnboardingMode;
  // Model the backend's real HttpOnly refresh cookie in the browser context.
  await page.context().addCookies([{
    name: 'refresh_token', value: 'real-refresh', domain: 'localhost',
    path: '/api/auth', httpOnly: true, sameSite: 'Lax',
  }]);
  // Make every API response local to the browser test. No real account or
  // backend is used; login itself sets the non-sensitive routing hint cookie.
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const key = `${route.request().method()} ${url.pathname}`;
    calls.push(key);

    if (url.pathname === '/api/auth/login') {
      await route.fulfill({
        headers: { 'set-cookie': 'refresh_token=real-refresh; Path=/api/auth; HttpOnly; SameSite=Lax' },
        json: { access_token: 'e2e-access-token', is_demo: false, onboarding_mode: onboardingMode },
      });
      return;
    }
    if (url.pathname === '/api/auth/refresh') {
      await route.fulfill({ json: { access_token: demoMode ? 'e2e-demo-refreshed-token' : 'e2e-refreshed-token' } });
      return;
    }
    if (url.pathname === '/api/auth/me') {
      const identity = demoMode
        ? { id: 'e2e-demo', full_name: 'Demo Visitor', email: 'test@nodbusiness.app', is_demo: true, demo_track: 1, onboarding_mode: 'demo', role: 'user' }
        : { id: 'e2e-user', full_name: 'Real Visitor', email: 'e2e@example.test', is_demo: false, onboarding_mode: onboardingMode, role: 'user' };
      identities.push(identity.id);
      await route.fulfill({ json: identity });
      return;
    }
    if (url.pathname === '/api/auth/demo') {
      demoMode = true;
      await page.context().addCookies([{
        name: 'demo_track1', value: 'signed-demo-selector', domain: 'localhost',
        path: '/api/auth', httpOnly: true, sameSite: 'Lax',
      }]);
      await route.fulfill({
        headers: { 'set-cookie': 'demo_track1=signed-demo-selector; Path=/api/auth; HttpOnly; SameSite=Lax' },
        json: { access_token: 'e2e-demo-token', demo: true, track: 1 },
      });
      return;
    }
    if (url.pathname === '/api/auth/demo/exit') {
      demoMode = false;
      await route.fulfill({ json: { success: true, return_to_real: true } });
      return;
    }
    if (url.pathname === '/api/auth/onboarding-mode') {
      const { mode } = route.request().postDataJSON() as { mode: 'demo' | 'real' };
      onboardingMode = mode;
      preferenceWrites.push(mode);
      await route.fulfill({ json: { onboarding_mode: mode } });
      return;
    }

    // Both mock identities have an initialized profile so this scenario tests
    // the mode handoff and feed, not first-login onboarding.
    if (url.pathname === '/api/profiles') {
      const userId = demoMode ? 'e2e-demo' : 'e2e-user';
      await route.fulfill({ json: [{ id: `profile-${userId}`, user_id: userId, profile_type: 'personal' }] });
      return;
    }

    await route.fulfill({ json: {} });
  });
}

async function signInAndWaitForChooser(page: Page) {
  await page.goto('/login?return=%2Fchoose-mode');
  await page.getByRole('textbox', { name: /email/i }).fill('e2e@example.test');
  await page.locator('input[type="password"]').fill('e2e-only-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/choose-mode$/);
  await expect(page.getByRole('heading', { name: 'How would you like to continue?' })).toBeVisible();
}

test.describe('Demo and Real mode browser flow (mock API)', () => {
  test('login page renders without depending on a local backend health endpoint', async ({ page }) => {
    const localHealthRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/health') localHealthRequests.push(request.url());
    });

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(localHealthRequests).toEqual([]);
  });

  test('successful login opens the chooser and Demo proceeds to feed', async ({ page }) => {
    const calls: string[] = [];
    const identities: string[] = [];
    const realOnlyHeaders: Array<string | undefined> = [];
    const preferenceWrites: string[] = [];
    await mockSession(page, calls, identities, null, preferenceWrites);
    await signInAndWaitForChooser(page);
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/posts') {
        realOnlyHeaders.push(request.headers()['x-real-only']);
      }
    });

    await page.getByRole('button', { name: 'Try Demo' }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect.poll(() => identities.at(-1)).toBe('e2e-demo');
    const cookies = await page.context().cookies();
    expect(cookies.find(cookie => cookie.name === 'refresh_token')?.value).toBe('real-refresh');
    expect(cookies.find(cookie => cookie.name === 'demo_track1')?.value).toBe('signed-demo-selector');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('nodbusiness_real_mode'))).toBe('false');
    await expect.poll(() => realOnlyHeaders.length).toBeGreaterThan(0);
    expect(realOnlyHeaders.every((header) => !header)).toBe(true);
    expect(calls).toContain('POST /api/auth/login');
    expect(calls).toContain('POST /api/auth/refresh');
    expect(calls).toContain('GET /api/auth/me');
    expect(calls).toContain('POST /api/auth/demo');
    expect(preferenceWrites).toEqual(['demo']);
    expect(calls.indexOf('POST /api/auth/onboarding-mode')).toBeLessThan(calls.indexOf('POST /api/auth/demo'));
  });

  test('successful login opens the chooser and Real proceeds with real-only mode', async ({ page }) => {
    const calls: string[] = [];
    const identities: string[] = [];
    const preferenceWrites: string[] = [];
    const realOnlyHeaders: Array<string | undefined> = [];
    await mockSession(page, calls, identities, null, preferenceWrites);
    await signInAndWaitForChooser(page);
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/posts') {
        realOnlyHeaders.push(request.headers()['x-real-only']);
      }
    });

    await page.getByRole('button', { name: 'Use Real Account' }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('nodbusiness_real_mode'))).toBe('true');
    await expect.poll(() => realOnlyHeaders.length).toBeGreaterThan(0);
    expect(realOnlyHeaders.every((header) => header === '1')).toBe(true);
    expect(preferenceWrites).toEqual(['real']);
  });

  test('returning real account applies its saved preference without showing the chooser', async ({ page }) => {
    const calls: string[] = [];
    const identities: string[] = [];
    const preferenceWrites: string[] = [];
    const realOnlyHeaders: Array<string | undefined> = [];
    await mockSession(page, calls, identities, 'real', preferenceWrites);
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('e2e@example.test');
    await page.locator('input[type="password"]').fill('e2e-only-password');
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/posts') {
        realOnlyHeaders.push(request.headers()['x-real-only']);
      }
    });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole('heading', { name: 'How would you like to continue?' })).toHaveCount(0);
    await expect.poll(() => realOnlyHeaders.length).toBeGreaterThan(0);
    expect(realOnlyHeaders.every((header) => header === '1')).toBe(true);
    expect(preferenceWrites).toEqual([]);

    // Visiting an auth page with the active session also applies the saved
    // mode instead of presenting /choose-mode again.
    await page.goto('/login');
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole('heading', { name: 'How would you like to continue?' })).toHaveCount(0);
  });

  test('returning demo preference re-enters Demo without showing the chooser', async ({ page }) => {
    const calls: string[] = [];
    const identities: string[] = [];
    await mockSession(page, calls, identities, 'demo');
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('e2e@example.test');
    await page.locator('input[type="password"]').fill('e2e-only-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole('heading', { name: 'How would you like to continue?' })).toHaveCount(0);
    await expect.poll(() => identities.at(-1)).toBe('e2e-demo');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('nodbusiness_real_mode'))).toBe('false');
    expect(calls).toContain('POST /api/auth/demo');
  });

  test('Track 1 demo can return to the real account without losing its refresh session', async ({ page }) => {
    const calls: string[] = [];
    const identities: string[] = [];
    await mockSession(page, calls, identities);
    await signInAndWaitForChooser(page);
    await page.getByRole('button', { name: 'Try Demo' }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect.poll(() => identities.at(-1)).toBe('e2e-demo');

    await page.getByRole('button', { name: 'Switch to real' }).click();
    await expect(page.getByRole('heading', { name: 'Leave the shared demo account?' })).toBeVisible();
    await page.getByRole('button', { name: 'Leave demo' }).click();
    await expect(page).toHaveURL(/\/feed$/);
    await expect.poll(() => identities.at(-1)).toBe('e2e-user');
    await expect(page.getByLabel('Demo account notice')).toHaveCount(0);
    expect(calls).toContain('POST /api/auth/demo/exit');
    expect(calls.filter(call => call === 'POST /api/auth/refresh').length).toBeGreaterThan(1);
  });
});
