/**
 * TDS rules table rendering
 * Renders rules into [data-tds-tbody] using innerHTML template literals
 */

import type { TdsRule } from '@api/types';
import { t } from '@i18n';
import {
  getConditionSummary,
  getActionLabel,
  getTypeBadgeHtml,
  getStatusBadgeHtml,
  truncateUrl,
} from './helpers';

/**
 * Render rules table rows
 */
export function renderRulesTable(rules: TdsRule[]): string {
  if (rules.length === 0) return '';

  return rules.map(rule => renderRuleRow(rule)).join('');
}

/**
 * Render a single rule row
 */
function renderRuleRow(rule: TdsRule): string {
  const conditionsSummary = getConditionSummary(rule.logic_json.conditions);
  const actionLabel = getActionLabel(rule.logic_json.action);
  const actionUrl = rule.logic_json.action_url
    ? truncateUrl(rule.logic_json.action_url, 30)
    : '';
  const typeBadge = getTypeBadgeHtml(rule.tds_type);
  const statusBadge = getStatusBadgeHtml(rule.status);

  const presetBadge = rule.preset_id
    ? `<span class="badge badge--sm badge--neutral" title="${t('streams.table.fromPreset').replace('{{id}}', rule.preset_id)}">${rule.preset_id}</span>`
    : '';

  return `
    <tr data-rule-id="${rule.id}">
      <td data-priority="medium" class="text-center">
        <span class="text-sm text-muted" style="font-variant-numeric: tabular-nums;">${rule.priority}</span>
      </td>
      <td data-priority="critical">
        <div class="table-cell-stack">
          <span class="table-cell-main">${escapeHtml(rule.rule_name)}</span>
          ${presetBadge}
        </div>
      </td>
      <td data-priority="high">
        ${typeBadge}
      </td>
      <td data-priority="medium">
        <span class="text-sm text-muted" title="${escapeHtml(conditionsSummary)}">${escapeHtml(conditionsSummary)}</span>
      </td>
      <td data-priority="high">
        <div>
          <div class="text-sm">${actionLabel}</div>
          ${actionUrl ? `<div class="table-cell-main text-muted text-sm" title="${escapeHtml(rule.logic_json.action_url || '')}">${escapeHtml(actionUrl)}</div>` : ''}
        </div>
      </td>
      <td data-priority="medium">
        <span class="text-sm">${escapeHtml(rule.site_name || '')}</span>
      </td>
      <td data-priority="high">
        ${statusBadge}
      </td>
      <td data-priority="critical" class="th-actions">
        <div class="btn-group">
          <button class="btn-icon" type="button" data-action="edit-rule" data-rule-id="${rule.id}" aria-label="${t('streams.actions.edit')}" title="${t('streams.actions.edit')}">
            <span class="icon" data-icon="mono/pencil-circle"></span>
          </button>
          <div class="dropdown" data-dropdown>
            <button class="btn-icon btn-icon--ghost dropdown__trigger" type="button" aria-haspopup="menu" aria-expanded="false" title="${t('streams.actions.moreActions')}">
              <span class="icon" data-icon="mono/dots-vertical"></span>
            </button>
            <div class="dropdown__menu dropdown__menu--align-right" role="menu">
              ${renderToggleAction(rule)}
              <div class="dropdown__divider"></div>
              <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-rule" data-rule-id="${rule.id}">
                <span class="icon" data-icon="mono/delete"></span>
                <span>${t('streams.actions.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render toggle status action (Enable / Disable)
 */
function renderToggleAction(rule: TdsRule): string {
  if (rule.status === 'active') {
    return `
      <button class="dropdown__item" type="button" data-action="disable-rule" data-rule-id="${rule.id}">
        <span class="icon" data-icon="mono/pause"></span>
        <span>${t('streams.actions.disable')}</span>
      </button>`;
  }
  return `
    <button class="dropdown__item" type="button" data-action="enable-rule" data-rule-id="${rule.id}">
      <span class="icon" data-icon="mono/play"></span>
      <span>${t('streams.actions.enable')}</span>
    </button>`;
}

/**
 * Escape HTML for safe rendering in attributes and content
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
