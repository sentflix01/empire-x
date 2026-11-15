'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Languages, Moon, Sun } from 'lucide-react';
import { toggleLanguage } from '@/lib/i18n';

// Glass on the landing header, which is dark in both themes (owner, 2026-11-14).
const CONTROL = 'inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2 text-xs min-[400px]:px-2.5 font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function LandingPreferences() {
  const { resolvedTheme, setTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <div data-page-guide="landing-preferences" className="flex items-center gap-1.5" aria-label={String(t('landing.preferences'))}>
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        data-testid="landing-theme-toggle"
        aria-label={mounted
          ? `${t('landing.theme')}: ${isDark ? t('landing.dark') : t('landing.light')}. ${isDark ? t('landing.switchToLight', 'Switch to light') : t('landing.switchToDark', 'Switch to dark')}`
          : String(t('landing.theme'))}
        title={String(t('landing.theme'))}
        className={CONTROL}
      >
        {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="hidden sm:inline">{mounted ? (isDark ? t('landing.dark') : t('landing.light')) : t('landing.theme')}</span>
      </button>
      <button
        type="button"
        data-testid="landing-language-toggle"
        onClick={toggleLanguage}
        aria-label={String(t('landing.changeLanguage'))}
        title={String(t('landing.changeLanguage'))}
        className={CONTROL}
      >
        {/* Decorative; hidden below 400 px to save room. The button keeps its name and "EN" label. */}
        <Languages className="hidden h-4 w-4 min-[400px]:block" aria-hidden="true" />
        <span>{i18n.language === 'am' ? 'አማ' : 'EN'}</span>
      </button>
    </div>
  );
}
