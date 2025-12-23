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
 * - `.dropdown__menu--fixed` if no space anywhere (switches to bottom sheet mode)
 */
export function adjustDropdownPosition(dropdown: Element): void {
  const menu = dropdown.querySelector('.dropdown__menu') as HTMLElement;
  if (!menu) return;

  // Reset position classes before measuring
  menu.classList.remove('dropdown__menu--up', 'dropdown__menu--right', 'dropdown__menu--fixed');

  // Get menu and trigger positions
  const menuRect = menu.getBoundingClientRect();
  const triggerRect = dropdown.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Safety buffer to prevent menus from touching viewport edges (especially on mobile)
  const BUFFER = 16;
  // Minimum vertical space required to open dropdown normally (menu height estimate)
  const MIN_SPACE_REQUIRED = 150;

  // Calculate available vertical space
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;

  // Check if there's enough space in either direction for normal dropdown
  const hasSpaceBelow = spaceBelow >= MIN_SPACE_REQUIRED;
  const hasSpaceAbove = spaceAbove >= MIN_SPACE_REQUIRED;

  // If no space anywhere - switch to fixed positioning (bottom sheet mode)
  // This creates space by overlaying the entire viewport
  if (!hasSpaceBelow && !hasSpaceAbove) {
    menu.classList.add('dropdown__menu--fixed');
    return; // Fixed mode handles positioning itself via CSS
  }

  // Normal positioning logic (when space is available)
  // Strategy: prefer opening upward when in lower portion of viewport to avoid scrollbars
  // If trigger is in bottom half AND there's reasonable space above, open upward
  const isInBottomHalf = triggerRect.bottom > viewportHeight / 2;

  if (isInBottomHalf && spaceAbove >= 150) {
    menu.classList.add('dropdown__menu--up');
  } else if (spaceBelow < 200 && spaceAbove >= 150) {
    // Fallback: if very little space below, force upward
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
