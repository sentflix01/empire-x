// @ts-nocheck
/**
 * i18n.ts — Internationalization setup (English + Amharic)
 *
 * Usage in any component:
 *   import { useTranslation } from 'react-i18next';
 *   const { t, i18n } = useTranslation();
 *   t('nav.home')              // "Home" or "መነሻ"
 *   i18n.changeLanguage('am')  // switch to Amharic
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '@/locales/en.json';
import am from '@/locales/am.json';

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

export const toggleLanguage = () => {
  const next = i18n.language === 'en' ? 'am' : 'en';
  i18n.changeLanguage(next);
  if (typeof window !== 'undefined') {
    localStorage.setItem('empire_lang', next);
  }
};
