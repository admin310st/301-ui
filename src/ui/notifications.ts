import { qs } from './dom';

type MessageType = 'success' | 'error';

export function showGlobalMessage(type: MessageType, text: string): void {
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

export function showFieldError(input: HTMLInputElement | null, message: string): void {
  if (!input) return;
  input.setCustomValidity(message);
  input.reportValidity();
}
