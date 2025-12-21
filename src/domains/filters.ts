/**
 * Domain filtering and search logic
 */

import type { Domain } from './mock-data';
import type { ActiveFilters } from './filters-config';

/**
 * Advanced search syntax parser
 * Supports: status:active, provider:cloudflare, project:name, lang:ru, tld:.io
 */
export function parseSearchQuery(query: string): {
  filters: Partial<ActiveFilters>;
  freeText: string;
} {
  const trimmed = query.trim().toLowerCase();
  const filters: Partial<ActiveFilters> = {};
  let freeText = trimmed;

  // Extract advanced syntax tokens
  const tokens = [
    { pattern: /status:(\w+)/g, key: 'status' as const },
    { pattern: /provider:(\w+)/g, key: 'provider' as const },
    { pattern: /project:(\w+)/g, key: 'project' as const },
    { pattern: /lang:(\w+)/g, key: 'language' as const },
  ];

  tokens.forEach(({ pattern, key }) => {
    const match = pattern.exec(trimmed);
    if (match) {
      filters[key] = match[1];
      freeText = freeText.replace(match[0], '').trim();
    }
  });

  // TLD syntax: .ru, .io, etc.
  const tldMatch = /(\.\w{2,})/.exec(trimmed);
  if (tldMatch && trimmed.startsWith('.')) {
    freeText = freeText.replace(tldMatch[0], '').trim();
  }

  return { filters, freeText };
}

/**
 * Check if domain matches search query
 * Searches across: domain, project_name, tld, provider, language
 */
export function matchesSearch(domain: Domain, query: string): boolean {
  if (!query) return true;

  const { freeText } = parseSearchQuery(query);
  if (!freeText) return true;

  const searchable = [
    domain.domain,
    domain.project_name || '',
    domain.registrar || '',
    domain.cf_account_name || '',
    domain.language_code || '',
    domain.tld || '',
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(freeText);
}

/**
 * Check if domain matches active filters
 */
export function matchesFilters(domain: Domain, filters: ActiveFilters): boolean {
  // Status filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'expiring') {
      // Check if expires within 30 days
      if (!domain.expires_at) return false;
      const daysUntilExpiry = Math.floor(
        (new Date(domain.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry > 30) return false;
    } else if (domain.status !== filters.status) {
      return false;
    }
  }

  // Health filter (multi-select)
  if (filters.health && filters.health.length > 0) {
    const hasMatch = filters.health.some((healthType) => {
      if (healthType === 'ok') {
        return domain.ssl_valid && !domain.dns_issues && !domain.abuse_warnings;
      }
      if (healthType === 'ssl_bad') return !domain.ssl_valid;
      if (healthType === 'dns_bad') return domain.dns_issues;
      if (healthType === 'abuse_bad') return domain.abuse_warnings;
      return false;
    });
    if (!hasMatch) return false;
  }

  // Provider filter
  if (filters.provider && filters.provider !== 'all') {
    const provider = (domain.registrar || '').toLowerCase();
    if (!provider.includes(filters.provider)) return false;
  }

  // Project filter
  if (filters.project && filters.project !== 'all') {
    if (domain.project_name !== filters.project) return false;
  }

  // Language filter
  if (filters.language && filters.language !== 'all') {
    if (domain.language_code !== filters.language) return false;
  }

  // Expiry filter
  if (filters.expiry && filters.expiry !== 'any') {
    if (!domain.expires_at) return false;

    const daysUntilExpiry = Math.floor(
      (new Date(domain.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (filters.expiry === 'expired') {
      if (daysUntilExpiry >= 0) return false;
    } else {
      const maxDays = parseInt(filters.expiry);
      if (daysUntilExpiry > maxDays) return false;
    }
  }

  return true;
}

/**
 * Apply filters and search to domains list
 */
export function filterDomains(
  domains: Domain[],
  filters: ActiveFilters,
  searchQuery: string
): Domain[] {
  return domains.filter((domain) => {
    // First apply advanced search syntax filters
    const { filters: searchFilters } = parseSearchQuery(searchQuery);
    const combinedFilters = { ...filters, ...searchFilters };

    // Check filters
    if (!matchesFilters(domain, combinedFilters)) return false;

    // Check search query
    if (!matchesSearch(domain, searchQuery)) return false;

    return true;
  });
}
