import { test, expect } from '@playwright/test';

/**
 * A Demo practice session that ends while the visitor is in the app: the API
 * answers 401 DEMO_SESSION_INVALID. The visitor must land on the landing page
 * with an explanation, not stay on a Demo feed that says "check your connection".
 */
test('an ended Demo session returns the visitor to the landing page with a notice', async ({ page, context, baseURL }) => {
  const host = new URL(baseURL ?? 'http://localhost:3002').hostname;
  await context.addCookies([{ name: 'nb_auth', value: '1', domain: host, path: '/' }]);
  // Once the session has ended, every API request is refused the same way.
  let ended = false;
  await page.route('**/api/**', (r) => {
    ended = true;
    return r.fulfill({ status: 401, json: { error: 'Demo session is invalid or expired', code: 'DEMO_SESSION_INVALID' } });
  });
  await page.route('**/api/auth/refresh', (r) => (ended
    ? r.fulfill({ status: 401, json: { error: 'Demo session is invalid or expired', code: 'DEMO_SESSION_INVALID' } })
    : r.fulfill({ json: { access_token: 'e2e-demo-token' } })));
  await page.route('**/api/auth/me', (r) => r.fulfill({ json: {
    id: '00000000-0000-4000-8000-0000000000d1', full_name: 'Demo Visitor', email: 'visitor@demo.nodbusiness.invalid',
    role: 'user', is_demo: true, demo_session_active: true, demo_session_anonymous: true,
  } }));

  await page.goto('/feed');
  await expect(page).toHaveURL(/\/landing$/, { timeout: 20_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Your Demo practice session has ended.' })).toBeVisible();
  await expect(page.getByText('Log out of Demo')).toHaveCount(0);
});
