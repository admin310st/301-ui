import type { NoticeType } from './notice';
import { hideNotice, showNotice } from './notice';

export function showGlobalMessage(type: NoticeType, text: string): void {
  showNotice(type, text);
}

export function clearGlobalMessage(): void {
  hideNotice();
}

export function showInlineError(target: HTMLElement | null, message: string): void {
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  target.dataset.type = 'error';
}
