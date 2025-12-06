export const qs = <T extends Element>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector(selector) as T | null;

export const qsa = <T extends Element>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll(selector)) as T[];

type FormState = 'idle' | 'pending' | 'error' | 'success';

export function setFormState(form: HTMLFormElement, state: FormState, message?: string): void {
  form.dataset.state = state;
  const status = qs<HTMLElement>('[data-form-status], [data-status]', form);
  if (status) {
    status.hidden = false;
    status.dataset.type = state;
    if (message !== undefined) status.textContent = message;
  }

  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) {
    if (!submit.dataset.labelReady) submit.dataset.labelReady = submit.textContent ?? '';
    submit.disabled = state === 'pending';
    submit.textContent =
      state === 'pending' ? submit.dataset.labelLoading || t('common.pleaseWait') : submit.dataset.labelReady;
  }
}

export function toggle(element: HTMLElement | null, show: boolean): void {
  if (!element) return;
  element.hidden = !show;
  element.toggleAttribute('aria-hidden', !show);
}
import { t } from '@i18n';
