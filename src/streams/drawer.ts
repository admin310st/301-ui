/**
 * TDS Rule drawer component
 * Handles create/edit drawer for TDS rules
 */

import type { TdsRule, TdsPreset, TdsDomainBinding } from '@api/types';
import { getRule, createRule, createRuleFromPreset, updateRule } from '@api/tds';
import { safeCall } from '@api/ui-client';
import {
  getState,
  addRuleOptimistic,
  updateRuleOptimistic,
  refreshRules,
} from './state';
import { showGlobalNotice } from '@ui/globalNotice';
import { drawerManager } from '@ui/drawer-manager';
import { renderPresetSelector, renderPresetParams, collectPresetValues } from './preset-renderer';
import { renderDomainBindings, initDomainBindingHandlers } from './domain-binding';

const DRAWER_ID = 'tds-rule';

let drawerElement: HTMLElement | null = null;
let currentRuleId: number | null = null;
let currentBindings: TdsDomainBinding[] = [];
let drawerMode: 'create-preset' | 'create-manual' | 'edit' = 'create-preset';

/**
 * Initialize drawer
 */
export function initDrawer(): void {
  drawerElement = document.querySelector(`[data-drawer="${DRAWER_ID}"]`);
  if (!drawerElement) return;

  // Save button
  const saveBtn = drawerElement.querySelector('[data-drawer-save]');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }

  // Listen for custom events from page controller
  document.addEventListener('tds:open-create-drawer', () => {
    openCreateDrawer();
  });

  document.addEventListener('tds:open-edit-drawer', ((e: CustomEvent) => {
    const ruleId = e.detail?.ruleId;
    if (ruleId) void openEditDrawer(ruleId);
  }) as EventListener);
}

/**
 * Open drawer in create mode
 */
export function openCreateDrawer(): void {
  if (!drawerElement) return;

  currentRuleId = null;
  currentBindings = [];
  drawerMode = 'create-preset';

  // Update header
  const title = drawerElement.querySelector('[data-drawer-title]');
  if (title) title.textContent = 'Create Rule';

  // Update save button
  const saveBtn = drawerElement.querySelector('[data-drawer-save]');
  if (saveBtn) {
    const textSpan = saveBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Create';
  }

  // Render create content
  renderCreateContent();

  drawerManager.open(DRAWER_ID);
}

/**
 * Open drawer in edit mode
 */
export async function openEditDrawer(ruleId: number): Promise<void> {
  if (!drawerElement) return;

  currentRuleId = ruleId;
  drawerMode = 'edit';

  // Update header
  const title = drawerElement.querySelector('[data-drawer-title]');
  if (title) title.textContent = 'Edit Rule';

  // Update save button
  const saveBtn = drawerElement.querySelector('[data-drawer-save]');
  if (saveBtn) {
    const textSpan = saveBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Save';
  }

  // Show loading in content
  const content = drawerElement.querySelector('[data-drawer-content]');
  if (content) {
    content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p class="text-muted">Loading rule...</p></div>';
  }

  drawerManager.open(DRAWER_ID);

  try {
    const response = await safeCall(
      () => getRule(ruleId),
      { abortKey: 'tds-rule-detail', retryOn401: true }
    );

    currentBindings = response.domains;
    renderEditContent(response.rule, response.domains);
  } catch (error: any) {
    if (error.code === 'ABORTED') return;
    if (content) {
      content.innerHTML = `<div class="alert alert--danger"><p>${error.message || 'Failed to load rule'}</p></div>`;
    }
  }
}

/**
 * Close drawer
 */
export function closeDrawer(): void {
  drawerManager.close(DRAWER_ID);
  currentRuleId = null;
  currentBindings = [];
}

// =============================================================================
// Render Content
// =============================================================================

function renderCreateContent(): void {
  const content = drawerElement?.querySelector('[data-drawer-content]');
  if (!content) return;

  const { presets } = getState();

  content.innerHTML = `
    <div class="stack-list">
      <!-- Mode Toggle -->
      <div class="tabs tabs--sm" data-mode-tabs>
        <button class="tab is-active" type="button" data-mode="preset">From Preset</button>
        <button class="tab" type="button" data-mode="manual">Manual</button>
      </div>

      <!-- Preset Mode -->
      <div data-mode-content="preset">
        ${renderPresetCreateContent(presets)}
      </div>

      <!-- Manual Mode -->
      <div data-mode-content="manual" hidden>
        ${renderManualCreateContent()}
      </div>
    </div>
  `;

  setupModeToggle();
  setupPresetHandlers();
}

function renderPresetCreateContent(presets: TdsPreset[]): string {
  const shieldPresets = presets.filter(p => p.tds_type === 'traffic_shield');
  const linkPresets = presets.filter(p => p.tds_type === 'smartlink');

  return `
    <div class="stack">
      <!-- Type tabs within preset -->
      <div class="tabs tabs--sm" data-type-tabs>
        <button class="tab is-active" type="button" data-tab-type="traffic_shield">Shield</button>
        <button class="tab" type="button" data-tab-type="smartlink">SmartLink</button>
      </div>

      <div data-type-content="traffic_shield">
        ${renderPresetSelector(shieldPresets)}
      </div>

      <div data-type-content="smartlink" hidden>
        ${renderPresetSelector(linkPresets)}
      </div>

      <!-- Preset params (shown after selecting a preset) -->
      <div data-preset-params hidden></div>

      <!-- Optional rule name -->
      <div class="field" data-preset-name-field hidden>
        <label class="field__label">Rule name (optional)</label>
        <input type="text" class="input" placeholder="Auto-generated from preset" data-field="rule_name" />
      </div>
    </div>
  `;
}

function renderManualCreateContent(): string {
  return `
    <div class="stack">
      <div class="field">
        <label class="field__label">
          <span>Rule name</span>
          <span class="field__required">*</span>
        </label>
        <input type="text" class="input" placeholder="My routing rule" data-field="rule_name" required />
      </div>

      <div class="field">
        <label class="field__label">Type</label>
        <select class="input" data-field="tds_type">
          <option value="traffic_shield">Shield</option>
          <option value="smartlink">SmartLink</option>
        </select>
      </div>

      <!-- Conditions -->
      <section class="card card--panel">
        <header class="card__header"><h3 class="h5">Conditions</h3></header>
        <div class="card__body stack">
          <div class="field">
            <label class="field__label">Geo (countries, comma-separated)</label>
            <input type="text" class="input" placeholder="RU, BY, KZ" data-field="geo" />
          </div>
          <div class="field">
            <label class="field__label">Device</label>
            <select class="input" data-field="device">
              <option value="">Any</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label">
              <input type="checkbox" class="checkbox" data-field="bot" />
              <span>Bot traffic only</span>
            </label>
          </div>
          <div class="field">
            <label class="field__label">UTM Source (comma-separated)</label>
            <input type="text" class="input" placeholder="facebook, google" data-field="utm_source" />
          </div>
          <div class="field">
            <label class="field__label">UTM Campaign (comma-separated)</label>
            <input type="text" class="input" placeholder="summer-2026" data-field="utm_campaign" />
          </div>
          <div class="field">
            <label class="field__label">Path (regex)</label>
            <input type="text" class="input" placeholder="/offer.*" data-field="path" />
          </div>
          <div class="field">
            <label class="field__label">Referrer (regex)</label>
            <input type="text" class="input" placeholder="facebook\\.com" data-field="referrer" />
          </div>
        </div>
      </section>

      <!-- Action -->
      <section class="card card--panel">
        <header class="card__header"><h3 class="h5">Action</h3></header>
        <div class="card__body stack">
          <div class="field">
            <label class="field__label">Action type</label>
            <select class="input" data-field="action">
              <option value="redirect">Redirect</option>
              <option value="block">Block</option>
              <option value="pass">Pass</option>
              <option value="mab_redirect">A/B Test (MAB)</option>
            </select>
          </div>
          <div class="field" data-action-url-field>
            <label class="field__label">Action URL</label>
            <input type="text" class="input" placeholder="https://example.com/offer" data-field="action_url" />
          </div>
          <div class="field">
            <label class="field__label">Status code</label>
            <select class="input" data-field="status_code">
              <option value="302">302 - Temporary</option>
              <option value="301">301 - Permanent</option>
            </select>
          </div>

          <!-- MAB variants (shown when action = mab_redirect) -->
          <div data-mab-section hidden>
            <div class="field">
              <label class="field__label">Algorithm</label>
              <select class="input" data-field="algorithm">
                <option value="thompson_sampling">Thompson Sampling</option>
                <option value="ucb">UCB</option>
                <option value="epsilon_greedy">Epsilon Greedy</option>
              </select>
            </div>
            <div class="stack stack--sm" data-variants-list>
              <div class="cluster">
                <label class="field__label">Variants</label>
                <button class="btn btn--sm btn--ghost" type="button" data-action="add-variant">+ Add</button>
              </div>
              <div class="stack stack--xs" data-variant-rows>
                <div class="cluster" data-variant-row>
                  <input type="text" class="input" placeholder="https://offer-a.com" data-variant-url />
                  <input type="number" class="input" style="width: 80px;" placeholder="50" data-variant-weight value="50" />
                </div>
                <div class="cluster" data-variant-row>
                  <input type="text" class="input" placeholder="https://offer-b.com" data-variant-url />
                  <input type="number" class="input" style="width: 80px;" placeholder="50" data-variant-weight value="50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Priority -->
      <div class="field">
        <label class="field__label">Priority</label>
        <input type="number" class="input" value="100" min="1" max="9999" data-field="priority" />
      </div>
    </div>
  `;
}

function renderEditContent(rule: TdsRule, domains: TdsDomainBinding[]): string | void {
  const content = drawerElement?.querySelector('[data-drawer-content]');
  if (!content) return;

  const logic = rule.logic_json;
  const conditions = logic.conditions;

  content.innerHTML = `
    <div class="stack-list">
      <!-- Rule Configuration -->
      <section class="card card--panel">
        <header class="card__header"><h3 class="h5">Rule Configuration</h3></header>
        <div class="card__body stack">
          <div class="field">
            <label class="field__label">Rule name</label>
            <input type="text" class="input" value="${escapeAttr(rule.rule_name)}" data-field="rule_name" />
          </div>

          <div class="field">
            <label class="field__label">Type</label>
            <select class="input" data-field="tds_type">
              <option value="traffic_shield" ${rule.tds_type === 'traffic_shield' ? 'selected' : ''}>Shield</option>
              <option value="smartlink" ${rule.tds_type === 'smartlink' ? 'selected' : ''}>SmartLink</option>
            </select>
          </div>

          <div class="field">
            <label class="field__label">Status</label>
            <select class="input" data-field="status">
              <option value="draft" ${rule.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="active" ${rule.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="disabled" ${rule.status === 'disabled' ? 'selected' : ''}>Disabled</option>
            </select>
          </div>

          <!-- Conditions -->
          <fieldset class="stack stack--sm">
            <legend class="field__label">Conditions</legend>
            <div class="field">
              <label class="field__label text-sm">Geo</label>
              <input type="text" class="input" value="${(conditions.geo || []).join(', ')}" data-field="geo" />
            </div>
            <div class="field">
              <label class="field__label text-sm">Device</label>
              <select class="input" data-field="device">
                <option value="">Any</option>
                <option value="mobile" ${conditions.device?.includes('mobile') ? 'selected' : ''}>Mobile</option>
                <option value="desktop" ${conditions.device?.includes('desktop') ? 'selected' : ''}>Desktop</option>
                <option value="tablet" ${conditions.device?.includes('tablet') ? 'selected' : ''}>Tablet</option>
              </select>
            </div>
            <div class="field">
              <label class="field__label text-sm">
                <input type="checkbox" class="checkbox" data-field="bot" ${conditions.bot ? 'checked' : ''} />
                <span>Bot traffic only</span>
              </label>
            </div>
            <div class="field">
              <label class="field__label text-sm">UTM Source</label>
              <input type="text" class="input" value="${(conditions.utm_source || []).join(', ')}" data-field="utm_source" />
            </div>
            <div class="field">
              <label class="field__label text-sm">UTM Campaign</label>
              <input type="text" class="input" value="${(conditions.utm_campaign || []).join(', ')}" data-field="utm_campaign" />
            </div>
            <div class="field">
              <label class="field__label text-sm">Path</label>
              <input type="text" class="input" value="${conditions.path || ''}" data-field="path" />
            </div>
            <div class="field">
              <label class="field__label text-sm">Referrer</label>
              <input type="text" class="input" value="${conditions.referrer || ''}" data-field="referrer" />
            </div>
          </fieldset>

          <!-- Action -->
          <fieldset class="stack stack--sm">
            <legend class="field__label">Action</legend>
            <div class="field">
              <label class="field__label text-sm">Action type</label>
              <select class="input" data-field="action">
                <option value="redirect" ${logic.action === 'redirect' ? 'selected' : ''}>Redirect</option>
                <option value="block" ${logic.action === 'block' ? 'selected' : ''}>Block</option>
                <option value="pass" ${logic.action === 'pass' ? 'selected' : ''}>Pass</option>
                <option value="mab_redirect" ${logic.action === 'mab_redirect' ? 'selected' : ''}>A/B Test (MAB)</option>
              </select>
            </div>
            <div class="field">
              <label class="field__label text-sm">Action URL</label>
              <input type="text" class="input" value="${logic.action_url || ''}" data-field="action_url" />
            </div>
            <div class="field">
              <label class="field__label text-sm">Status code</label>
              <select class="input" data-field="status_code">
                <option value="302" ${(logic.status_code || 302) === 302 ? 'selected' : ''}>302 - Temporary</option>
                <option value="301" ${logic.status_code === 301 ? 'selected' : ''}>301 - Permanent</option>
              </select>
            </div>
          </fieldset>

          <div class="field">
            <label class="field__label">Priority</label>
            <input type="number" class="input" value="${rule.priority}" min="1" max="9999" data-field="priority" />
          </div>
        </div>
      </section>

      <!-- Domain Bindings -->
      <section class="card card--panel">
        <header class="card__header cluster cluster--space-between">
          <h3 class="h5">Domain Bindings</h3>
          <button class="btn btn--sm btn--ghost" type="button" data-action="show-domain-picker">
            <span class="icon" data-icon="mono/plus"></span>
            <span>Bind Domain</span>
          </button>
        </header>
        <div class="card__body">
          <div data-bindings-list>
            ${renderDomainBindings(domains)}
          </div>
          <div data-domain-picker hidden></div>
        </div>
      </section>

      <!-- Details -->
      <section class="card card--panel">
        <header class="card__header"><h3 class="h5">Details</h3></header>
        <div class="card__body">
          <dl class="detail-list">
            ${rule.preset_id ? `
              <div class="detail-row">
                <dt class="detail-label">Preset</dt>
                <dd class="detail-value"><span class="badge badge--sm badge--neutral">${rule.preset_id}</span></dd>
              </div>
            ` : ''}
            <div class="detail-row">
              <dt class="detail-label">Created</dt>
              <dd class="detail-value text-sm">${formatDate(rule.created_at)}</dd>
            </div>
            <div class="detail-row">
              <dt class="detail-label">Updated</dt>
              <dd class="detail-value text-sm">${formatDate(rule.updated_at)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  `;

  // Initialize domain binding handlers
  initDomainBindingHandlers(drawerElement!, rule.id, currentBindings);

  // Setup MAB section toggle
  setupActionToggle();
}

// =============================================================================
// Mode Toggle (Preset / Manual)
// =============================================================================

function setupModeToggle(): void {
  if (!drawerElement) return;

  const tabs = drawerElement.querySelectorAll('[data-mode-tabs] .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = (tab as HTMLElement).dataset.mode;
      if (!mode) return;

      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      drawerMode = mode === 'preset' ? 'create-preset' : 'create-manual';

      // Toggle content visibility
      const presetContent = drawerElement!.querySelector('[data-mode-content="preset"]') as HTMLElement;
      const manualContent = drawerElement!.querySelector('[data-mode-content="manual"]') as HTMLElement;

      if (presetContent) presetContent.hidden = mode !== 'preset';
      if (manualContent) manualContent.hidden = mode !== 'manual';

      if (mode === 'manual') {
        setupActionToggle();
        setupVariantHandlers();
      }
    });
  });
}

// =============================================================================
// Preset Handlers
// =============================================================================

function setupPresetHandlers(): void {
  if (!drawerElement) return;

  // Type tabs (Shield / SmartLink)
  const typeTabs = drawerElement.querySelectorAll('[data-type-tabs] .tab');
  typeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const type = (tab as HTMLElement).dataset.tabType;
      if (!type) return;

      typeTabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      const shieldContent = drawerElement!.querySelector('[data-type-content="traffic_shield"]') as HTMLElement;
      const linkContent = drawerElement!.querySelector('[data-type-content="smartlink"]') as HTMLElement;

      if (shieldContent) shieldContent.hidden = type !== 'traffic_shield';
      if (linkContent) linkContent.hidden = type !== 'smartlink';

      // Hide params when switching type
      const paramsEl = drawerElement!.querySelector('[data-preset-params]') as HTMLElement;
      if (paramsEl) paramsEl.hidden = true;
    });
  });

  // Preset card selection
  drawerElement.addEventListener('click', e => {
    const card = (e.target as HTMLElement).closest('[data-preset-id]') as HTMLElement;
    if (!card) return;

    const presetId = card.dataset.presetId;
    if (!presetId) return;

    // Highlight selected preset
    drawerElement!.querySelectorAll('[data-preset-id]').forEach(c => c.classList.remove('is-selected'));
    card.classList.add('is-selected');

    // Show params for selected preset
    const { presets } = getState();
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      const paramsEl = drawerElement!.querySelector('[data-preset-params]') as HTMLElement;
      const nameField = drawerElement!.querySelector('[data-preset-name-field]') as HTMLElement;
      if (paramsEl) {
        paramsEl.innerHTML = renderPresetParams(preset);
        paramsEl.hidden = false;
      }
      if (nameField) nameField.hidden = false;
    }
  });
}

// =============================================================================
// Action Toggle (show/hide MAB section)
// =============================================================================

function setupActionToggle(): void {
  if (!drawerElement) return;

  const actionSelect = drawerElement.querySelector('[data-field="action"]') as HTMLSelectElement;
  const mabSection = drawerElement.querySelector('[data-mab-section]') as HTMLElement;
  const urlField = drawerElement.querySelector('[data-action-url-field]') as HTMLElement;

  if (!actionSelect) return;

  const update = () => {
    const isMab = actionSelect.value === 'mab_redirect';
    const isBlock = actionSelect.value === 'block';
    const isPass = actionSelect.value === 'pass';

    if (mabSection) mabSection.hidden = !isMab;
    if (urlField) urlField.hidden = isBlock || isPass;
  };

  actionSelect.addEventListener('change', update);
  update();
}

function setupVariantHandlers(): void {
  if (!drawerElement) return;

  const addBtn = drawerElement.querySelector('[data-action="add-variant"]');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const rows = drawerElement!.querySelector('[data-variant-rows]');
      if (!rows) return;

      const newRow = document.createElement('div');
      newRow.className = 'cluster';
      newRow.setAttribute('data-variant-row', '');
      newRow.innerHTML = `
        <input type="text" class="input" placeholder="https://offer-c.com" data-variant-url />
        <input type="number" class="input" style="width: 80px;" placeholder="50" data-variant-weight value="33" />
        <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="remove-variant" aria-label="Remove variant">
          <span class="icon" data-icon="mono/close"></span>
        </button>
      `;
      rows.appendChild(newRow);
    });
  }

  // Delegate remove variant
  drawerElement.addEventListener('click', e => {
    const removeBtn = (e.target as HTMLElement).closest('[data-action="remove-variant"]');
    if (!removeBtn) return;

    const row = removeBtn.closest('[data-variant-row]');
    if (row) row.remove();
  });
}

// =============================================================================
// Save Handler
// =============================================================================

async function handleSave(): Promise<void> {
  if (!drawerElement) return;

  if (drawerMode === 'create-preset') {
    await handlePresetCreate();
  } else if (drawerMode === 'create-manual') {
    await handleManualCreate();
  } else {
    await handleEdit();
  }
}

async function handlePresetCreate(): Promise<void> {
  if (!drawerElement) return;

  const selectedCard = drawerElement.querySelector('[data-preset-id].is-selected') as HTMLElement;
  if (!selectedCard) {
    showGlobalNotice('error', 'Select a preset first');
    return;
  }

  const presetId = selectedCard.dataset.presetId!;
  const params = collectPresetValues(drawerElement);
  const ruleName = (drawerElement.querySelector('[data-preset-name-field] [data-field="rule_name"]') as HTMLInputElement)?.value?.trim() || undefined;

  const saveBtn = drawerElement.querySelector('[data-drawer-save]') as HTMLButtonElement;
  if (saveBtn) saveBtn.disabled = true;

  try {
    const response = await safeCall(
      () => createRuleFromPreset({ preset_id: presetId, params, rule_name: ruleName }),
      { lockKey: `tds-rule:create-preset:${Date.now()}`, retryOn401: true }
    );

    addRuleOptimistic(response.rule);
    showGlobalNotice('success', 'Rule created from preset');
    closeDrawer();
  } catch (error: any) {
    showGlobalNotice('error', error.message || 'Failed to create rule');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function handleManualCreate(): Promise<void> {
  if (!drawerElement) return;

  const ruleName = getFieldValue('rule_name');
  if (!ruleName) {
    showGlobalNotice('error', 'Rule name is required');
    return;
  }

  const logicJson = collectLogicJson();
  const tdsType = getFieldValue('tds_type') as 'traffic_shield' | 'smartlink';
  const priority = parseInt(getFieldValue('priority') || '100', 10);

  const saveBtn = drawerElement.querySelector('[data-drawer-save]') as HTMLButtonElement;
  if (saveBtn) saveBtn.disabled = true;

  try {
    const response = await safeCall(
      () => createRule({ rule_name: ruleName, tds_type: tdsType, logic_json: logicJson, priority }),
      { lockKey: `tds-rule:create:${Date.now()}`, retryOn401: true }
    );

    addRuleOptimistic(response.rule);
    showGlobalNotice('success', 'Rule created');
    closeDrawer();
  } catch (error: any) {
    showGlobalNotice('error', error.message || 'Failed to create rule');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function handleEdit(): Promise<void> {
  if (!drawerElement || currentRuleId === null) return;

  const ruleName = getFieldValue('rule_name');
  const tdsType = getFieldValue('tds_type') as 'traffic_shield' | 'smartlink';
  const status = getFieldValue('status') as 'draft' | 'active' | 'disabled';
  const priority = parseInt(getFieldValue('priority') || '100', 10);
  const logicJson = collectLogicJson();

  const saveBtn = drawerElement.querySelector('[data-drawer-save]') as HTMLButtonElement;
  if (saveBtn) saveBtn.disabled = true;

  try {
    await safeCall(
      () => updateRule(currentRuleId!, {
        rule_name: ruleName || undefined,
        tds_type: tdsType,
        status,
        priority,
        logic_json: logicJson,
      }),
      { lockKey: `tds-rule:update:${currentRuleId}`, retryOn401: true }
    );

    updateRuleOptimistic(currentRuleId!, {
      rule_name: ruleName || '',
      tds_type: tdsType,
      status,
      priority,
      logic_json: logicJson,
    });

    showGlobalNotice('success', 'Rule saved');
    closeDrawer();
  } catch (error: any) {
    showGlobalNotice('error', error.message || 'Failed to save rule');
    await refreshRules();
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// =============================================================================
// Form Helpers
// =============================================================================

function getFieldValue(name: string): string {
  if (!drawerElement) return '';
  const el = drawerElement.querySelector(`[data-field="${name}"]`) as HTMLInputElement | HTMLSelectElement;
  if (!el) return '';
  if (el.type === 'checkbox') return (el as HTMLInputElement).checked ? 'true' : '';
  return el.value.trim();
}

function collectLogicJson() {
  const action = getFieldValue('action') as 'redirect' | 'block' | 'pass' | 'mab_redirect';
  const actionUrl = getFieldValue('action_url') || undefined;
  const statusCode = parseInt(getFieldValue('status_code') || '302', 10);

  // Parse comma-separated values into arrays
  const parseList = (val: string): string[] => {
    return val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
  };

  const conditions: Record<string, any> = {};
  const geo = parseList(getFieldValue('geo'));
  if (geo.length > 0) conditions.geo = geo;

  const device = getFieldValue('device');
  if (device) conditions.device = [device];

  const bot = getFieldValue('bot');
  if (bot) conditions.bot = true;

  const utmSource = parseList(getFieldValue('utm_source'));
  if (utmSource.length > 0) conditions.utm_source = utmSource;

  const utmCampaign = parseList(getFieldValue('utm_campaign'));
  if (utmCampaign.length > 0) conditions.utm_campaign = utmCampaign;

  const path = getFieldValue('path');
  if (path) conditions.path = path;

  const referrer = getFieldValue('referrer');
  if (referrer) conditions.referrer = referrer;

  const logicJson: Record<string, any> = {
    conditions,
    action,
    status_code: statusCode,
  };

  if (actionUrl) logicJson.action_url = actionUrl;

  // MAB variants
  if (action === 'mab_redirect' && drawerElement) {
    const algorithm = getFieldValue('algorithm');
    if (algorithm) logicJson.algorithm = algorithm;

    const variantRows = drawerElement.querySelectorAll('[data-variant-row]');
    const variants: Array<{ url: string; weight: number }> = [];
    variantRows.forEach(row => {
      const url = (row.querySelector('[data-variant-url]') as HTMLInputElement)?.value?.trim();
      const weight = parseInt((row.querySelector('[data-variant-weight]') as HTMLInputElement)?.value || '50', 10);
      if (url) variants.push({ url, weight });
    });
    if (variants.length > 0) logicJson.variants = variants;
  }

  return logicJson;
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
