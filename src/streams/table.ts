/**
 * TDS rules table rendering
 * Renders rules into [data-tds-tbody] using innerHTML template literals
 */

import type { TdsRule } from '@api/types';
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
    ? `<span class="badge badge--sm badge--neutral" title="From preset ${rule.preset_id}">${rule.preset_id}</span>`
    : '';

  return `
    <tr data-rule-id="${rule.id}" data-action="edit-rule">
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
        <div class="table-cell-stack">
          <span class="text-sm">${actionLabel}</span>
          ${actionUrl ? `<span class="text-sm text-muted" title="${escapeHtml(rule.logic_json.action_url || '')}">${escapeHtml(actionUrl)}</span>` : ''}
        </div>
      </td>
      <td data-priority="medium" class="text-center">
        <span class="text-sm">${rule.domain_count}</span>
      </td>
      <td data-priority="high">
        ${statusBadge}
      </td>
      <td data-priority="critical">
        <div class="table-actions table-actions--inline">
          <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit-rule" data-rule-id="${rule.id}" title="Edit rule">
            <span class="icon" data-icon="mono/pencil-circle"></span>
          </button>
          <div class="dropdown" data-dropdown>
            <button class="btn-icon btn-icon--sm btn-icon--ghost dropdown__trigger" type="button" aria-haspopup="menu" title="More actions">
              <span class="icon" data-icon="mono/dots-vertical"></span>
            </button>
            <div class="dropdown__menu" role="menu">
              <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete-rule" data-rule-id="${rule.id}">
                <span class="icon" data-icon="mono/delete"></span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
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
