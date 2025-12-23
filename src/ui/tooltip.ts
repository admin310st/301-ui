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
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.zIndex = '9999';
    tooltipElement.style.pointerEvents = 'none';
    document.body.appendChild(tooltipElement);
  }
  return tooltipElement;
}

/**
 * Show tooltip at target element
 */
function showTooltip(target: HTMLElement, content: string) {
  const tooltip = getTooltipElement();
  tooltip.innerHTML = content;
  tooltip.hidden = false;

  // Position tooltip
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Default: below the target, centered
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.bottom + 8;

  // Adjust if goes off screen
  if (left + tooltipRect.width > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width - 8;
  }
  if (left < 8) {
    left = 8;
  }

  // If no space below, show above
  if (top + tooltipRect.height > window.innerHeight) {
    top = rect.top - tooltipRect.height - 8;
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
 * Initialize tooltips for all elements with [data-tooltip]
 */
export function initTooltips(): void {
  document.addEventListener('mouseenter', (e) => {
    const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement;
    if (!target) return;

    const content = target.getAttribute('data-tooltip-content');
    if (!content) return;

    showTooltip(target, content);
  }, true);

  document.addEventListener('mouseleave', (e) => {
    const target = (e.target as HTMLElement).closest('[data-tooltip]');
    if (!target) return;

    hideTooltip();
  }, true);
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
