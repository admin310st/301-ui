/**
 * Redirect helpers — computed values from API types
 *
 * Replaces the old adapter.ts by providing lightweight accessors
 * that derive display values from ExtendedRedirectDomain directly.
 */

import type { RedirectRule } from '@api/types';

/**
 * Compute target URL from redirect params based on template.
 *
 * @param domainName - The domain name (e.g. "old-domain.com")
 * @param redirect   - The redirect rule (may be null)
 */
export function getTargetUrl(
  domainName: string,
  redirect: RedirectRule | null,
): string | null {
  if (!redirect) return null;

  const { template_id, params } = redirect;

  // T1, T6, T7: explicit target_url in params
  if (params?.target_url) {
    return params.target_url;
  }

  // T3: non-www → www
  if (template_id === 'T3') {
    return `https://www.${domainName}`;
  }

  // T4: www → non-www
  if (template_id === 'T4') {
    return `https://${domainName.replace(/^www\./, '')}`;
  }

  // T5: path redirect (source → target)
  if (template_id === 'T5' && params?.source_path && params?.target_path) {
    return `${params.source_path} → ${params.target_path}`;
  }

  return null;
}
