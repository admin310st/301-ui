import { qs } from './dom';

type MessageKind = 'success' | 'error' | 'info';

export function showGlobalMessage(type: MessageKind, text: string): void {
  const box = qs<HTMLElement>('[data-global-message]');
  if (!box) return;
  box.hidden = false;
  box.dataset.type = type;
  box.textContent = text;
}

export function clearGlobalMessage(): void {
  const box = qs<HTMLElement>('[data-global-message]');
  if (!box) return;
  box.hidden = true;
  box.textContent = '';
  delete box.dataset.type;
}

export function showInlineError(target: HTMLElement | null, message: string): void {
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  target.dataset.type = 'error';
}
