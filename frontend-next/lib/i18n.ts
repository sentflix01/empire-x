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
import am from '@/locales/am.json';
import sw from '@/locales/sw.json';
import fr from '@/locales/fr.json';

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
      am: { translation: am },
      sw: { translation: sw },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    lng: savedLang,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'empire_lang',
    },
  });

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
