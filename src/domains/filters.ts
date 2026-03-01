/**
 * Domain filtering and search logic
 */

import type { Domain } from './mock-data';
import type { ActiveFilters } from './filters-config';

/**
 * Advanced search syntax parser
 * Supports: status:active, provider:cloudflare, project:name, role:donor, tld:.io
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
    { pattern: /role:(\w+)/g, key: 'role' as const },
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
 * Searches across: domain, project_name, tld, provider, role
 * Special case: if query starts with '.', search by TLD (.com, .ru, etc.)
 */
export function matchesSearch(domain: Domain, query: string): boolean {
  if (!query) return true;

  const trimmed = query.trim().toLowerCase();

  // TLD search: if query starts with '.', search by extension
  if (trimmed.startsWith('.')) {
    const tldMatch = /^(\.\w{2,})/.exec(trimmed);
    if (tldMatch) {
      const searchTLD = tldMatch[1]; // e.g., '.com', '.ru'
      const domainTLD = domain.domain_name.substring(domain.domain_name.lastIndexOf('.')); // extract TLD from domain
      return domainTLD.toLowerCase() === searchTLD;
    }
  }

  const { freeText } = parseSearchQuery(query);
  if (!freeText) return true;

  const searchable = [
    domain.domain_name,
    domain.project_name || '',
    domain.site_name || '',
    domain.registrar || '',
    domain.role || '',
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(freeText);
}

/**
 * Check if domain matches active filters
 */
export function matchesFilters(domain: Domain, filters: ActiveFilters): boolean {
  // Status filter (active/pending/blocked only)
  if (filters.status && filters.status !== 'all') {
    if (domain.status !== filters.status) return false;
  }

  // Health filter (multi-select)
  // Adapter maps API ok/warning/danger/unknown → UI clean/warning/danger
  if (filters.health && filters.health.length > 0) {
    const hasMatch = filters.health.some((healthType) => {
      if (healthType === 'ok') {
        // All healthy: valid SSL, clean abuse status, no errors
        const isHealthy = domain.abuse_status === 'clean';
        return domain.ssl_status === 'valid' && isHealthy && !domain.has_errors;
      }
      if (healthType === 'ssl_bad') {
        // SSL issues: invalid/error, expiring/pending, or off/none
        return (
          domain.ssl_status === 'invalid' ||
          domain.ssl_status === 'error' ||
          domain.ssl_status === 'expiring' ||
          domain.ssl_status === 'pending' ||
          domain.ssl_status === 'off' ||
          domain.ssl_status === 'none'
        );
      }
      if (healthType === 'dns_bad') {
        // DNS/general errors
        return domain.has_errors;
      }
      if (healthType === 'abuse_bad') {
        // Abuse warnings or danger
        return domain.abuse_status === 'warning' || domain.abuse_status === 'danger';
      }
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

  // Role filter
  if (filters.role && filters.role !== 'all') {
    if (domain.role !== filters.role) return false;
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
