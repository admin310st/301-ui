/**
 * TDS display helpers
 * Computed values and badge rendering for TDS rules
 */

import type { TdsConditions, TdsAction, TdsType, TdsRuleStatus } from '@api/types';

/**
 * Summarize conditions for table display
 * e.g. "RU, BY +3" or "mobile" or "bot: true"
 */
export function getConditionSummary(conditions: TdsConditions): string {
  const parts: string[] = [];

  if (conditions.geo && conditions.geo.length > 0) {
    if (conditions.geo.length <= 2) {
      parts.push(`geo: ${conditions.geo.join(', ')}`);
    } else {
      parts.push(`geo: ${conditions.geo.slice(0, 2).join(', ')} +${conditions.geo.length - 2}`);
    }
  }

  if (conditions.geo_exclude && conditions.geo_exclude.length > 0) {
    parts.push(`!geo: ${conditions.geo_exclude.length}`);
  }

  if (conditions.device && conditions.device.length > 0) {
    parts.push(conditions.device.join(', '));
  }

  if (conditions.os && conditions.os.length > 0) {
    parts.push(`os: ${conditions.os.join(', ')}`);
  }

  if (conditions.browser && conditions.browser.length > 0) {
    parts.push(`browser: ${conditions.browser.join(', ')}`);
  }

  if (conditions.bot === true) {
    parts.push('bot');
  }

  if (conditions.utm_source && conditions.utm_source.length > 0) {
    parts.push(`utm_src: ${conditions.utm_source.length}`);
  }

  if (conditions.utm_campaign && conditions.utm_campaign.length > 0) {
    parts.push(`utm_camp: ${conditions.utm_campaign.length}`);
  }

  if (conditions.path) {
    parts.push(`path: ${conditions.path}`);
  }

  if (conditions.referrer) {
    parts.push(`ref: ${conditions.referrer}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Any';
}

/**
 * Get human-readable action label
 */
export function getActionLabel(action: TdsAction): string {
  const labels: Record<TdsAction, string> = {
    redirect: 'Redirect',
    block: 'Block',
    pass: 'Pass',
    mab_redirect: 'A/B Test',
  };
  return labels[action] || action;
}

/**
 * Render TDS type badge HTML
 */
export function getTypeBadgeHtml(tdsType: TdsType): string {
  if (tdsType === 'traffic_shield') {
    return '<span class="badge badge--sm badge--primary">Shield</span>';
  }
  return '<span class="badge badge--sm badge--info">SmartLink</span>';
}

/**
 * Render status badge HTML
 */
export function getStatusBadgeHtml(status: TdsRuleStatus): string {
  const config: Record<TdsRuleStatus, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'badge--neutral' },
    active: { label: 'Active', cls: 'badge--success' },
    disabled: { label: 'Disabled', cls: 'badge--neutral' },
  };
  const { label, cls } = config[status] || config.draft;
  return `<span class="badge badge--sm ${cls}">${label}</span>`;
}

/**
 * Truncate URL for display
 */
export function truncateUrl(url: string, maxLen: number = 40): string {
  if (!url) return '';
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 1) + '\u2026';
}
