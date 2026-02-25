/**
 * TDS display helpers
 * Computed values and badge rendering for TDS rules
 */

import type { TdsConditions, TdsAction, TdsType, TdsRuleStatus } from '@api/types';
import { t } from '@i18n';

/**
 * Summarize conditions for table display
 * e.g. "RU, BY +3" or "mobile" or "bot: true"
 */
export function getConditionSummary(conditions: TdsConditions): string {
  const parts: string[] = [];

  if (conditions.geo && conditions.geo.length > 0) {
    if (conditions.geo.length <= 2) {
      parts.push(`${t('streams.conditions.geo')} ${conditions.geo.join(', ')}`);
    } else {
      parts.push(`${t('streams.conditions.geo')} ${conditions.geo.slice(0, 2).join(', ')} +${conditions.geo.length - 2}`);
    }
  }

  if (conditions.geo_exclude && conditions.geo_exclude.length > 0) {
    parts.push(`${t('streams.conditions.geoExclude')} ${conditions.geo_exclude.length}`);
  }

  if (conditions.device && conditions.device.length > 0) {
    parts.push(conditions.device.join(', '));
  }

  if (conditions.os && conditions.os.length > 0) {
    parts.push(`${t('streams.conditions.os')} ${conditions.os.join(', ')}`);
  }

  if (conditions.browser && conditions.browser.length > 0) {
    parts.push(`${t('streams.conditions.browser')} ${conditions.browser.join(', ')}`);
  }

  if (conditions.bot === true) {
    parts.push(t('streams.conditions.bot'));
  }

  if (conditions.utm_source && conditions.utm_source.length > 0) {
    parts.push(`${t('streams.conditions.utmSource')} ${conditions.utm_source.length}`);
  }

  if (conditions.utm_campaign && conditions.utm_campaign.length > 0) {
    parts.push(`${t('streams.conditions.utmCampaign')} ${conditions.utm_campaign.length}`);
  }

  if (conditions.path) {
    parts.push(`${t('streams.conditions.path')} ${conditions.path}`);
  }

  if (conditions.referrer) {
    parts.push(`${t('streams.conditions.referrer')} ${conditions.referrer}`);
  }

  return parts.length > 0 ? parts.join(' · ') : t('streams.conditions.any');
}

/**
 * Get human-readable action label
 */
export function getActionLabel(action: TdsAction): string {
  const labels: Record<TdsAction, string> = {
    redirect: t('streams.actionTypes.redirect'),
    block: t('streams.actionTypes.block'),
    pass: t('streams.actionTypes.pass'),
    mab_redirect: t('streams.actionTypes.mab_redirect'),
  };
  return labels[action] || action;
}

/**
 * Render TDS type badge HTML
 */
export function getTypeBadgeHtml(tdsType: TdsType): string {
  if (tdsType === 'traffic_shield') {
    return `<span class="badge badge--sm badge--primary">${t('streams.types.traffic_shield')}</span>`;
  }
  return `<span class="badge badge--sm badge--info">${t('streams.types.smartlink')}</span>`;
}

/**
 * Render status badge HTML
 */
export function getStatusBadgeHtml(status: TdsRuleStatus): string {
  const config: Record<TdsRuleStatus, { label: string; cls: string }> = {
    draft: { label: t('streams.status.draft'), cls: 'badge--neutral' },
    active: { label: t('streams.status.active'), cls: 'badge--success' },
    disabled: { label: t('streams.status.disabled'), cls: 'badge--neutral' },
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
