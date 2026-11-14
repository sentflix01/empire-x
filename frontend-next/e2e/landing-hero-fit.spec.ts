import { test, expect, devices, type Browser, type Page } from '@playwright/test';

/**
 * Landing hero on every device (owner, 2026-11-14: "make sure everything works on
 * all devices, no guesswork"). For each device profile, in light and dark and in
 * English and Amharic, with the page-guide flag ON (as on production), it checks:
 *   1. the hero is never taller than the screen (100% of the viewport height);
 *   2. every visible hero element is fully inside the hero and the screen, and no
 *      text is clipped;
 *   3. the header controls are fully on screen and do not overlap;
 *   4. there is no sideways scroll;
 *   5. on a first visit nothing covers the buttons: "Start free" goes to
 *      /register, the theme toggle changes the hero, the language button changes
 *      the headline;
 *   6. the globe turns (its view longitude changes) and then rests; with reduced
 *      motion it never turns;
 *   7. axe (WCAG 2.2 AA) finds no contrast, name or target-size problems in the
 *      header and hero.
 * Runs in the chromium project, and in landing-webkit (Safari's engine, used by
 * every iPhone browser) where WebKit is installed (CI).
 */
// Playwright compiles specs as CommonJS, so require is available.
const AXE = require.resolve('axe-core/axe.min.js');

const PROFILES: Record<string, Parameters<Browser['newContext']>[0]> = {
  'Small phone 320×568': { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  'iPhone SE': devices['iPhone SE'],
  'iPhone 14': devices['iPhone 14'],
  'iPhone 15 Pro Max': devices['iPhone 15 Pro Max'],
  'Pixel 7': devices['Pixel 7'],
  'Galaxy S9+': devices['Galaxy S9+'],
  'iPhone 14 landscape': devices['iPhone 14 landscape'],
  'iPad Mini': devices['iPad Mini'],
  'iPad Pro 11 landscape': devices['iPad Pro 11 landscape'],
  'Laptop 1280×720': { viewport: { width: 1280, height: 720 } },
  'Laptop 1366×768': { viewport: { width: 1366, height: 768 } },
  'Laptop 1440×900': { viewport: { width: 1440, height: 900 } },
  'Laptop 1536×864': { viewport: { width: 1536, height: 864 } },
  'Desktop 1920×1080': { viewport: { width: 1920, height: 1080 } },
  'Desktop 2560×1440': { viewport: { width: 2560, height: 1440 } },
};

/** Device profile options without the engine choice (the project picks the engine). */
function contextOptions(profile: Parameters<Browser['newContext']>[0], extra: Parameters<Browser['newContext']>[0] = {}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...rest } = (profile ?? {}) as Record<string, unknown> & { defaultBrowserType?: string };
  // A fresh visitor: no tours marked as seen, no saved theme or language.
  return { ...rest, storageState: { cookies: [], origins: [] }, ...extra } as Parameters<Browser['newContext']>[0];
}

async function openLanding(page: Page, theme: 'light' | 'dark') {
  // As on production: the guide flag is on. The landing page must still not be covered.
  await page.route('**/api/flags/page-guided-tours', (route) => route.fulfill({ json: { name: 'page_guided_tours', enabled_for_user: true } }));
  await page.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* private mode */ } }, theme);
  await page.goto('/landing', { waitUntil: 'networkidle' });
  // The splash shows once per session and leaves within a second.
  await expect(page.locator('[role="status"][aria-label="Loading Nodbusiness"]')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

/** Layout facts measured in the page: what the checks below assert on. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const box = (el: Element | null) => {
      if (!el) return null;
      const s = getComputedStyle(el as HTMLElement);
      const r = el.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || r.width === 0 || r.height === 0) return null;
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const hero = document.querySelector('[data-testid="landing-hero"]')!;
    const heroBox = box(hero)!;
    const named: Record<string, Element | null> = {
      logo: hero.querySelector('[data-testid="globe-logo"]'),
      headline: hero.querySelector('h1'),
      lead: hero.querySelector('h1 + p'),
      startFree: hero.querySelector('[data-testid="hero-start"]'),
      tryDemo: [...hero.querySelectorAll('button')].find((b) => /try demo/i.test(b.textContent ?? '') || /ዲሞ/.test(b.textContent ?? '')) ?? null,
      guest: hero.querySelector('[data-page-guide="landing-guest"]'),
      media: hero.querySelector('[data-testid="hero-media"]'),
    };
    const items = Object.fromEntries(Object.entries(named).map(([k, el]) => [k, box(el)]));
    const clipped = [...hero.querySelectorAll('h1, h1 + p, a, button')]
      .filter((el) => box(el))
      .filter((el) => (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 1)
      .map((el) => (el.textContent ?? '').trim().slice(0, 40));
    const nav = document.querySelector('nav[data-page-guide="landing-nav"]')!;
    const controls = [...nav.querySelectorAll('a, button')].map((el) => ({ name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), box: box(el) })).filter((c) => c.box);
    // Contrast of each hero text against every colour of the hero gradient (axe cannot
    // measure text on gradients and reports them as "incomplete").
    // Any CSS colour (rgb, oklab, color(srgb …)) to [r, g, b, a] through a 1×1 canvas.
    const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const rgb = (c: string) => {
      pixel.clearRect(0, 0, 1, 1);
      pixel.fillStyle = '#000'; pixel.fillStyle = c; pixel.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const lum = ([r, g, b]: number[]) => [r, g, b].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
    const stops = (getComputedStyle(hero).backgroundImage.match(/(?:rgba?|oklab|oklch|color)\([^)]+\)/g) ?? []).map(rgb);
    const textEls: [string, Element | null][] = [
      ['headline', hero.querySelector('h1')], ['lead', hero.querySelector('h1 + p')],
      ['tryDemo', hero.querySelector('[data-page-guide="landing-demo-btn"]')], ['guest', hero.querySelector('[data-page-guide="landing-guest"]')],
    ];
    const contrast = textEls.filter(([, el]) => box(el)).map(([key, el]) => {
      const [r, g, b, a] = rgb(getComputedStyle(el!).color);
      const worst = Math.min(...stops.map((bg) => {
        const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
        const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
      }));
      const large = parseFloat(getComputedStyle(el!).fontSize) >= 24;
      return { key, worst: Math.round(worst * 100) / 100, needed: large ? 3 : 4.5 };
    });
    return {
      vw, vh, hero: heroBox, items, clipped, controls, contrast, stops: stops.length,
      scrollWidth: document.documentElement.scrollWidth,
      heroBackground: getComputedStyle(hero).backgroundImage,
      headlineColor: getComputedStyle(hero.querySelector('h1')!).color,
      headlineText: hero.querySelector('h1')!.textContent,
    };
  });
}

type Facts = Awaited<ReturnType<typeof measure>>;

function assertFits(f: Facts, where: string) {
  // 1. Never taller than the screen.
  expect(f.hero.height, `${where}: hero height ${f.hero.height} vs screen ${f.vh}`).toBeLessThanOrEqual(f.vh + 1);
  expect(f.hero.bottom, `${where}: hero bottom`).toBeLessThanOrEqual(f.vh + 1);
  // 2. Everything that should be in the hero is there and fully inside it and the screen.
  for (const key of ['logo', 'headline', 'startFree', 'tryDemo', 'guest']) expect(f.items[key], `${where}: ${key} is shown`).not.toBeNull();
  if (f.vw >= 1024) expect(f.items.media, `${where}: phone video in the hero on desktop`).not.toBeNull();
  else expect(f.items.media, `${where}: phone video below the hero on phones and tablets`).toBeNull();
  for (const [key, b] of Object.entries(f.items)) {
    if (!b) continue;
    expect(b.top, `${where}: ${key} top inside hero`).toBeGreaterThanOrEqual(f.hero.top - 1);
    expect(b.bottom, `${where}: ${key} bottom inside hero`).toBeLessThanOrEqual(f.hero.bottom + 1);
    expect(b.left, `${where}: ${key} left on screen`).toBeGreaterThanOrEqual(-1);
    expect(b.right, `${where}: ${key} right on screen`).toBeLessThanOrEqual(f.vw + 1);
  }
  expect(f.clipped, `${where}: clipped text`).toEqual([]);
  // 3. Header controls fully on screen, not overlapping.
  for (const c of f.controls) {
    expect(c.box!.left, `${where}: header "${c.name}" left`).toBeGreaterThanOrEqual(-1);
    expect(c.box!.right, `${where}: header "${c.name}" right`).toBeLessThanOrEqual(f.vw + 1);
  }
  for (let i = 0; i < f.controls.length; i++) {
    for (let j = i + 1; j < f.controls.length; j++) {
      const a = f.controls[i].box!, b = f.controls[j].box!;
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      expect(overlap, `${where}: header "${f.controls[i].name}" overlaps "${f.controls[j].name}"`).toBe(false);
    }
  }
  // 4. No sideways scroll.
  expect(f.scrollWidth, `${where}: sideways scroll`).toBeLessThanOrEqual(f.vw);
  // 5. Text contrast against every colour of the hero background (WCAG 1.4.3).
  expect(f.stops, `${where}: hero gradient colours found`).toBeGreaterThanOrEqual(3);
  for (const c of f.contrast) expect(c.worst, `${where}: ${c.key} contrast`).toBeGreaterThanOrEqual(c.needed);
}

/** The element at a button's centre is the button itself (nothing covers it). */
async function notCovered(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  }, selector);
}

for (const [name, profile] of Object.entries(PROFILES)) {
  test(`landing hero on ${name}: fits one screen, works in both themes and languages`, async ({ browser }, testInfo) => {
    test.setTimeout(90_000);
    for (const theme of ['light', 'dark'] as const) {
      const context = await browser.newContext(contextOptions(profile));
      const page = await context.newPage();
      await openLanding(page, theme);

      // Nothing covers the page on a first visit, even with the guide flag on.
      await expect(page.getByTestId('page-guide-backdrop')).toHaveCount(0);
      // Every hero and header control: nothing on top of it (no guide backdrop, no
      // floating button, no notice).
      await page.waitForTimeout(1200); // let deferred widgets (assistant, guide launcher) mount
      for (const sel of [
        '[data-testid="hero-start"]',
        '[data-testid="landing-hero"] [data-page-guide="landing-demo-btn"]',
        '[data-page-guide="landing-guest"]',
        '[data-testid="landing-theme-toggle"]',
        '[data-testid="landing-language-toggle"]',
        '[data-page-guide="landing-signin"]',
      ]) {
        expect(await notCovered(page, sel), `${name} ${theme}: ${sel} is not covered`).toBe(true);
      }

      const en = await measure(page);
      assertFits(en, `${name} ${theme} EN`);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-en.png`.replace(/[^\w.-]+/g, '_')) });

      // Amharic: the language really switches (page language and button label) and the
      // hero still fits. (The hero words themselves are not translated yet: F-062.)
      const language = page.getByTestId('landing-language-toggle');
      await expect(language).toHaveText('EN');
      await language.click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'am');
      await expect(language).toHaveText('አማ');
      assertFits(await measure(page), `${name} ${theme} AM`);
      await language.click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(language).toHaveText('EN');

      // The theme toggle visibly changes the hero.
      await page.getByTestId('landing-theme-toggle').click();
      const other = theme === 'light' ? 'dark' : 'light';
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${other}\\b`));
      const toggled = await measure(page);
      expect(toggled.heroBackground, `${name}: hero background follows the theme`).not.toBe(en.heroBackground);
      expect(toggled.headlineColor, `${name}: headline colour follows the theme`).not.toBe(en.headlineColor);
      await page.getByTestId('landing-theme-toggle').click();
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));

      // Accessibility of the header and hero in this theme.
      await page.addScriptTag({ path: AXE });
      const violations = await page.evaluate(async () => {
        // @ts-expect-error axe is injected above
        const result = await window.axe.run(['header', '[data-testid="landing-hero"]'], {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        });
        return result.violations.map((v: { id: string; nodes: { target: string[] }[] }) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      });
      expect(violations, `${name} ${theme}: axe`).toEqual([]);

      // "Start free" in the hero opens sign-up.
      await page.getByTestId('hero-start').click();
      await expect(page).toHaveURL(/\/register$/);
      await context.close();
    }
  });
}

test('the globe turns 720° on load, then rests; hover turns it again', async ({ browser }) => {
  const context = await browser.newContext(contextOptions({ viewport: { width: 1366, height: 768 } }));
  const page = await context.newPage();
  await openLanding(page, 'light');
  const logo = page.getByTestId('globe-logo');
  const lon = async () => Number(await logo.getAttribute('data-lon'));
  const seen = new Set<number>();
  for (let i = 0; i < 6; i++) { seen.add(Math.round(await lon())); await page.waitForTimeout(250); }
  expect(seen.size, 'the view longitude changes while it turns').toBeGreaterThan(2);
  await expect(logo).toHaveAttribute('data-spinning', 'false', { timeout: 6000 });
  expect(await lon()).toBe(-20);
  await logo.hover();
  await expect(logo).toHaveAttribute('data-spinning', 'true');
  await expect(logo).toHaveAttribute('data-spinning', 'false', { timeout: 6000 });
  await context.close();
});

test('with reduced motion the globe never turns', async ({ browser }) => {
  const context = await browser.newContext(contextOptions({ viewport: { width: 390, height: 664 } }, { reducedMotion: 'reduce' }));
  const page = await context.newPage();
  await openLanding(page, 'dark');
  const logo = page.getByTestId('globe-logo');
  for (let i = 0; i < 4; i++) {
    await expect(logo).toHaveAttribute('data-spinning', 'false');
    await expect(logo).toHaveAttribute('data-lon', '-20');
    await page.waitForTimeout(300);
  }
  await logo.click();
  await expect(logo).toHaveAttribute('data-spinning', 'false');
  await context.close();
});

test('the page guide can be opened on request and closed by clicking outside it', async ({ browser }) => {
  const context = await browser.newContext(contextOptions({ viewport: { width: 1366, height: 768 } }));
  const page = await context.newPage();
  await openLanding(page, 'light');
  await page.evaluate(() => window.dispatchEvent(new Event('nodbusiness:open-page-guide')));
  const backdrop = page.getByTestId('page-guide-backdrop');
  await expect(backdrop).toHaveCount(1);
  await backdrop.click({ position: { x: 5, y: 300 } });
  await expect(backdrop).toHaveCount(0);
  expect(await notCovered(page, '[data-testid="hero-start"]')).toBe(true);
  await context.close();
});

test('the floating guide and assistant buttons stay out of the hero and appear below it', async ({ browser }) => {
  for (const profile of [devices['Galaxy S9+'], devices['iPhone SE'], { viewport: { width: 1366, height: 768 } }]) {
    const context = await browser.newContext(contextOptions(profile));
    const page = await context.newPage();
    await openLanding(page, 'light');
    await page.waitForTimeout(1200);
    // The two floating, draggable buttons (Page guide and AI assistant). The guide's own
    // screen-reader button stays available everywhere and covers nothing.
    const floating = page.locator('button[title$="(drag to move)"]');
    await expect(floating).toHaveCount(0);
    await expect(page.locator('button.sr-only[aria-label="Page guide"]')).toHaveCount(1);
    // Past the hero, both are there to use.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect(floating).toHaveCount(2);
    await expect(floating.first()).toBeVisible();
    await expect(floating.last()).toBeVisible();
    // Back at the top they step aside again.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(floating).toHaveCount(0);
    await context.close();
  }
});
