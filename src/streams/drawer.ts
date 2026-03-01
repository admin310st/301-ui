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
import { initDropdowns } from '@ui/dropdown';
import { renderPresetSelector, renderPresetParams, collectPresetValues } from './preset-renderer';
import { renderDomainBindings, initDomainBindingHandlers } from './domain-binding';
import { t } from '@i18n';

const DRAWER_ID = 'tds-rule';

let drawerElement: HTMLElement | null = null;
let currentRuleId: number | null = null;
let currentBindings: TdsDomainBinding[] = [];
let drawerMode: 'create-preset' | 'create-manual' | 'edit' = 'create-preset';

// =============================================================================
// Dropdown option sets
// =============================================================================

type SelectOption = { value: string; label: string };

function typeOptions(): SelectOption[] {
  return [
    { value: 'traffic_shield', label: t('streams.drawer.options.shield') },
    { value: 'smartlink', label: t('streams.drawer.options.smartlink') },
  ];
}

function deviceOptions(): SelectOption[] {
  return [
    { value: '', label: t('streams.drawer.options.deviceAny') },
    { value: 'mobile', label: t('streams.drawer.options.deviceMobile') },
    { value: 'desktop', label: t('streams.drawer.options.deviceDesktop') },
    { value: 'tablet', label: t('streams.drawer.options.deviceTablet') },
  ];
}

function actionOptions(): SelectOption[] {
  return [
    { value: 'redirect', label: t('streams.drawer.options.actionRedirect') },
    { value: 'block', label: t('streams.drawer.options.actionBlock') },
    { value: 'pass', label: t('streams.drawer.options.actionPass') },
    { value: 'mab_redirect', label: t('streams.drawer.options.actionMab') },
  ];
}

function statusCodeOptions(): SelectOption[] {
  return [
    { value: '302', label: t('streams.drawer.options.code302') },
    { value: '301', label: t('streams.drawer.options.code301') },
  ];
}

function algorithmOptions(): SelectOption[] {
  return [
    { value: 'thompson_sampling', label: t('streams.drawer.options.algoThompson') },
    { value: 'ucb', label: t('streams.drawer.options.algoUcb') },
    { value: 'epsilon_greedy', label: t('streams.drawer.options.algoEpsilon') },
  ];
}

function ruleStatusOptions(): SelectOption[] {
  return [
    { value: 'draft', label: t('streams.drawer.options.statusDraft') },
    { value: 'active', label: t('streams.drawer.options.statusActive') },
    { value: 'disabled', label: t('streams.drawer.options.statusDisabled') },
  ];
}

// =============================================================================
// Init
// =============================================================================

/**
 * Initialize drawer
 */
export function initDrawer(): void {
  drawerElement = document.querySelector(`[data-drawer="${DRAWER_ID}"]`);
  if (!drawerElement) return;

  // Close buttons (overlay + X + Cancel)
  drawerElement.querySelectorAll('[data-drawer-close]').forEach(el => {
    el.addEventListener('click', closeDrawer);
  });

  // Save button
  const saveBtn = drawerElement.querySelector('[data-drawer-save]');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }

  // Dropdown toggle + positioning (delegated, one-time)
  initDropdowns(drawerElement);
  // Dropdown item selection → hidden input sync (delegated, one-time)
  setupDropdownSelection(drawerElement);

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
  if (title) title.textContent = t('streams.drawer.createTitle');

  // Update save button
  const saveBtn = drawerElement.querySelector('[data-drawer-save]');
  if (saveBtn) {
    const textSpan = saveBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = t('streams.drawer.create');
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
  if (title) title.textContent = t('streams.drawer.editTitle');

  // Update save button
  const saveBtn = drawerElement.querySelector('[data-drawer-save]');
  if (saveBtn) {
    const textSpan = saveBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = t('streams.drawer.save');
  }

  // Show loading in content
  const content = drawerElement.querySelector('[data-drawer-content]');
  if (content) {
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div><p class="text-muted">${t('streams.drawer.loading')}</p></div>`;
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
      content.innerHTML = `<div class="alert alert--danger"><p>${error.message || t('streams.drawer.loadError')}</p></div>`;
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
        <button class="tab is-active" type="button" data-mode="preset">${t('streams.drawer.fromPreset')}</button>
        <button class="tab" type="button" data-mode="manual">${t('streams.drawer.manual')}</button>
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
        <button class="tab is-active" type="button" data-tab-type="traffic_shield">${t('streams.types.traffic_shield')}</button>
        <button class="tab" type="button" data-tab-type="smartlink">${t('streams.types.smartlink')}</button>
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
        <label class="field__label">${t('streams.drawer.fields.ruleNameOptional')}</label>
        <input type="text" class="input" placeholder="${t('streams.drawer.fields.ruleNameAutoPlaceholder')}" data-field="rule_name" />
      </div>
    </div>
  `;
}

function renderManualCreateContent(): string {
  return `
    <div class="stack">
      <div class="field">
        <label class="field__label">
          <span>${t('streams.drawer.fields.ruleName')}</span>
          <span class="field__required">*</span>
        </label>
        <input type="text" class="input" placeholder="${t('streams.drawer.fields.ruleNamePlaceholder')}" data-field="rule_name" required />
      </div>

      <div class="field">
        <label class="field__label">${t('streams.drawer.fields.type')}</label>
        ${renderDropdown('tds_type', typeOptions())}
      </div>

      <!-- Conditions -->
      <section class="card card--panel">
        <header class="card__header"><h3 class="h5">${t('streams.drawer.conditionsSection')}</h3></header>
        <div class="card__body stack">
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.geo')}</label>
            <input type="text" class="input" placeholder="${t('streams.drawer.fields.geoPlaceholder')}" data-field="geo" />
          </div>
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.device')}</label>
            ${renderDropdown('device', deviceOptions())}
          </div>
          <div class="field">
            <label class="field__label">
              <input type="checkbox" class="checkbox" data-field="bot" />
              <span>${t('streams.drawer.fields.botOnly')}</span>
            </label>
          </div>
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.utmSource')}</label>
            <input type="text" class="input" placeholder="${t('streams.drawer.fields.utmSourcePlaceholder')}" data-field="utm_source" />
          </div>
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.utmCampaign')}</label>
            <input type="text" class="input" placeholder="${t('streams.drawer.fields.utmCampaignPlaceholder')}" data-field="utm_campaign" />
          </div>
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.path')}</label>
            <input type="text" class="input" placeholder="${t('streams.drawer.fields.pathPlaceholder')}" data-field="path" />
          </div>
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.referrer')}</label>
            <input type="text" class="input" placeholder="${t('streams.drawer.fields.referrerPlaceholder')}" data-field="referrer" />
          </div>
        </div>
      </section>

      <!-- Action -->
      <section class="card card--panel">
        <header class="card__header"><h3 class="h5">${t('streams.drawer.actionSection')}</h3></header>
        <div class="card__body stack">
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.actionType')}</label>
            ${renderDropdown('action', actionOptions())}
          </div>
          <div class="field" data-action-url-field>
            <label class="field__label">${t('streams.drawer.fields.actionUrl')}</label>
            <input type="text" class="input" placeholder="${t('streams.drawer.fields.actionUrlPlaceholder')}" data-field="action_url" />
          </div>
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.statusCode')}</label>
            ${renderDropdown('status_code', statusCodeOptions())}
          </div>

          <!-- MAB variants (shown when action = mab_redirect) -->
          <div data-mab-section hidden>
            <div class="field">
              <label class="field__label">${t('streams.drawer.fields.algorithm')}</label>
              ${renderDropdown('algorithm', algorithmOptions())}
            </div>
            <div class="stack stack--sm" data-variants-list>
              <div class="cluster">
                <label class="field__label">${t('streams.drawer.fields.variants')}</label>
                <button class="btn btn--sm btn--ghost" type="button" data-action="add-variant">${t('streams.drawer.fields.addVariant')}</button>
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
        <label class="field__label">${t('streams.drawer.fields.priority')}</label>
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
        <header class="card__header"><h3 class="h5">${t('streams.drawer.ruleConfig')}</h3></header>
        <div class="card__body stack">
          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.ruleName')}</label>
            <input type="text" class="input" value="${escapeAttr(rule.rule_name)}" data-field="rule_name" />
          </div>

          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.type')}</label>
            ${renderDropdown('tds_type', typeOptions(), rule.tds_type)}
          </div>

          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.status')}</label>
            ${renderDropdown('status', ruleStatusOptions(), rule.status)}
          </div>

          <!-- Conditions -->
          <fieldset class="stack stack--sm">
            <legend class="field__label">${t('streams.drawer.conditionsSection')}</legend>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.geoShort')}</label>
              <input type="text" class="input" value="${(conditions.geo || []).join(', ')}" data-field="geo" />
            </div>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.device')}</label>
              ${renderDropdown('device', deviceOptions(), conditions.device || '')}
            </div>
            <div class="field">
              <label class="field__label text-sm">
                <input type="checkbox" class="checkbox" data-field="bot" ${conditions.bot ? 'checked' : ''} />
                <span>${t('streams.drawer.fields.botOnly')}</span>
              </label>
            </div>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.utmSourceShort')}</label>
              <input type="text" class="input" value="${(conditions.utm_source || []).join(', ')}" data-field="utm_source" />
            </div>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.utmCampaignShort')}</label>
              <input type="text" class="input" value="${(conditions.utm_campaign || []).join(', ')}" data-field="utm_campaign" />
            </div>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.pathShort')}</label>
              <input type="text" class="input" value="${conditions.path || ''}" data-field="path" />
            </div>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.referrerShort')}</label>
              <input type="text" class="input" value="${conditions.referrer || ''}" data-field="referrer" />
            </div>
          </fieldset>

          <!-- Action -->
          <fieldset class="stack stack--sm">
            <legend class="field__label">${t('streams.drawer.actionSection')}</legend>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.actionType')}</label>
              ${renderDropdown('action', actionOptions(), logic.action)}
            </div>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.actionUrl')}</label>
              <input type="text" class="input" value="${logic.action_url || ''}" data-field="action_url" />
            </div>
            <div class="field">
              <label class="field__label text-sm">${t('streams.drawer.fields.statusCode')}</label>
              ${renderDropdown('status_code', statusCodeOptions(), String(logic.status_code || 302))}
            </div>
          </fieldset>

          <div class="field">
            <label class="field__label">${t('streams.drawer.fields.priority')}</label>
            <input type="number" class="input" value="${rule.priority}" min="1" max="9999" data-field="priority" />
          </div>
        </div>
      </section>

      <!-- Domain Bindings -->
      <section class="card card--panel">
        <header class="card__header cluster cluster--space-between">
          <h3 class="h5">${t('streams.bindings.title')}</h3>
          <button class="btn btn--sm btn--ghost" type="button" data-action="show-domain-picker">
            <span class="icon" data-icon="mono/plus"></span>
            <span>${t('streams.bindings.bindDomain')}</span>
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
        <header class="card__header"><h3 class="h5">${t('streams.drawer.detailsSection')}</h3></header>
        <div class="card__body">
          <dl class="detail-list">
            ${rule.preset_id ? `
              <div class="detail-row">
                <dt class="detail-label">${t('streams.drawer.details.preset')}</dt>
                <dd class="detail-value"><span class="badge badge--sm badge--neutral">${rule.preset_id}</span></dd>
              </div>
            ` : ''}
            <div class="detail-row">
              <dt class="detail-label">${t('streams.drawer.details.created')}</dt>
              <dd class="detail-value text-sm">${formatDate(rule.created_at)}</dd>
            </div>
            <div class="detail-row">
              <dt class="detail-label">${t('streams.drawer.details.updated')}</dt>
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

      tabs.forEach(tab2 => tab2.classList.remove('is-active'));
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

      typeTabs.forEach(tab2 => tab2.classList.remove('is-active'));
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

  const actionInput = drawerElement.querySelector('[data-field="action"]') as HTMLInputElement;
  const mabSection = drawerElement.querySelector('[data-mab-section]') as HTMLElement;
  const urlField = drawerElement.querySelector('[data-action-url-field]') as HTMLElement;

  if (!actionInput) return;

  const update = () => {
    const isMab = actionInput.value === 'mab_redirect';
    const isBlock = actionInput.value === 'block';
    const isPass = actionInput.value === 'pass';

    if (mabSection) mabSection.hidden = !isMab;
    if (urlField) urlField.hidden = isBlock || isPass;
  };

  actionInput.addEventListener('change', update);
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
        <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="remove-variant" aria-label="${t('streams.drawer.fields.removeVariant')}">
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
    showGlobalNotice('error', t('streams.messages.selectPreset'));
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
    showGlobalNotice('success', t('streams.messages.createdFromPreset'));
    closeDrawer();
  } catch (error: any) {
    showGlobalNotice('error', error.message || t('streams.messages.createFailed'));
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function handleManualCreate(): Promise<void> {
  if (!drawerElement) return;

  const ruleName = getFieldValue('rule_name');
  if (!ruleName) {
    showGlobalNotice('error', t('streams.messages.ruleNameRequired'));
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
    showGlobalNotice('success', t('streams.messages.created'));
    closeDrawer();
  } catch (error: any) {
    showGlobalNotice('error', error.message || t('streams.messages.createFailed'));
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

    showGlobalNotice('success', t('streams.messages.saved'));
    closeDrawer();
  } catch (error: any) {
    showGlobalNotice('error', error.message || t('streams.messages.saveFailed'));
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
  const el = drawerElement.querySelector(`[data-field="${name}"]`) as HTMLInputElement;
  if (!el) return '';
  if (el.type === 'checkbox') return el.checked ? 'true' : '';
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
  if (device) conditions.device = device;

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

// =============================================================================
// Custom Dropdown Helpers
// =============================================================================

/**
 * Render a custom dropdown (btn-chip + dropdown__menu + hidden input)
 * replacing native <select> per StyleGuide rules.
 */
function renderDropdown(fieldName: string, options: SelectOption[], selected?: string): string {
  const effectiveValue = selected ?? options[0]?.value ?? '';
  const sel = options.find(o => o.value === effectiveValue);
  const display = sel?.label ?? 'Select...';

  return `
    <div class="dropdown" data-dropdown="${fieldName}">
      <button class="btn-chip btn-chip--sm btn-chip--dropdown dropdown__trigger" type="button" aria-haspopup="menu" aria-expanded="false">
        <span class="btn-chip__label">${escapeAttr(display)}</span>
        <span class="btn-chip__chevron icon" data-icon="mono/chevron-down"></span>
      </button>
      <div class="dropdown__menu dropdown__menu--fit-trigger" role="menu">
        ${options.map(o =>
          `<button class="dropdown__item${o.value === effectiveValue ? ' is-active' : ''}" type="button" data-value="${escapeAttr(o.value)}">${escapeAttr(o.label)}</button>`
        ).join('')}
      </div>
    </div>
    <input type="hidden" data-field="${fieldName}" value="${escapeAttr(effectiveValue)}" />
  `;
}

/**
 * Delegated handler: when a .dropdown__item is clicked, update the
 * sibling hidden input value, the trigger label, and the active state.
 * Called once on the drawer element.
 */
function setupDropdownSelection(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.dropdown__item') as HTMLElement;
    if (!item) return;

    const dropdown = item.closest('.dropdown, [data-dropdown]') as HTMLElement;
    if (!dropdown) return;

    const value = item.dataset.value ?? '';

    // Update trigger label
    const triggerLabel = dropdown.querySelector('.btn-chip__label');
    if (triggerLabel) triggerLabel.textContent = item.textContent?.trim() ?? '';

    // Mark active
    dropdown.querySelectorAll('.dropdown__item').forEach(i => i.classList.remove('is-active'));
    item.classList.add('is-active');

    // Close dropdown
    dropdown.classList.remove('dropdown--open');
    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');

    // Update hidden input (next element sibling of dropdown wrapper)
    const hidden = dropdown.nextElementSibling as HTMLInputElement;
    if (hidden?.tagName === 'INPUT' && hidden.type === 'hidden') {
      hidden.value = value;
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

// =============================================================================
// Utility
// =============================================================================

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
