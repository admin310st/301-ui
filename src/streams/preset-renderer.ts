/**
 * TDS preset UI rendering
 * Renders preset selector cards and dynamic param fields
 */

import type { TdsPreset } from '@api/types';

/**
 * Render preset cards for selection
 */
export function renderPresetSelector(presets: TdsPreset[]): string {
  if (presets.length === 0) {
    return '<p class="text-muted text-sm">No presets available for this type.</p>';
  }

  return `
    <div class="stack stack--sm">
      ${presets.map(preset => `
        <div class="panel panel--interactive" data-preset-id="${preset.id}" role="button" tabindex="0">
          <div class="stack stack--xs">
            <div class="cluster cluster--space-between">
              <strong class="text-sm">${escapeHtml(preset.name)}</strong>
              <span class="badge badge--sm badge--neutral">${preset.id}</span>
            </div>
            <p class="text-sm text-muted">${escapeHtml(preset.description)}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render dynamic param fields for a selected preset
 */
export function renderPresetParams(preset: TdsPreset): string {
  if (preset.params.length === 0) {
    return '<p class="text-sm text-muted">This preset has no configurable parameters.</p>';
  }

  return `
    <div class="stack stack--sm">
      <h4 class="h5">Configure: ${escapeHtml(preset.name)}</h4>
      ${preset.params.map(param => renderParamField(param)).join('')}
    </div>
  `;
}

/**
 * Render a single param field based on type
 */
function renderParamField(param: { key: string; label: string; type: string; required: boolean; options?: string[]; placeholder?: string }): string {
  const requiredMark = param.required ? '<span class="field__required">*</span>' : '';

  if (param.type === 'select' && param.options) {
    return `
      <div class="field">
        <label class="field__label"><span>${escapeHtml(param.label)}</span>${requiredMark}</label>
        <select class="input" data-preset-field="${param.key}" ${param.required ? 'required' : ''}>
          <option value="">Select...</option>
          ${param.options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
        </select>
      </div>
    `;
  }

  if (param.type === 'multi-select' && param.options) {
    return `
      <div class="field">
        <label class="field__label"><span>${escapeHtml(param.label)}</span>${requiredMark}</label>
        <div class="stack stack--xs">
          ${param.options.map(opt => `
            <label class="field__label text-sm">
              <input type="checkbox" class="checkbox" data-preset-field="${param.key}" value="${escapeHtml(opt)}" />
              <span>${escapeHtml(opt)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Default: text/url input
  return `
    <div class="field">
      <label class="field__label"><span>${escapeHtml(param.label)}</span>${requiredMark}</label>
      <input
        type="text"
        class="input"
        placeholder="${escapeHtml(param.placeholder || '')}"
        data-preset-field="${param.key}"
        ${param.required ? 'required' : ''}
      />
    </div>
  `;
}

/**
 * Collect values from [data-preset-field] elements
 */
export function collectPresetValues(container: HTMLElement): Record<string, any> {
  const values: Record<string, any> = {};

  // Text/select inputs
  container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-preset-field]').forEach(el => {
    const key = el.getAttribute('data-preset-field')!;

    if (el.type === 'checkbox') {
      const checkbox = el as HTMLInputElement;
      // Multi-select: collect checked values as array
      if (!values[key]) values[key] = [];
      if (checkbox.checked) {
        (values[key] as string[]).push(checkbox.value);
      }
    } else {
      // Single value
      values[key] = el.value.trim();
    }
  });

  return values;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
