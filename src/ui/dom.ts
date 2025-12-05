export const qs = <T extends Element>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector(selector) as T | null;

export const qsa = <T extends Element>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll(selector)) as T[];

type FormState = 'idle' | 'pending' | 'error' | 'success';

export function setFormState(form: HTMLFormElement, state: FormState, message?: string): void {
  form.dataset.state = state;
  const status = qs<HTMLElement>('[data-status]', form);
  if (status) {
    status.hidden = !message;
    status.dataset.type = state;
    status.textContent = message ?? '';
  }

  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) {
    if (!submit.dataset.labelReady) submit.dataset.labelReady = submit.textContent ?? '';
    submit.disabled = state === 'pending';
    submit.textContent = state === 'pending' ? submit.dataset.labelLoading || 'Please wait...' : submit.dataset.labelReady;
  }
}

export function toggle(element: HTMLElement | null, show: boolean): void {
  if (!element) return;
  element.hidden = !show;
  element.toggleAttribute('aria-hidden', !show);
}
