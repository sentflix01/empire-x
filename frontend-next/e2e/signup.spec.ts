import { test, expect } from '@playwright/test';

/**
 * Signup flow — TD-003.
 *
 * Tests the complete signup → OTP verification → login flow.
 * For local development, OTP codes are printed to the backend console.
 */

function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `e2e-test-${timestamp}-${random}@nodbusiness.test`;
}

const TEST_PASSWORD = 'Test1234!';

async function fillRegisterForm(page: any, email: string, password: string, agreeToTerms: boolean) {
  // Dev-mode lazy compilation: wait for hydration to settle before interacting,
  // otherwise clicks land before React attaches onChange and state never updates.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('#password').fill(password);
  if (agreeToTerms) {
    // A real, visible checkbox since the new-user audit (NU-2).
    const checkbox = page.getByRole('checkbox', { name: /agree to the/i });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }
}

test.describe('Signup flow', () => {
  let testEmail: string;
  let submittedAccountModes: unknown[];

  test.beforeEach(async ({ page }) => {
    testEmail = generateTestEmail();
    submittedAccountModes = [];
    // Keep this signup flow deterministic and independent of live email or
    // database services. Workspace selection happens after authentication.
    await page.route('**/api/auth/register', async (route) => {
      const { email, account_mode } = route.request().postDataJSON() as { email: string; account_mode?: string };
      submittedAccountModes.push(account_mode);
      if (email === 'test@nodbusiness.app') {
        await route.fulfill({ status: 409, json: { error: 'Account already exists' } });
      } else {
        await route.fulfill({ json: { message: 'Registration successful.' } });
      }
    });
    await page.route('**/api/auth/resend-otp', (route) => route.fulfill({ json: { message: 'Code sent' } }));
  });

  test('register with valid credentials shows OTP verification screen', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, TEST_PASSWORD, true);

    // Submit registration - wait for OTP screen to appear
    await Promise.all([
      page.waitForSelector('text=Check your email', { timeout: 30_000 }),
      page.locator('button[type="submit"], button:has-text("Create account")').first().click({ force: true }),
    ]);
    expect(submittedAccountModes).toEqual([undefined]);

    console.log('OTP screen appeared');

    // Should show OTP verification screen
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    await expect(page.locator('text=Verify email')).toBeVisible();

    // The code field (InputOTP) — found by purpose, not by layout classes (F-032).
    await expect(page.locator('input[autocomplete="one-time-code"]')).toBeAttached();
  });

  test('register rejects duplicate email', async ({ page }) => {
    // Use seeded test account (verified)
    const existingEmail = 'test@nodbusiness.app';

    await page.goto('/register?mode=real', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, existingEmail, TEST_PASSWORD, true);

    await page.locator('button[type="submit"], button:has-text("Create account")').first().click();

    // A used email offers the way forward (new-user audit NU-17).
    await expect(page.getByRole('alert').filter({ hasText: 'already has an account' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /Forgot password/ })).toBeVisible();
  });

  test('one password field with show/hide (no confirm field)', async ({ page }) => {
    await page.goto('/register?mode=real', { waitUntil: 'domcontentloaded' });
    await page.locator('#password').waitFor({ state: 'visible', timeout: 30_000 });
    await expect(page.locator('#confirm')).toHaveCount(0);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  });

  test('register rejects password too short, next to the field', async ({ page }) => {
    await page.goto('/register?mode=real', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });
    await fillRegisterForm(page, testEmail, 'Short1!', true);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'at least 8 characters' })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/register/);
  });

  test('register requires terms acceptance and says so (the button is never dead)', async ({ page }) => {
    await page.goto('/register?mode=real', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });
    await fillRegisterForm(page, testEmail, TEST_PASSWORD, false);
    const submit = page.getByRole('button', { name: 'Create account' });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Tick the box to agree' })).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test('a typo email gets a one-tap fix', async ({ page }) => {
    await page.goto('/register?mode=real', { waitUntil: 'domcontentloaded' });
    const email = page.locator('#email');
    await email.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await email.fill('selam@gmial');
    await email.blur();
    await page.getByRole('button', { name: 'selam@gmail.com' }).click();
    await expect(email).toHaveValue('selam@gmail.com');
  });

  test('can navigate back from OTP screen to edit email', async ({ page }) => {
    await page.goto('/register?mode=real', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, TEST_PASSWORD, true);

    await Promise.all([
      page.waitForSelector('text=Check your email', { timeout: 30_000 }),
      page.locator('button[type="submit"], button:has-text("Create account")').first().click({ force: true }),
    ]);

    // On OTP screen
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 15_000 });

    // Click "Wrong email? Go back"
    await page.locator('button:has-text("Go back")').first().click();

    // Should return to registration form with email pre-filled
    await expect(page.locator('input[type="email"], input[name="email"]')).toHaveValue(testEmail);
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  });

  test('resend OTP button works and shows cooldown', async ({ page }) => {
    await page.goto('/register?mode=real', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, TEST_PASSWORD, true);

    await Promise.all([
      page.waitForSelector('text=Check your email', { timeout: 30_000 }),
      page.locator('button[type="submit"], button:has-text("Create account")').first().click({ force: true }),
    ]);

    // On OTP screen
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 15_000 });

    // Click resend
    await page.locator('button:has-text("Resend code")').first().click();

    // Should show cooldown
    await expect(page.locator('text=Resend in')).toBeVisible({ timeout: 5_000 });
  });
});
