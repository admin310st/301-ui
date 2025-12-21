/**
 * Smart dropdown positioning
 * Automatically flips dropdown menu upward when near bottom of viewport
 */

/**
 * Adjust dropdown position based on available space
 * Adds `.dropdown__menu--up` class if menu would overflow bottom of viewport
 */
export function adjustDropdownPosition(dropdown: Element): void {
  const menu = dropdown.querySelector('.dropdown__menu');
  if (!menu) return;

  // Reset position class before measuring
  menu.classList.remove('dropdown__menu--up');

  // Get menu position and dimensions
  const menuRect = menu.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - menuRect.bottom;
  const spaceAbove = menuRect.top;

  // If menu overflows bottom and there's more space above, flip it up
  if (spaceBelow < 0 && spaceAbove > Math.abs(spaceBelow)) {
    menu.classList.add('dropdown__menu--up');
  }
}

/**
 * Initialize dropdown toggle behavior with smart positioning
 * Call this on container elements that have dropdowns
 */
export function initDropdowns(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest('.dropdown__trigger');
    if (!trigger) {
      // Close all dropdowns when clicking outside
      closeAllDropdowns(container);
      return;
    }

    e.stopPropagation();
    const dropdown = trigger.closest('.dropdown, [data-dropdown]');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('dropdown--open');

    // Close all other dropdowns
    closeAllDropdowns(container, dropdown);

    // Toggle current dropdown
    if (isOpen) {
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      dropdown.classList.add('dropdown--open');
      trigger.setAttribute('aria-expanded', 'true');

      // Adjust position after opening
      requestAnimationFrame(() => {
        adjustDropdownPosition(dropdown);
      });
    }
  });

  // Close dropdowns when clicking outside container
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target as Node)) {
      closeAllDropdowns(container);
    }
  });
}

/**
 * Close all open dropdowns within a container
 * @param except - Optional dropdown to exclude from closing
 */
function closeAllDropdowns(container: HTMLElement, except?: Element): void {
  const selector = '.dropdown--open, [data-dropdown].dropdown--open';
  container.querySelectorAll(selector).forEach((dropdown) => {
    if (dropdown === except) return;

    dropdown.classList.remove('dropdown--open');
    const menu = dropdown.querySelector('.dropdown__menu');
    if (menu) menu.classList.remove('dropdown__menu--up');

    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}
