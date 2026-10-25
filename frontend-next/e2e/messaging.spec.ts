import path from 'node:path';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { backendDatabaseUrl } from './target-guard';

/**
 * Messaging M7: two (and three) people at once, on each device project
 * (messaging-phone, -iphone, -tablet, -desktop in playwright.config.ts).
 *
 *   1. A buyer messages a business from a product; the owner answers from the
 *      Business inbox. Live both ways, typing…, seen ticks.
 *   2. Reply, react, edit, pin, delete for everyone / for me, forward.
 *   3. Requests, block, and "who can message me: nobody" with retry.
 *   4. Groups: create, live delivery, remove a member (their chat closes);
 *      in a channel only admins post.
 *   5. Offline: messages missed while away arrive on reconnect, and a message
 *      written offline is sent when the connection comes back.
 *
 * Local only (e2e/target-guard.ts). Needs ALLOW_E2E_SEED=1 and
 * E2E_MESSAGING_PASSWORD; each device run reseeds its accounts first.
 */

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3002';
const PASSWORD = process.env.E2E_MESSAGING_PASSWORD ?? '';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const seedModule = require(path.resolve(__dirname, '../../backend/db/seed-e2e-messaging.js')) as {
  seed: (env: Record<string, string | undefined>) => Promise<{ buyer: string; owner: string; third: string; businessId: string; productId: string }>;
  PEOPLE: Record<'buyer' | 'owner' | 'third', { email: string; name: string }>;
  BUSINESS: string;
  PRODUCT: string;
};
const { PEOPLE, BUSINESS, PRODUCT } = seedModule;
type Who = keyof typeof PEOPLE;

// ── API helpers (setup and checks the screen can't show) ───────────────────────
// One sign-in per person per device run (the login rate limit is 20 per window):
// the access token is used for API calls, the refresh cookie for the browser.
const sessions: Partial<Record<Who, { access: string; refresh: string }>> = {};
async function session(who: Who) {
  if (sessions[who]) return sessions[who]!;
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PEOPLE[who].email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed for ${who}: ${res.status}`);
  const cookies = res.headers.getSetCookie?.() ?? [];
  const refresh = cookies.map((c) => /^refresh_token=([^;]+)/.exec(c)?.[1]).find(Boolean);
  if (!refresh) throw new Error('Login gave no refresh cookie');
  sessions[who] = { access: (await res.json()).access_token, refresh };
  return sessions[who]!;
}
const token = async (who: Who) => (await session(who)).access;
async function api<T = unknown>(who: Who, method: string, p: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API}${p}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token(who)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : null) as T };
}

// ── Browser helpers ───────────────────────────────────────────────────────────
function deviceOptions() {
  const u = test.info().project.use as Record<string, unknown>;
  const pick = ['viewport', 'userAgent', 'deviceScaleFactor', 'isMobile', 'hasTouch'] as const;
  return Object.fromEntries(pick.filter((k) => u[k] !== undefined).map((k) => [k, u[k]]));
}

async function signIn(browser: Browser, who: Who): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ ...deviceOptions(), baseURL: FRONTEND });
  // No page-guide tour popping over the screen, and no dev-only badge over the Send button.
  await context.route('**/api/flags/page-guided-tours', (r) => r.fulfill({ json: { enabled_for_user: false } }));
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  });
  const { refresh } = await session(who);
  const host = new URL(API).hostname;
  await context.addCookies([
    { name: 'refresh_token', value: refresh, domain: host, path: '/api/auth', httpOnly: true, sameSite: 'Lax' },
    // The app's "signed in" hint (never the token itself).
    { name: 'nb_auth', value: '1', domain: new URL(FRONTEND).hostname, path: '/', sameSite: 'Lax' },
  ]);
  const page = await context.newPage();
  await page.goto('/messages', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/messages/);
  return { context, page };
}

const bubble = (page: Page, text: string) => page.locator('[id^="msg-"]', { hasText: text }).last();
const header = (page: Page) => page.locator('[data-page-guide="chat-header"]');

async function send(page: Page, text: string) {
  const box = page.getByRole('textbox', { name: 'Message' });
  await box.fill(text);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(bubble(page, text)).toBeVisible();
  // Confirmed by the server (actions such as Edit only appear then).
  await expect(bubble(page, text).locator('[data-tick]')).not.toHaveAttribute('data-tick', 'sending');
}

async function openActions(page: Page, text: string) {
  // Long-press on touch screens, right-click on computers: both open the same sheet.
  await bubble(page, text).dispatchEvent('contextmenu');
  const sheet = page.getByRole('dialog', { name: 'Message actions' });
  await expect(sheet).toBeVisible();
  return sheet;
}

async function chatMenu(page: Page, item: string | RegExp) {
  await page.getByRole('button', { name: 'Chat options' }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

const chatIdOf = (page: Page) => new URL(page.url()).pathname.split('/')[2];

// ── The suite ─────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });
// WebKit (iPhone, iPad) is slower, especially against a dev server.
test.beforeEach(() => { test.setTimeout(/iphone|tablet/.test(test.info().project.name) ? 180_000 : 120_000); });

let ids: Awaited<ReturnType<typeof seedModule.seed>>;
let buyer: { context: BrowserContext; page: Page };
let owner: { context: BrowserContext; page: Page };
let third: { context: BrowserContext; page: Page };
let businessChat = '';

test.beforeAll(async ({ browser }) => {
  test.skip(process.env.ALLOW_E2E_SEED !== '1' || PASSWORD.length < 16,
    'Set ALLOW_E2E_SEED=1 and E2E_MESSAGING_PASSWORD (16+ characters) to run the two-person messaging suite.');
  ids = await seedModule.seed({ ...process.env, DATABASE_URL: backendDatabaseUrl() ?? undefined });
  for (const k of Object.keys(sessions) as Who[]) delete sessions[k];
  [buyer, owner, third] = await Promise.all([signIn(browser, 'buyer'), signIn(browser, 'owner'), signIn(browser, 'third')]);
});

test.afterAll(async () => {
  await Promise.all([buyer?.context.close(), owner?.context.close(), third?.context.close()]);
});

test('a buyer messages a business from a product; both sides see it live', async () => {
  await buyer.page.goto(`/products/${ids.productId}`);
  await buyer.page.getByRole('button', { name: /Message seller/ }).click();
  await buyer.page.waitForURL(/\/messages\/[0-9a-f-]{36}$/);
  businessChat = chatIdOf(buyer.page);
  // The customer sees the business, with a card for the product they came from.
  await expect(header(buyer.page)).toContainText(BUSINESS);
  await expect(buyer.page.getByText(PRODUCT).first()).toBeVisible();
  await send(buyer.page, 'Is the coffee still available?');

  // The owner finds it under Business, as a chat with the customer.
  await owner.page.goto('/messages');
  await owner.page.getByRole('tab', { name: /Business/ }).click();
  await owner.page.getByRole('link', { name: new RegExp(PEOPLE.buyer.name) }).click();
  await owner.page.waitForURL(new RegExp(`/messages/${businessChat}$`));
  await expect(bubble(owner.page, 'Is the coffee still available?')).toBeVisible();

  // Seen: the owner has the chat open.
  await expect(bubble(buyer.page, 'Is the coffee still available?').locator('[data-tick]')).toHaveAttribute('data-tick', 'seen');

  // typing… then the answer, live.
  await owner.page.getByRole('textbox', { name: 'Message' }).fill('Yes');
  await expect(header(buyer.page)).toContainText('typing…');
  await send(owner.page, 'Yes, 50 left today');
  await expect(bubble(buyer.page, 'Yes, 50 left today')).toBeVisible();
});

test('reply, react, edit, pin, delete and forward', async () => {
  // Reply quotes the message on both sides.
  await (await openActions(owner.page, 'Is the coffee still available?')).getByRole('button', { name: 'Reply' }).click();
  await send(owner.page, 'It is 650 ETB per kg');
  await expect(bubble(buyer.page, 'It is 650 ETB per kg')).toContainText('Is the coffee still available?');

  // A reaction shows up on the other side.
  await (await openActions(buyer.page, 'It is 650 ETB per kg')).getByRole('button', { name: 'Like' }).click();
  await expect(bubble(owner.page, 'It is 650 ETB per kg').getByRole('button', { name: /👍, 1 reaction/ })).toBeVisible();

  // Edit your own message; the other side sees "edited".
  await send(buyer.page, 'See you tomorow');
  await (await openActions(buyer.page, 'See you tomorow')).getByRole('button', { name: 'Edit' }).click();
  await buyer.page.getByRole('textbox', { name: 'Edit message' }).fill('See you tomorrow');
  await buyer.page.getByRole('button', { name: 'Save edit' }).click();
  await expect(bubble(owner.page, 'See you tomorrow')).toContainText('edited');

  // Pin: both see the pinned bar.
  await (await openActions(owner.page, 'Yes, 50 left today')).getByRole('button', { name: 'Pin' }).click();
  for (const p of [owner.page, buyer.page]) await expect(p.getByRole('button', { name: /Pinned message.*Yes, 50 left today/ })).toBeVisible();

  // Delete for everyone: gone on both sides.
  await send(buyer.page, 'Oops, wrong chat');
  await expect(bubble(owner.page, 'Oops, wrong chat')).toBeVisible();
  const sheet = await openActions(buyer.page, 'Oops, wrong chat');
  await sheet.getByRole('button', { name: 'Delete', exact: true }).click();
  await sheet.getByRole('button', { name: 'Delete for everyone' }).click();
  await expect(bubble(owner.page, 'Oops, wrong chat')).toHaveCount(0);
  await expect(bubble(buyer.page, 'Oops, wrong chat')).toHaveCount(0);

  // Delete for me: someone else's message offers only that; it stays for them.
  const ownerSheet = await openActions(owner.page, 'See you tomorrow');
  await ownerSheet.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(ownerSheet.getByRole('button', { name: 'Delete for everyone' })).toHaveCount(0);
  await ownerSheet.getByRole('button', { name: 'Delete for me' }).click();
  await expect(bubble(owner.page, 'See you tomorrow')).toHaveCount(0);
  await buyer.page.reload();
  await expect(bubble(buyer.page, 'See you tomorrow')).toBeVisible();

  // Forward into another chat.
  const dm = await api<{ id: string }>('buyer', 'POST', '/api/messages/conversations/find-or-create', { target_user_id: ids.third });
  await (await openActions(buyer.page, 'Yes, 50 left today')).getByRole('button', { name: 'Forward' }).click();
  await buyer.page.getByRole('dialog', { name: 'Forward message' }).getByRole('button', { name: new RegExp(PEOPLE.third.name) }).click();
  await expect.poll(async () => (await api<Array<{ content: string }>>('third', 'GET', `/api/messages/conversations/${dm.data.id}/messages`)).data.map((m) => m.content))
    .toContain('Yes, 50 left today');
});

test('requests, blocking with retry, and "nobody can message me"', async () => {
  // A first message from someone the owner doesn't follow waits in Requests.
  const req = await api<{ id: string }>('third', 'POST', '/api/messages/conversations/find-or-create', { target_user_id: ids.owner });
  expect((await api('third', 'POST', `/api/messages/conversations/${req.data.id}/messages`, { content: 'Hi, do you deliver to Bole?' })).status).toBe(201);
  await owner.page.goto('/messages');
  await owner.page.getByRole('tab', { name: /Requests/ }).click();
  await owner.page.getByRole('link', { name: new RegExp(PEOPLE.third.name) }).click();
  const banner = owner.page.getByRole('region', { name: 'Message request' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Accept' }).click();
  await expect(banner).toHaveCount(0);

  // Block from the chat menu: the owner's box is replaced, and the other person's
  // message isn't sent (with the reason and a retry) until they're unblocked.
  await chatMenu(owner.page, 'Block');
  await owner.page.getByRole('dialog').getByRole('button', { name: 'Block', exact: true }).click();
  await expect(owner.page.getByText('You blocked this person.')).toBeVisible();
  await third.page.goto(`/messages/${req.data.id}`);
  await third.page.getByRole('textbox', { name: 'Message' }).fill('Hello?');
  await third.page.getByRole('button', { name: 'Send message' }).click();
  // The reason shows briefly as a toast; the lasting state is the bubble's retry.
  const retry = third.page.getByRole('button', { name: /Not sent · Tap to retry/ });
  await expect(retry).toBeVisible();
  // On small phones the "Blocked" toast sits over the Unblock button for a few
  // seconds. Toasts pause while hovered (the test pointer rests where Block was)
  // or while their page is in the background; a finger does neither.
  await owner.page.bringToFront();
  await owner.page.mouse.move(1, 1);
  await expect(owner.page.getByText('Blocked. They can’t message you.')).toBeHidden({ timeout: 15_000 });
  await owner.page.getByRole('button', { name: 'Unblock' }).click();
  await expect(owner.page.getByRole('textbox', { name: 'Message' })).toBeVisible();
  await retry.click();
  await expect(retry).toHaveCount(0);
  await expect(bubble(owner.page, 'Hello?')).toBeVisible();

  // "Who can message me: nobody": starting a new chat is refused, with the reason.
  expect((await api('owner', 'PUT', '/api/social/privacy', { message_policy: 'nobody' })).status).toBe(200);
  await buyer.page.goto('/messages');
  await buyer.page.getByRole('button', { name: 'New message' }).click();
  const picker = buyer.page.getByRole('dialog', { name: 'New message' });
  await picker.getByRole('textbox', { name: 'Search people' }).fill(PEOPLE.owner.name);
  await picker.getByRole('button', { name: new RegExp(PEOPLE.owner.name) }).click();
  await expect(buyer.page.getByText('This person isn’t taking new messages.').first()).toBeVisible();
  expect((await api('owner', 'PUT', '/api/social/privacy', { message_policy: 'everyone' })).status).toBe(200);
  await buyer.page.keyboard.press('Escape');
});

test('groups: create, talk live, remove someone; channels: only admins post', async () => {
  // The owner creates a group with the buyer and the third person.
  await owner.page.goto('/messages');
  await owner.page.getByRole('button', { name: 'New group or channel' }).click();
  await owner.page.getByRole('button', { name: 'New Group', exact: true }).click();
  const dialog = owner.page.getByRole('dialog', { name: 'New group' });
  await dialog.getByPlaceholder('Group name').fill('E2E Market Group');
  await dialog.getByRole('textbox', { name: 'Search people' }).fill('Msg');
  await dialog.getByRole('button', { name: new RegExp(PEOPLE.buyer.name) }).click();
  await dialog.getByRole('button', { name: new RegExp(PEOPLE.third.name) }).click();
  await dialog.getByRole('button', { name: 'Create group' }).click();
  await owner.page.waitForURL(/\/messages\/[0-9a-f-]{36}$/);
  const group = chatIdOf(owner.page);
  await expect(header(owner.page)).toContainText('3 members');

  // The others find it under Groups, and messages arrive live.
  await buyer.page.goto('/messages');
  await buyer.page.getByRole('tab', { name: /Groups/ }).click();
  await buyer.page.getByRole('link', { name: /E2E Market Group/ }).click();
  await third.page.goto(`/messages/${group}`);
  await expect(header(third.page)).toContainText('E2E Market Group');
  await send(owner.page, 'Welcome, market opens at 9');
  await expect(bubble(buyer.page, 'Welcome, market opens at 9')).toBeVisible();
  await expect(bubble(third.page, 'Welcome, market opens at 9')).toBeVisible();

  // The owner removes the third person from Group info: their open chat closes.
  await chatMenu(owner.page, 'Group info');
  await owner.page.getByRole('button', { name: new RegExp(`^${PEOPLE.third.name}`) }).click();
  await owner.page.getByRole('button', { name: 'Remove from group' }).click();
  await expect(third.page).toHaveURL(/\/messages$/);
  expect((await api('third', 'GET', `/api/messages/conversations/${group}/messages`)).status).toBe(403);

  // In a channel only admins post.
  const channel = await api<{ id: string }>('owner', 'POST', '/api/messages/conversations', { type: 'channel', name: 'E2E Deals', participant_ids: [ids.buyer] });
  await buyer.page.goto(`/messages/${channel.data.id}`);
  await expect(buyer.page.getByText('Only admins can post in this channel.')).toBeVisible();
  await expect(buyer.page.getByRole('textbox', { name: 'Message' })).toHaveCount(0);
});

test('offline: missed messages arrive on reconnect, and offline messages are sent', async () => {
  test.skip(test.info().project.name === 'messaging-iphone' || test.info().project.name === 'messaging-tablet',
    'WebKit in Playwright does not emulate going offline for WebSockets');
  for (const p of [buyer.page, owner.page]) await p.goto(`/messages/${businessChat}`);
  await expect(bubble(buyer.page, 'Yes, 50 left today')).toBeVisible();

  await buyer.context.setOffline(true);
  await send(owner.page, 'While you were away: fresh roast');
  await buyer.page.getByRole('textbox', { name: 'Message' }).fill('Written offline');
  await buyer.page.getByRole('button', { name: 'Send message' }).click();
  await expect(bubble(buyer.page, 'Written offline').locator('[data-tick]')).toHaveAttribute('data-tick', 'sending');

  await buyer.context.setOffline(false);
  await expect(bubble(buyer.page, 'While you were away: fresh roast')).toBeVisible({ timeout: 30_000 });
  await expect(bubble(owner.page, 'Written offline')).toBeVisible({ timeout: 30_000 });
});
