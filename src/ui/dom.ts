export const qs = <T extends Element>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector(selector) as T | null;

export const qsa = <T extends Element>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll(selector)) as T[];

export type FormState = 'idle' | 'loading' | 'error' | 'success';

export function setElementText(el: Element | null, text?: string): void {
  if (!el) return;
  el.textContent = text ?? '';
}

export function setFormState(form: HTMLFormElement, state: FormState, msg?: string): void {
  form.dataset.state = state;
  const statusEl = qs<HTMLElement>('[data-status]', form);
  if (statusEl) {
    statusEl.hidden = !msg;
    statusEl.dataset.type = state;
    statusEl.textContent = msg ?? '';
  }

  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (submit) {
    const readyLabel = submit.dataset.labelReady || submit.textContent || '';
    if (!submit.dataset.labelReady) submit.dataset.labelReady = readyLabel;
    submit.disabled = state === 'loading';
    if (state === 'loading') {
      submit.textContent = submit.dataset.labelLoading || 'Loading...';
    } else {
      submit.textContent = submit.dataset.labelReady || readyLabel;
    }
  }
}

export function toggleVisibility(selector: string, show: boolean): void {
  qsa<HTMLElement>(selector).forEach((el) => {
    el.hidden = !show;
    el.toggleAttribute('aria-hidden', !show);
  });
}
