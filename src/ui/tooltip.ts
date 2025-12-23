/**
 * Custom tooltip system for rich content
 *
 * Usage:
 * 1. Add data-tooltip attribute to element
 * 2. Call initTooltips() on page load
 * 3. Tooltip content passed via data-tooltip-content
 */

let tooltipElement: HTMLElement | null = null;

/**
 * Create tooltip element (singleton)
 */
function getTooltipElement(): HTMLElement {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'tooltip';
    tooltipElement.setAttribute('role', 'tooltip');
    tooltipElement.style.position = 'fixed';
    tooltipElement.style.zIndex = '9999';
    tooltipElement.style.pointerEvents = 'none';
    document.body.appendChild(tooltipElement);
  }
  return tooltipElement;
}

/**
 * Show tooltip at target element
 * Uses same positioning logic as dropdown menus
 */
function showTooltip(target: HTMLElement, content: string) {
  const tooltip = getTooltipElement();
  tooltip.innerHTML = content;

  // Show tooltip off-screen first to measure it
  tooltip.style.left = '-9999px';
  tooltip.style.top = '-9999px';
  tooltip.hidden = false;

  // Force reflow to get accurate measurements
  tooltip.offsetHeight;

  // Now get accurate measurements
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Safety buffer to prevent tooltip from touching viewport edges
  const BUFFER = 16;
  const MIN_SPACE = 150; // Minimum space needed to open in a direction
  const SPACING = 8; // Gap between target and tooltip

  // Calculate available vertical space
  const spaceBelow = viewportHeight - targetRect.bottom;
  const spaceAbove = targetRect.top;

  // Vertical positioning logic (same as dropdown)
  // Open upward if:
  // 1. There's more space above than below
  // 2. AND there's at least minimum space above
  // 3. AND we're not in the top portion of viewport
  const isInTopPortion = targetRect.top < viewportHeight * 0.3;

  let top: number;
  if (!isInTopPortion && spaceAbove >= MIN_SPACE && spaceAbove > spaceBelow) {
    // Show above
    top = targetRect.top - tooltipRect.height - SPACING;
  } else {
    // Show below (default)
    top = targetRect.bottom + SPACING;
  }

  // Horizontal positioning - center on target, adjust if overflows
  let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

  // Adjust if goes off right edge
  if (left + tooltipRect.width > viewportWidth - BUFFER) {
    left = viewportWidth - tooltipRect.width - BUFFER;
  }

  // Adjust if goes off left edge
  if (left < BUFFER) {
    left = BUFFER;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  const tooltip = getTooltipElement();
  tooltip.hidden = true;
}

/**
 * Attach tooltip to a specific element
 */
function attachTooltip(element: HTMLElement): void {
  const content = element.getAttribute('data-tooltip-content');
  if (!content) return;

  element.addEventListener('mouseenter', () => {
    showTooltip(element, content);
  });

  element.addEventListener('mouseleave', () => {
    hideTooltip();
  });
}

/**
 * Initialize tooltips for all elements with [data-tooltip]
 * Call this after rendering new content
 */
export function initTooltips(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-tooltip]');
  elements.forEach((element) => {
    // Skip if already initialized
    if (element.hasAttribute('data-tooltip-initialized')) return;

    element.setAttribute('data-tooltip-initialized', 'true');
    attachTooltip(element);
  });
}

/**
 * Format timestamp for tooltip display
 */
export function formatTooltipTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative = '';
  if (diffMins < 1) {
    relative = 'just now';
  } else if (diffMins < 60) {
    relative = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays < 7) {
    relative = `${diffDays}d ago`;
  } else {
    relative = date.toLocaleDateString();
  }

  const absolute = date.toLocaleString();
  return `${relative} (${absolute})`;
}
