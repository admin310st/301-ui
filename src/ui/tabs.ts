/**
 * Tabs component
 * Handles tab switching with keyboard navigation support
 */

export function initTabs(container: HTMLElement = document.body): void {
  const tabTriggers = container.querySelectorAll<HTMLButtonElement>('[data-tab-trigger]');

  tabTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const tabId = trigger.dataset.tabTrigger;
      if (!tabId) return;

      // Find the tabs container
      // First try closest (for triggers inside .tabs), then check in same drawer/container (for footer buttons)
      let tabsContainer = trigger.closest('.tabs');
      if (!tabsContainer) {
        // For footer buttons, find .tabs in the same parent container
        const drawer = trigger.closest('[data-drawer]');
        tabsContainer = drawer?.querySelector('.tabs') || container.querySelector('.tabs');
      }
      if (!tabsContainer) return;

      // Deactivate all triggers and panels in this container
      tabsContainer.querySelectorAll('.tabs__trigger').forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });

      tabsContainer.querySelectorAll('.tabs__panel').forEach((p) => {
        p.classList.remove('is-active');
      });

      // Activate selected trigger and panel
      trigger.classList.add('is-active');
      trigger.setAttribute('aria-selected', 'true');

      const panel = tabsContainer.querySelector(`[data-tab-panel="${tabId}"]`);
      if (panel) {
        panel.classList.add('is-active');
      }

      // Update footer action buttons visibility
      const drawer = tabsContainer.closest('[data-drawer]');
      if (drawer) {
        const footerActions = drawer.querySelectorAll<HTMLButtonElement>('[data-footer-action]');
        footerActions.forEach((btn) => {
          if (btn.dataset.footerAction === tabId) {
            btn.removeAttribute('hidden');
          } else {
            btn.setAttribute('hidden', '');
          }
        });
      }
    });
  });

  // Keyboard navigation
  tabTriggers.forEach((trigger, index) => {
    trigger.addEventListener('keydown', (e) => {
      const triggers = Array.from(tabTriggers);
      let newIndex = index;

      if (e.key === 'ArrowLeft') {
        newIndex = index > 0 ? index - 1 : triggers.length - 1;
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        newIndex = index < triggers.length - 1 ? index + 1 : 0;
        e.preventDefault();
      } else if (e.key === 'Home') {
        newIndex = 0;
        e.preventDefault();
      } else if (e.key === 'End') {
        newIndex = triggers.length - 1;
        e.preventDefault();
      } else {
        return;
      }

      triggers[newIndex]?.focus();
      triggers[newIndex]?.click();
    });
  });
}
