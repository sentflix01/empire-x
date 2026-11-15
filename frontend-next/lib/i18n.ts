/**
 * i18n.ts — Internationalization setup (English + Amharic + Swahili + French)
 *
 * Usage in any component:
 *   import { useTranslation } from 'react-i18next';
 *   const { t, i18n } = useTranslation();
 *   t('nav.home')              // "Home" / "መነሻ" / "Nyumbani" / "Accueil"
 *   i18n.changeLanguage('am')  // switch to Amharic
 *
 * Swahili (sw) and French (fr) are stub translations — missing keys fall back
 * to English automatically via fallbackLng. Replace stub values with full
 * translations before marketing to those markets.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '@/locales/en.json';

// Only English (the fallback) ships with every page; the other languages are
// fetched when someone picks them (new-user audit NU-12: all four files were
// in every visitor's first download).
const LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  am: () => import('@/locales/am.json'),
  sw: () => import('@/locales/sw.json'),
  fr: () => import('@/locales/fr.json'),
};

// Guard: localStorage is not available during SSR
const savedLang =
  typeof window !== 'undefined'
    ? localStorage.getItem('empire_lang') || 'en'
    : 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    partialBundledLanguages: true,
    fallbackLng: 'en',
    lng: savedLang,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'empire_lang',
    },
  });

// Keep <html lang> in step with the chosen language, so screen readers read the
// page in the right language (WCAG 3.1.1).
if (typeof document !== 'undefined') {
  const syncLang = (lng: string) => { document.documentElement.lang = (lng || 'en').split('-')[0]; };
  i18n.on('languageChanged', syncLang);
  if (i18n.language) syncLang(i18n.language);
}

/** Loads a language's words if needed, then shows them. Resolves when they are on screen. */
export async function ensureLanguage(lng: string): Promise<void> {
  const base = (lng || 'en').split('-')[0];
  const load = LOADERS[base];
  if (!load || i18n.hasResourceBundle(base, 'translation')) return;
  const mod = await load();
  i18n.addResourceBundle(base, 'translation', mod.default ?? mod, true, true);
  // Re-render with the new words if this is still the chosen language.
  if ((i18n.language || '').split('-')[0] === base) await i18n.changeLanguage(i18n.language);
}
i18n.on('languageChanged', (lng) => { void ensureLanguage(lng); });
if (i18n.language) void ensureLanguage(i18n.language);

export default i18n;

export const getCurrentLang = () => i18n.language;

/** Supported languages for the language switcher. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'am', label: 'አማ', name: 'አማርኛ' },
  { code: 'sw', label: 'SW', name: 'Kiswahili' },
  { code: 'fr', label: 'FR', name: 'Français' },
] as const;

export const toggleLanguage = () => {
  const next = i18n.language === 'en' ? 'am' : 'en';
  i18n.changeLanguage(next);
  if (typeof window !== 'undefined') {
    localStorage.setItem('empire_lang', next);
  }
};
