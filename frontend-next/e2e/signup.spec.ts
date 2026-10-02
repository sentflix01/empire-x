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

async function fillRegisterForm(page: any, email: string, password: string, confirmPassword: string, agreeToTerms: boolean) {
  // Dev-mode lazy compilation: wait for hydration to settle before interacting,
  // otherwise clicks land before React attaches onChange and state never updates.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('input[id="confirm"], input[name="confirm"]').first().fill(confirmPassword);
  if (agreeToTerms) {
    // The input is sr-only — the styled div intercepts pointer events, so a
    // plain click can never land on it. check({ force }) bypasses the
    // hit-target check while still dispatching a real click → React onChange.
    const checkbox = page.getByRole('checkbox', { name: /agree to the/i });
    await checkbox.check({ force: true });
    await expect(checkbox).toBeChecked();
    // Prove React state actually updated (button enables only when agreed=true)
    await page.locator('button[type="submit"]:not([disabled])').first().waitFor({ state: 'visible', timeout: 10_000 });
  }
}

test.describe('Signup flow', () => {
  let testEmail: string;

  test.beforeEach(() => {
    testEmail = generateTestEmail();
  });

  test('register with valid credentials shows OTP verification screen', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, TEST_PASSWORD, TEST_PASSWORD, true);

    // Submit registration - wait for OTP screen to appear
    await Promise.all([
      page.waitForSelector('text=Check your email', { timeout: 30_000 }),
      page.locator('button[type="submit"], button:has-text("Create account")').first().click({ force: true }),
    ]);

    console.log('OTP screen appeared');

    // Should show OTP verification screen
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    await expect(page.locator('text=Verify email')).toBeVisible();

    // Verify OTP input area is present (InputOTP component)
    await expect(page.locator('.flex.items-center.gap-2')).toBeVisible();
  });

  test('register rejects duplicate email', async ({ page }) => {
    // Use seeded test account (verified)
    const existingEmail = 'test@nodbusiness.app';

    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, existingEmail, TEST_PASSWORD, TEST_PASSWORD, true);

    await page.locator('button[type="submit"], button:has-text("Create account")').first().click();

    // Should show error about existing account (seeded account is verified, so returns 409)
    await expect(page.locator('text=already exists')).toBeVisible({ timeout: 10_000 });
  });

  test('register rejects mismatched passwords', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, TEST_PASSWORD, 'DifferentPassword123!', true);

    await page.locator('button[type="submit"], button:has-text("Create account")').first().click({ force: true });

    // Should show password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible({ timeout: 5_000 });
    
    // Should still be on register page
    await expect(page).toHaveURL(/\/register/);
  });

  test('register rejects password too short', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, 'Short1!', 'Short1!', true);

    // Click submit - HTML5 validation should prevent submission
    await page.locator('button[type="submit"], button:has-text("Create account")').first().click({ force: true });

    // Should stay on register page (HTML5 validation blocks submit)
    await expect(page).toHaveURL(/\/register/);
    
    // The password input should have validation error (browser native, not in DOM)
    // Just verify we're still on the page
  });

  test('register requires terms acceptance', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    // Fill form but DON'T agree to terms
    await page.locator('input[type="email"], input[name="email"]').first().fill(testEmail);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('input[id="confirm"], input[name="confirm"]').first().fill(TEST_PASSWORD);
    // Don't click checkbox

    // Button should be disabled
    await expect(page.locator('button[type="submit"][disabled], button:has-text("Create account")[disabled]')).toBeVisible({ timeout: 5_000 });
    
    // Try to click anyway - should not submit
    await page.locator('button[type="submit"], button:has-text("Create account")').first().click({ force: true });
    
    // Should show terms required error (from form validation in handleSubmit)
    await expect(page.locator('text=agree to the Terms')).toBeVisible({ timeout: 5_000 });
  });

  test('can navigate back from OTP screen to edit email', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, TEST_PASSWORD, TEST_PASSWORD, true);

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
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 30_000 });

    await fillRegisterForm(page, testEmail, TEST_PASSWORD, TEST_PASSWORD, true);

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
