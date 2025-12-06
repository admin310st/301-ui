import { getLocale } from './index';

export function applyLocaleToDocument(): void {
  if (typeof document === 'undefined') return;
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
}
