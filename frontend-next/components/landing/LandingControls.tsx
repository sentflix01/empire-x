'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Languages, Moon, Sun } from 'lucide-react';
import { toggleLanguage } from '@/lib/i18n';

export function LandingPreferences() {
  const { resolvedTheme, setTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <div className="flex items-center gap-1.5" aria-label={String(t('landing.preferences'))}>
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        aria-label={`${t('landing.theme')}: ${mounted ? (isDark ? t('landing.dark') : t('landing.light')) : t('landing.theme')}`}
        title={String(t('landing.theme'))}
        className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="hidden sm:inline">{mounted ? (isDark ? t('landing.dark') : t('landing.light')) : t('landing.theme')}</span>
      </button>
      <button
        type="button"
        onClick={toggleLanguage}
        aria-label={String(t('landing.changeLanguage'))}
        title={String(t('landing.changeLanguage'))}
        className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Languages className="h-4 w-4" />
        <span>{i18n.language === 'am' ? 'አማ' : 'EN'}</span>
      </button>
    </div>
  );
}
