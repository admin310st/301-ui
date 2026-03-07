/**
 * Tabs component
 * Handles both legacy tabs__* markup and modern data-tabs markup.
 */

function initLegacyTabs(container: HTMLElement): void {
  const tabTriggers = container.querySelectorAll<HTMLButtonElement>('[data-tab-trigger]');

  tabTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const tabId = trigger.dataset.tabTrigger;
      if (!tabId) return;

      let tabsContainer = trigger.closest('.tabs');
      if (!tabsContainer) {
        const drawer = trigger.closest('[data-drawer]');
        tabsContainer = drawer?.querySelector('.tabs') || container.querySelector('.tabs');
      }
      if (!tabsContainer) return;

      tabsContainer.querySelectorAll('.tabs__trigger').forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });

      tabsContainer.querySelectorAll('.tabs__panel').forEach((p) => {
        p.classList.remove('is-active');
      });

      trigger.classList.add('is-active');
      trigger.setAttribute('aria-selected', 'true');

      const panel = tabsContainer.querySelector<HTMLElement>(`[data-tab-panel="${tabId}"]`);
      if (panel) {
        panel.classList.add('is-active');
      }

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

function initModernTabs(container: HTMLElement): void {
  const tabSets = container.querySelectorAll<HTMLElement>('[data-tabs]');

  tabSets.forEach((tabSet) => {
    const tabs = Array.from(tabSet.querySelectorAll<HTMLButtonElement>('[data-tab]'));
    if (tabs.length === 0) return;

    const activateTab = (tab: HTMLButtonElement) => {
      const tabId = tab.dataset.tab;
      if (!tabId) return;

      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-selected', String(isActive));
        item.tabIndex = isActive ? 0 : -1;
      });

      const scope = tabSet.parentElement ?? container;
      const panels = Array.from(scope.querySelectorAll<HTMLElement>('[data-tab-panel]'));
      panels.forEach((panel) => {
        const isActive = panel.dataset.tabPanel === tabId;
        panel.hidden = !isActive;
        panel.classList.toggle('is-active', isActive);
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex = index;

        if (event.key === 'ArrowLeft') {
          nextIndex = index > 0 ? index - 1 : tabs.length - 1;
        } else if (event.key === 'ArrowRight') {
          nextIndex = index < tabs.length - 1 ? index + 1 : 0;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = tabs.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        tabs[nextIndex]?.focus();
        activateTab(tabs[nextIndex]!);
      });
    });

    const initialTab = tabs.find((tab) => tab.classList.contains('is-active')) ?? tabs[0];
    if (initialTab) activateTab(initialTab);
  });
}

export function initTabs(container: HTMLElement = document.body): void {
  initLegacyTabs(container);
  initModernTabs(container);
}
