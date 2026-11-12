import { test, expect } from '@playwright/test';

/**
 * Content-Security-Policy (audit F-016): pages get a fresh script nonce on
 * every request, script-src has no 'unsafe-inline', the app runs without
 * CSP violations, and injected inline script does not run.
 */
const scriptSrc = (csp: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '';

test('script-src uses a fresh nonce per request and no unsafe-inline', async ({ request }) => {
  const a = (await request.get('/landing')).headers()['content-security-policy'] ?? '';
  const b = (await request.get('/landing')).headers()['content-security-policy'] ?? '';
  const nonceA = /'nonce-([^']+)'/.exec(scriptSrc(a))?.[1];
  const nonceB = /'nonce-([^']+)'/.exec(scriptSrc(b))?.[1];
  expect(nonceA).toBeTruthy();
  expect(nonceA).not.toBe(nonceB);
  expect(scriptSrc(a)).toContain("'strict-dynamic'");
  expect(scriptSrc(a)).not.toContain("'unsafe-inline'");
  expect(a).toContain("object-src 'none'");
  expect(a).toContain("frame-ancestors 'none'");
});

test('the framework banner header is not sent', async ({ request }) => {
  expect((await request.get('/landing')).headers()['x-powered-by']).toBeUndefined();
});

for (const path of ['/landing', '/login', '/feed', '/marketplace', '/nearby']) {
  test(`${path} runs without CSP violations`, async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => { if (/Content Security Policy/.test(m.text())) violations.push(m.text()); });
    await page.goto(path, { waitUntil: 'networkidle' });
    expect(violations).toEqual([]);
  });
}

// Injected markup (as in F-057) runs code through event handlers or
// javascript: URLs; <script> inside innerHTML never runs anyway. With
// 'strict-dynamic', scripts created by code that already runs are trusted by
// design (Next.js loads route chunks that way), so this checks markup only.
test('injected event handlers and javascript: links do not run', async ({ page }) => {
  await page.goto('/marketplace', { waitUntil: 'networkidle' });
  const ran = await page.evaluate(async () => {
    const w = window as unknown as { __injected?: string };
    const box = document.createElement('div');
    box.innerHTML = '<img src="data:," onerror="window.__injected = \'handler\'"><a id="csp-js-link" href="javascript:window.__injected=\'link\'">x</a>';
    document.body.appendChild(box);
    (document.getElementById('csp-js-link') as HTMLAnchorElement).click();
    await new Promise((r) => setTimeout(r, 300));
    return w.__injected ?? null;
  });
  expect(ran).toBeNull();
});
