export function initPasswordToggles(): void {
  document.querySelectorAll<HTMLElement>('[data-password-field]').forEach((wrapper) => {
    if (wrapper.dataset.bound === 'true') return;
    wrapper.dataset.bound = 'true';

    const input = wrapper.querySelector<HTMLInputElement>('input');
    const toggle = wrapper.querySelector<HTMLButtonElement>('[data-password-toggle]');
    if (!input || !toggle) return;

    const updateState = (): void => {
      const isHidden = input.type === 'password';
      toggle.setAttribute('aria-label', isHidden ? 'Show password' : 'Hide password');
      toggle.setAttribute('aria-pressed', String(!isHidden));
      toggle.dataset.state = isHidden ? 'hidden' : 'visible';
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      input.type = input.type === 'password' ? 'text' : 'password';
      updateState();
    });

    updateState();
  });
}
