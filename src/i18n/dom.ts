import type { Locale } from './index';
import { applyLocaleToDocument } from './helpers';
import { getLocale, setLocale, t } from './index';

export function applyTranslations(root: ParentNode = document): void {
  applyLocaleToDocument();

  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key) el.innerHTML = t(key);
  });

  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute('aria-label', t(key));
  });

  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.setAttribute('placeholder', t(key));
  });
}

export function initLangSwitcher(root: ParentNode = document): void {
  const current = getLocale();

  root.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
    const lang = btn.dataset.lang as Locale;
    btn.classList.toggle('is-active', lang === current);
    btn.setAttribute('aria-pressed', String(lang === current));
    btn.addEventListener('click', () => {
      setLocale(lang);
      applyLocaleToDocument();
      root
        .querySelectorAll<HTMLButtonElement>('[data-lang]')
        .forEach((b) => b.classList.toggle('is-active', b.dataset.lang === lang));
      root
        .querySelectorAll<HTMLButtonElement>('[data-lang]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
      applyTranslations(document);
    });
  });
}
