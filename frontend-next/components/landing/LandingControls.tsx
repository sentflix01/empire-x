'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Languages, Loader2, Moon, Sun } from 'lucide-react';
import { auth } from '@/api/auth';
import { toggleLanguage } from '@/lib/i18n';

export function LandingPreferences() {
  const { resolvedTheme, setTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Keep the first server render stable while next-themes reads persisted state.
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

export function DemoEntryButton({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const enterDemo = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await auth.loginDemo();
      window.location.assign('/feed');
    } catch (requestError: unknown) {
      const failure = requestError as {
        error?: string;
        message?: string;
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        failure?.response?.data?.error || failure?.response?.data?.message ||
        failure?.error || String(t('landing.demoUnavailable')),
      );
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={enterDemo}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-7 text-sm font-extrabold text-white shadow-lg shadow-amber-950/30 transition hover:from-amber-400 hover:to-amber-500 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? t('landing.openingDemo') : t('landing.tryDemo')}
      </button>
      {error && <p role="alert" className="mt-2 max-w-sm text-left text-sm text-rose-200">{error}</p>}
    </div>
  );
}
