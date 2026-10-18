import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const publishedShowroom = {
  id: 'e2e-showroom-id',
  owner_id: 'e2e-owner-id',
  title: 'Fresh Roots Cooperative',
  description: 'Locally grown produce from our farm.',
  slug: 'fresh-roots-cooperative',
  category: 'Agriculture',
  sections: JSON.stringify([
    { type: 'hero', title: 'Fresh Roots Cooperative', subtitle: 'Locally grown produce from our farm.', cta: 'Contact Us', heroBg: '#b8860b', heroBg2: '#d4a843' },
    { type: 'contact', location: 'Addis Ababa', phone: '+251900000000' },
  ]),
  status: 'published',
  created_at: '2026-10-07T08:00:00.000Z',
};

async function mockShowroomApi(page: Page, options: { signedIn?: boolean; publishedByDefault?: boolean; onPublished?: (body: Record<string, unknown>) => void; onUpdated?: (body: Record<string, unknown>) => void } = {}) {
  let isPublished = false;
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/api/auth/refresh') {
      await route.fulfill({ json: { access_token: 'e2e-access-token' } });
      return;
    }
    if (path === '/api/auth/me') {
      if (options.signedIn) {
        await route.fulfill({ json: { id: 'e2e-owner-id', full_name: 'E2E Business Owner', email: 'owner@example.test', role: 'user', is_demo: false, onboarding_mode: 'real' } });
      } else {
        await route.fulfill({ status: 401, json: { error: 'Not authenticated' } });
      }
      return;
    }
    if (path === '/api/posts') {
      await route.fulfill({ json: { posts: [], next_cursor: null } });
      return;
    }
    if (path === '/api/search') {
      await route.fulfill({ json: { users: [], products: [], showrooms: url.searchParams.get('q')?.toLowerCase().includes('sintayehu') ? [publishedShowroom] : [], posts: [] } });
      return;
    }
    if (path === '/api/businesses') {
      // Every live site belongs to a Business profile (#117): a signed-in owner has one.
      await route.fulfill({ json: options.signedIn ? [{ id: 'e2e-business-id', owner_id: 'e2e-owner-id', business_name: 'Fresh Roots Cooperative', visibility: 'public' }] : [] });
      return;
    }
    if (path === '/api/profiles') {
      await route.fulfill({ json: options.signedIn ? [{ id: 'e2e-profile-id', user_id: 'e2e-owner-id', full_name: 'E2E Business Owner' }] : [] });
      return;
    }
    if (path === '/api/showrooms' && request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      options.onPublished?.(body);
      isPublished = true;
      await route.fulfill({ status: 201, json: { ...publishedShowroom, ...body, id: publishedShowroom.id, slug: publishedShowroom.slug } });
      return;
    }
    if (path === '/api/showrooms' && request.method() === 'GET') {
      await route.fulfill({ json: (isPublished || options.publishedByDefault) && url.searchParams.get('status') === 'published' ? [publishedShowroom] : [] });
      return;
    }
    if (path === `/api/showrooms/${publishedShowroom.id}` && request.method() === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>;
      options.onUpdated?.(body);
      await route.fulfill({ json: { ...publishedShowroom, ...body } });
      return;
    }
    if (path === `/api/showrooms/${publishedShowroom.id}` || path === `/api/showrooms/slug/${publishedShowroom.slug}`) {
      await route.fulfill({ json: publishedShowroom });
      return;
    }
    if (path.startsWith('/api/products')) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ json: { success: true } });
  });
}

async function setAuthHint(context: BrowserContext) {
  await context.addCookies([{ name: 'nb_auth', value: '1', domain: 'localhost', path: '/', sameSite: 'Lax', httpOnly: false, secure: false }]);
}

test('a showroom back button returns to the previous page', async ({ page }) => {
  await mockShowroomApi(page, { publishedByDefault: true });

  await page.goto('/showrooms');
  await expect(page.getByRole('link', { name: /Fresh Roots Cooperative/ })).toBeVisible();
  await page.getByRole('link', { name: /Fresh Roots Cooperative/ }).click();
  await expect(page).toHaveURL(/\/showrooms\/e2e-showroom-id$/);

  await page.getByRole('button', { name: /Go back/ }).click();
  await expect(page).toHaveURL(/\/showrooms$/);
  await expect(page.getByRole('heading', { name: 'Showrooms' })).toBeVisible();
});

test('a scratch showroom publishes without sample content and appears to other visitors', async ({ page, browser }) => {
  let publishedBody: Record<string, unknown> | undefined;
  await page.setViewportSize({ width: 320, height: 554 });
  await mockShowroomApi(page, { signedIn: true, onPublished: body => { publishedBody = body; } });
  await setAuthHint(page.context());

  await page.goto('/showroom/create');
  await page.getByRole('button', { name: /Business & Commerce/i }).click();
  await page.getByRole('button', { name: /Start from scratch/i }).click();
  await expect(page.locator('input[placeholder="Your Business Name"]:visible').first()).toBeVisible();
  const mobilePublish = page.getByRole('button', { name: 'Publish site' });
  await expect(mobilePublish).toBeVisible();
  const publishBounds = await mobilePublish.boundingBox();
  expect(publishBounds).not.toBeNull();
  expect(publishBounds!.x + publishBounds!.width).toBeLessThanOrEqual(320);
  await expect(page.getByText('Signature Dish')).toHaveCount(0);
  await expect(page.getByText('Product One')).toHaveCount(0);

  await page.locator('input[placeholder="Your Business Name"]:visible').first().fill('Fresh Roots Cooperative');
  await mobilePublish.click();
  await expect(page).toHaveURL(/\/showrooms\/e2e-showroom-id$/);
  expect(publishedBody).toMatchObject({
    title: 'Fresh Roots Cooperative',
    status: 'published',
    owner_id: 'e2e-owner-id',
  });
  const publishedSections = JSON.parse(String(publishedBody?.sections)) as Array<Record<string, unknown>>;
  expect(publishedSections.some(section => JSON.stringify(section).includes('Signature Dish'))).toBeFalsy();
  expect(publishedSections.some(section => JSON.stringify(section).includes('Product One'))).toBeFalsy();
  await expect(page.getByRole('link', { name: /Finish/ })).toBeVisible();
  await page.getByRole('link', { name: /Finish/ }).click();
  await expect(page).toHaveURL(/\/profile\/e2e-owner-id\?view=business$/);
  await expect(page.getByText('Fresh Roots Cooperative').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /View site/ })).toBeVisible();
  await page.goto('/search?q=Sintayehu');
  await expect(page.getByRole('link', { name: /Fresh Roots Cooperative/ })).toBeVisible();

  const guestContext = await browser.newContext({ baseURL: process.env.E2E_FRONTEND_URL ?? 'http://localhost:3002' });
  const guestPage = await guestContext.newPage();
  await mockShowroomApi(guestPage, { publishedByDefault: true });
  await guestPage.goto('/feed');
  await guestPage.getByRole('button', { name: 'Business', exact: true }).first().click();
  await expect(guestPage.getByText('Fresh Roots Cooperative').first()).toBeVisible();
  await guestPage.getByRole('link', { name: /Visit/ }).first().click();
  await expect(guestPage).toHaveURL(/\/showroom\/fresh-roots-cooperative$/);
  await expect(guestPage.getByText('Fresh Roots Cooperative').first()).toBeVisible();
  await guestContext.close();
});

test('editing a published showroom restores its sections and keeps them on republish', async ({ page }) => {
  let updatedBody: Record<string, unknown> | undefined;
  await page.setViewportSize({ width: 320, height: 554 });
  await mockShowroomApi(page, { signedIn: true, onUpdated: body => { updatedBody = body; } });
  await setAuthHint(page.context());

  await page.goto('/showroom/create?edit=e2e-showroom-id');
  const businessName = page.locator('input[placeholder="Your Business Name"]:visible').first();
  await expect(businessName).toHaveValue('Fresh Roots Cooperative');
  await businessName.fill('Fresh Roots Cooperative Updated');
  await page.getByRole('button', { name: 'Publish site' }).click();
  await expect(page).toHaveURL(/\/showrooms\/e2e-showroom-id$/);

  const savedSections = JSON.parse(String(updatedBody?.sections)) as Array<Record<string, unknown>>;
  expect(savedSections.map(section => section.type)).toEqual(['hero', 'contact']);
  expect(savedSections[0]).toMatchObject({ title: 'Fresh Roots Cooperative Updated', subtitle: 'Locally grown produce from our farm.' });
  expect(savedSections[1]).toMatchObject({ location: 'Addis Ababa', phone: '+251900000000' });
});
