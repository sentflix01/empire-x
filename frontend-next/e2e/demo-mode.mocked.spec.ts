import { test, expect } from '@playwright/test';

test.describe('single identity authentication and workspace choice', () => {
  test('legacy account chooser bookmarks redirect to ordinary sign-in or sign-up', async ({ page }) => {
    await page.goto('/choose-mode?intent=signin&return=%2Fwallet');
    await expect(page).toHaveURL(/\/login\?return=%2Fwallet$/);

    await page.goto('/choose-mode?intent=signup');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('a fresh sign-in requests the canonical identity without a workspace body selector', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let submitted: { body: unknown; headers: Record<string, string> } | undefined;
    await page.route('**/api/auth/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/api/auth/refresh') {
        await route.fulfill({ status: 401, json: { error: 'Not authenticated' } });
      } else if (url.pathname === '/api/auth/login') {
        let body: unknown;
        try { body = request.postDataJSON(); } catch { body = undefined; }
        submitted = { body, headers: request.headers() };
        await route.fulfill({ json: { access_token: 'real-access-token', is_demo: false } });
      } else if (url.pathname === '/api/auth/me') {
        await route.fulfill({ json: { id: 'real-user', email: 'member@example.test', is_demo: false, demo_workspace_available: false } });
      } else {
        await route.fulfill({ json: {} });
      }
    });

    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('member@example.test');
    await page.locator('input[type="password"]').fill('practice-only-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/feed(?:\?|$)/);
    await expect(page.getByRole('button', { name: /Switch to Demo/i })).toHaveCount(0);
    expect(submitted?.body).toMatchObject({ email: 'member@example.test' });
    expect(submitted?.body).not.toHaveProperty('account_mode');
    expect(submitted?.headers['x-account-mode']).toBe('real');
    expect(await page.evaluate(() => localStorage.getItem('nodbusiness_account_mode'))).toBeNull();
    await context.close();
  });

});
