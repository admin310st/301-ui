import type { NoticeType } from './globalNotice';
import { hideGlobalNotice, showGlobalNotice } from './globalNotice';

export function showGlobalMessage(type: NoticeType, text: string): void {
  showGlobalNotice(type, text);
}

export function clearGlobalMessage(): void {
  hideGlobalNotice();
}

export function showInlineError(target: HTMLElement | null, message: string): void {
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  target.dataset.type = 'error';
}
