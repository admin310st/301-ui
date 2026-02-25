/**
 * TDS filter UI components
 * Manages filter chips, dropdowns, and reset button
 */

import type { FilterConfig } from '@redirects/filters-config';
import { TDS_FILTERS, type TdsActiveFilters } from './filters-config';
import { adjustDropdownPosition } from '@ui/dropdown';

/**
 * Get tooltip for filter chip
 */
function getFilterTooltip(config: FilterConfig, activeValue: string[] | undefined): string {
  const activeArray = Array.isArray(activeValue) ? activeValue : [];
  if (activeArray.length === 0) return '';
  const labels = activeArray.map(val => {
    const option = config.options.find(o => o.value === val);
    return option?.label || val;
  });
  return `${config.label}: ${labels.join(', ')}`;
}

/**
 * Render filter chip with dropdown
 */
function renderFilterChip(config: FilterConfig, activeValue: string[] | undefined): string {
  const isActive = Array.isArray(activeValue) && activeValue.length > 0;
  const tooltip = getFilterTooltip(config, activeValue);
  const titleAttr = tooltip ? ` title="${tooltip}"` : '';
  const count = Array.isArray(activeValue) ? activeValue.length : 0;
  const countBadge = count > 0 ? `<span class="badge badge--sm">${count}</span>` : '';
  const iconName = config.icon || 'mono/filter';
  const priorityAttr = config.priority ? ` data-priority="${config.priority}"` : '';

  return `
    <div class="dropdown" data-dropdown data-filter-id="${config.id}"${priorityAttr}>
      <button
        class="btn-chip btn-chip--dropdown dropdown__trigger ${isActive ? 'is-active' : ''}"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"${titleAttr}
      >
        <span class="btn-chip__icon" data-icon="${iconName}"></span>
        <span class="btn-chip__label">${config.label}</span>
        ${countBadge}
        <span class="btn-chip__chevron" data-icon="mono/chevron-down"></span>
      </button>
      <div class="dropdown__menu" role="menu">
        ${renderFilterOptions(config, activeValue)}
      </div>
    </div>
  `;
}

/**
 * Render filter options
 */
function renderFilterOptions(config: FilterConfig, activeValue: string[] | undefined): string {
  const activeArray = Array.isArray(activeValue) ? activeValue : [];
  const hasSelections = activeArray.length > 0;

  const items = config.options
    .map(opt => {
      const checked = activeArray.includes(opt.value);
      return `
        <button
          class="dropdown__item ${checked ? 'is-checked' : ''}"
          type="button"
          data-filter-value="${opt.value}"
        >
          ${checked ? '<span class="icon" data-icon="mono/check"></span>' : ''}
          <span>${opt.label}</span>
        </button>
      `;
    })
    .join('');

  const clearButton = hasSelections
    ? `
    <div class="dropdown__divider"></div>
    <button
      class="dropdown__item dropdown__item--action dropdown__item--danger"
      type="button"
      data-filter-clear
    >
      <span class="icon" data-icon="mono/close"></span>
      <span>Clear selection</span>
    </button>
  `
    : '';

  return items + clearButton;
}

/**
 * Render filter chips HTML
 */
export function renderFilterBar(activeFilters: TdsActiveFilters): string {
  return TDS_FILTERS.map(config => {
    const activeValue = activeFilters[config.id as keyof TdsActiveFilters];
    return renderFilterChip(config, activeValue);
  }).join('\n');
}

/**
 * Initialize filter UI interactions
 */
export function initFilterUI(
  container: HTMLElement,
  activeFilters: TdsActiveFilters,
  onChange: (filters: TdsActiveFilters) => void
): void {
  container.addEventListener('click', e => {
    const item = (e.target as HTMLElement).closest('.dropdown__item');
    if (!item || !item.hasAttribute('data-filter-value')) return;

    const dropdown = item.closest('[data-dropdown]');
    if (!dropdown) return;

    const filterId = dropdown.getAttribute('data-filter-id') as keyof TdsActiveFilters;
    if (!filterId) return;

    const value = item.getAttribute('data-filter-value')!;
    const current = Array.isArray(activeFilters[filterId]) ? activeFilters[filterId] as string[] : [];

    if (current.includes(value)) {
      activeFilters[filterId] = current.filter(v => v !== value);
    } else {
      activeFilters[filterId] = [...current, value];
    }

    onChange(activeFilters);
  });

  container.addEventListener('click', e => {
    const clearBtn = (e.target as HTMLElement).closest('[data-filter-clear]');
    if (!clearBtn) return;

    const dropdown = clearBtn.closest('[data-dropdown]');
    if (!dropdown) return;

    const filterId = dropdown.getAttribute('data-filter-id') as keyof TdsActiveFilters;
    if (!filterId) return;

    activeFilters[filterId] = [];
    onChange(activeFilters);
  });

  initDropdownToggles(container);
}

/**
 * Initialize dropdown toggle behavior
 */
function initDropdownToggles(container: HTMLElement): void {
  container.addEventListener('click', e => {
    const trigger = (e.target as HTMLElement).closest('.dropdown__trigger');
    if (!trigger) return;

    e.stopPropagation();
    const dropdown = trigger.closest('[data-dropdown]');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('dropdown--open');

    container.querySelectorAll('.dropdown--open').forEach(d => {
      d.classList.remove('dropdown--open');
      const menu = d.querySelector('.dropdown__menu');
      if (menu) menu.classList.remove('dropdown__menu--up');
      const t = d.querySelector('.dropdown__trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      dropdown.classList.add('dropdown--open');
      trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => {
        adjustDropdownPosition(dropdown);
      });
    }
  });

  document.addEventListener('click', e => {
    if (!container.contains(e.target as Node)) {
      container.querySelectorAll('.dropdown--open').forEach(d => {
        d.classList.remove('dropdown--open');
        const menu = d.querySelector('.dropdown__menu');
        if (menu) menu.classList.remove('dropdown__menu--up');
        const t = d.querySelector('.dropdown__trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  });
}
