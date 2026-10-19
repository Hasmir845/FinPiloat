import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translation bundles
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enDashboard from './locales/en/dashboard.json';
import enTransactions from './locales/en/transactions.json';
import enCashFlow from './locales/en/cashflow.json';
import enFinancing from './locales/en/financing.json';
import enCopilot from './locales/en/copilot.json';
import enLanding from './locales/en/landing.json';

// Bangla translation bundles
import bnCommon from './locales/bn/common.json';
import bnNav from './locales/bn/nav.json';
import bnDashboard from './locales/bn/dashboard.json';
import bnTransactions from './locales/bn/transactions.json';
import bnCashFlow from './locales/bn/cashflow.json';
import bnFinancing from './locales/bn/financing.json';
import bnCopilot from './locales/bn/copilot.json';
import bnLanding from './locales/bn/landing.json';

export const LANGUAGE_STORAGE_KEY = 'finpilot_language';
export const SUPPORTED_LANGUAGES = ['en', 'bn'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    dashboard: enDashboard,
    transactions: enTransactions,
    cashflow: enCashFlow,
    financing: enFinancing,
    copilot: enCopilot,
    landing: enLanding,
  },
  bn: {
    common: bnCommon,
    nav: bnNav,
    dashboard: bnDashboard,
    transactions: bnTransactions,
    cashflow: bnCashFlow,
    financing: bnFinancing,
    copilot: bnCopilot,
    landing: bnLanding,
  },
} as const;

/**
 * Resolves the initial language from localStorage or defaults to English.
 * Prevents flash of wrong language.
 */
export function getSavedLanguage(): SupportedLanguage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'bn' || saved === 'en') {
        return saved;
      }
    }
  } catch (e) {
    console.warn('[i18n] Failed to access localStorage:', e);
  }
  return 'en';
}

/**
 * Changes active language, saves to localStorage, and updates document.documentElement.lang.
 */
export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  } catch (e) {
    console.warn('[i18n] Failed to write to localStorage:', e);
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }

  await i18n.changeLanguage(lang);
}

const initialLang = getSavedLanguage();

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'nav', 'dashboard', 'transactions', 'cashflow', 'financing', 'copilot', 'landing'],
    interpolation: {
      escapeValue: false, // React already escapes values safely
    },
    react: {
      useSuspense: false, // Avoid suspense boundary issues in client components
    },
  });

export default i18n;
