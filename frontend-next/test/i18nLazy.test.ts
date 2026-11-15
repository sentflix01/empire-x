/**
 * Only English ships with every page; other languages load when chosen
 * (new-user audit NU-12).
 */
import { describe, it, expect, afterAll } from 'vitest';
import i18n, { ensureLanguage } from '@/lib/i18n';
import fr from '@/locales/fr.json';

describe('languages load on demand', () => {
  afterAll(async () => { await i18n.changeLanguage('en'); });

  it('starts with English only and loads French when it is picked', async () => {
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(false);
    await i18n.changeLanguage('fr');
    await ensureLanguage('fr');
    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(true);
    expect(i18n.t('auth.logout')).toBe((fr as { auth: { logout: string } }).auth.logout);
  });

  it('does not ship the other languages in the module itself', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/i18n.ts'), 'utf8');
    expect(src).not.toMatch(/^import \w+ from '@\/locales\/(am|fr|sw)\.json'/m);
  });
});
