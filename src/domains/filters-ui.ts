/**
 * Domain filters UI components
 * Manages filter chips, dropdowns, and reset button
 */

import type { FilterConfig, ActiveFilters } from './filters-config';
import { DOMAIN_FILTERS, hasActiveFilters, getDefaultFilters } from './filters-config';

/**
 * Get active label for filter chip
 */
function getActiveLabel(config: FilterConfig, activeValue: string | string[] | undefined): string {
  if (config.type === 'multi-select') {
    const activeArray = Array.isArray(activeValue) ? activeValue : [];
    if (activeArray.length === 0) return config.label;
    if (activeArray.length === 1) {
      const option = config.options.find((o) => o.value === activeArray[0]);
      return `${config.label}: ${option?.label || activeArray[0]}`;
    }
    return `${config.label} (${activeArray.length})`;
  } else {
    const value = typeof activeValue === 'string' ? activeValue : 'all';
    if (value === 'all' || value === 'any') return config.label;
    const option = config.options.find((o) => o.value === value);
    return `${config.label}: ${option?.label || value}`;
  }
}

/**
 * Render filter chip with dropdown (matches UI Style Guide pattern)
 */
function renderFilterChip(config: FilterConfig, activeValue: string | string[] | undefined): string {
  const label = getActiveLabel(config, activeValue);
  const isActive = config.type === 'multi-select'
    ? Array.isArray(activeValue) && activeValue.length > 0
    : activeValue && activeValue !== 'all' && activeValue !== 'any';

  return `
    <div class="dropdown" data-dropdown data-filter-id="${config.id}">
      <button
        class="btn-chip btn-chip--dropdown dropdown__trigger ${isActive ? 'is-active' : ''}"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
      >
        <span class="btn-chip__icon" data-icon="mono/filter"></span>
        <span class="btn-chip__label">${label}</span>
        <span class="btn-chip__chevron" data-icon="mono/chevron-down"></span>
      </button>
      <div class="dropdown__menu" role="menu">
        ${renderFilterOptions(config, activeValue)}
      </div>
    </div>
  `;
}

/**
 * Render filter options as dropdown items
 */
function renderFilterOptions(config: FilterConfig, activeValue: string | string[] | undefined): string {
  if (config.type === 'multi-select') {
    const activeArray = Array.isArray(activeValue) ? activeValue : [];
    return config.options
      .map((opt) => {
        const checked = activeArray.includes(opt.value);
        const icon = checked ? 'mono/check' : '';
        return `
          <button
            class="dropdown__item ${checked ? 'is-checked' : ''}"
            type="button"
            data-filter-value="${opt.value}"
          >
            ${icon ? `<span class="icon" data-icon="${icon}"></span>` : '<span class="icon-placeholder"></span>'}
            <span>${opt.label}</span>
          </button>
        `;
      })
      .join('');
  } else {
    const activeString = typeof activeValue === 'string' ? activeValue : 'all';
    return config.options
      .map((opt) => {
        const checked = opt.value === activeString;
        const icon = checked ? 'mono/check' : '';
        return `
          <button
            class="dropdown__item ${checked ? 'is-checked' : ''}"
            type="button"
            data-filter-value="${opt.value}"
          >
            ${icon ? `<span class="icon" data-icon="${icon}"></span>` : '<span class="icon-placeholder"></span>'}
            <span>${opt.label}</span>
          </button>
        `;
      })
      .join('');
  }
}

/**
 * Render filter chips (without wrapper, injected into existing controls-row)
 */
export function renderFilterBar(activeFilters: ActiveFilters): string {
  const chips = DOMAIN_FILTERS.map((config) => {
    const activeValue = activeFilters[config.id as keyof ActiveFilters];
    return renderFilterChip(config, activeValue);
  }).join('\n');

  const resetVisible = hasActiveFilters(activeFilters) ? '' : 'hidden';

  return `
    ${chips}
    <button type="button" class="btn btn--ghost btn--sm" data-reset-filters ${resetVisible}>
      <span class="icon" data-icon="mono/refresh"></span>
      Reset
    </button>
  `;
}

/**
 * Initialize filter UI interactions
 */
export function initFilterUI(
  container: HTMLElement,
  activeFilters: ActiveFilters,
  onChange: (filters: ActiveFilters) => void
): void {
  // Handle dropdown item clicks
  container.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.dropdown__item');
    if (!item || !item.hasAttribute('data-filter-value')) return;

    const dropdown = item.closest('[data-dropdown]');
    if (!dropdown) return;

    const filterId = dropdown.getAttribute('data-filter-id') as keyof ActiveFilters;
    const config = DOMAIN_FILTERS.find((f) => f.id === filterId);
    if (!config) return;

    const value = item.getAttribute('data-filter-value')!;

    // Update active filters
    if (config.type === 'multi-select') {
      const current = Array.isArray(activeFilters[filterId]) ? activeFilters[filterId] as string[] : [];
      if (current.includes(value)) {
        activeFilters[filterId] = current.filter((v) => v !== value) as any;
      } else {
        activeFilters[filterId] = [...current, value] as any;
      }
    } else {
      activeFilters[filterId] = value as any;
      // Close dropdown for single-select
      dropdown.classList.remove('dropdown--open');
      const trigger = dropdown.querySelector('.dropdown__trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    onChange(activeFilters);
  });

  // Reset filters
  const resetBtn = container.querySelector('[data-reset-filters]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Object.assign(activeFilters, getDefaultFilters());
      onChange(activeFilters);
    });
  }

  // Initialize dropdown toggles (reuse existing dropdown logic)
  initDropdownToggles(container);
}

/**
 * Initialize dropdown toggle behavior (matches existing dropdown pattern)
 */
function initDropdownToggles(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest('.dropdown__trigger');
    if (!trigger) return;

    e.stopPropagation();
    const dropdown = trigger.closest('[data-dropdown]');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('dropdown--open');

    // Close all dropdowns
    container.querySelectorAll('.dropdown--open').forEach((d) => {
      d.classList.remove('dropdown--open');
      const t = d.querySelector('.dropdown__trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
    });

    // Toggle current dropdown
    if (!isOpen) {
      dropdown.classList.add('dropdown--open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target as Node)) {
      container.querySelectorAll('.dropdown--open').forEach((d) => {
        d.classList.remove('dropdown--open');
        const t = d.querySelector('.dropdown__trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
  });
}
