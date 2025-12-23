/**
 * Smart dropdown positioning
 * Automatically adjusts dropdown menu position to prevent viewport overflow
 * - Vertical: flips upward when near bottom
 * - Horizontal: aligns left/right based on available space
 */

/**
 * Adjust dropdown position based on available space
 * Adds positioning classes to prevent overflow:
 * - `.dropdown__menu--up` if menu would overflow bottom
 * - `.dropdown__menu--right` if menu would overflow right edge
 */
export function adjustDropdownPosition(dropdown: Element): void {
  const menu = dropdown.querySelector('.dropdown__menu') as HTMLElement;
  if (!menu) return;

  // Reset position classes before measuring
  menu.classList.remove('dropdown__menu--up', 'dropdown__menu--right');

  // Get menu and trigger positions
  const menuRect = menu.getBoundingClientRect();
  const triggerRect = dropdown.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Safety buffer to prevent menus from touching viewport edges (especially on mobile)
  const BUFFER = 16;

  // Calculate available vertical space
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;

  // Vertical positioning logic
  // Strategy: open where there's more space, with bias toward avoiding scrollbars
  const MIN_SPACE = 150; // Minimum space needed to open in a direction

  // Determine positioning based on available space
  // Open upward if:
  // 1. There's more space above than below
  // 2. AND there's at least minimum space above
  // 3. AND we're not in the top portion of viewport (prevent opening up when at top)
  const isInTopPortion = triggerRect.top < viewportHeight * 0.3; // Top 30% of viewport

  if (!isInTopPortion && spaceAbove >= MIN_SPACE && spaceAbove > spaceBelow) {
    menu.classList.add('dropdown__menu--up');
  }

  // Horizontal positioning (left/right)
  const spaceRight = viewportWidth - menuRect.right;
  const spaceLeft = triggerRect.left;

  // Align right if menu would overflow right edge or get too close
  if (spaceRight < BUFFER && spaceLeft > Math.abs(spaceRight)) {
    menu.classList.add('dropdown__menu--right');
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
