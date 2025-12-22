import { en } from './locales/en';
import { ru } from './locales/ru';

export type Locale = 'en' | 'ru';
export type Translation = typeof en;

const locales: Record<Locale, Translation> = { en, ru };
let currentLocale: Locale = 'en';

function resolveNavigatorLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const candidate = navigator.language?.toLowerCase() || navigator.languages?.[0]?.toLowerCase();
  if (candidate?.startsWith('ru')) return 'ru';
  return 'en';
}

export function setLocale(locale: Locale): void {
  currentLocale = locales[locale] ? locale : 'en';
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('locale', currentLocale);
    if (window.document?.documentElement) {
      window.document.documentElement.lang = currentLocale;
    }
  }
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return currentLocale;
  const stored = window.localStorage.getItem('locale') as Locale | null;
  if (stored && locales[stored]) {
    currentLocale = stored;
  } else {
    currentLocale = resolveNavigatorLocale();
  }

  if (window.document?.documentElement) {
    window.document.documentElement.lang = currentLocale;
  }

  return currentLocale;
}

export function t(path: string): string {
  const locale = getLocale();
  const root = locales[locale] as any;
  return path
    .split('.')
    .reduce((acc, key) => (acc && acc[key] != null ? acc[key] : null), root) ?? path;
}

export function tWithVars(path: string, vars: Record<string, string>): string {
  let msg = t(path);
  Object.entries(vars).forEach(([key, value]) => {
    msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return msg;
}

export function getLocales() {
  return locales;
}

/**
 * Get a random tip from the current locale
 * @returns A random tip string
 */
export function getRandomTip(): string {
  const locale = getLocale();
  const tips = locales[locale].tips;
  if (!tips || tips.length === 0) return 'Welcome back!';
  const randomIndex = Math.floor(Math.random() * tips.length);
  return tips[randomIndex];
}
