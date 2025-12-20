/**
 * IDN (Internationalized Domain Names) utilities
 *
 * IMPORTANT: These functions are for DISPLAY ONLY.
 * Always store and transmit domains in punycode format.
 */

import punycode from 'punycode.js';

/**
 * Decode punycode domain to Unicode (for display only)
 *
 * @param domain - Domain in punycode format (e.g., "xn--c1ad6a.xn--p1ai")
 * @returns Decoded Unicode domain (e.g., "домен.рф")
 *
 * @example
 * decodeDomain("xn--c1ad6a.xn--p1ai") // "домен.рф"
 * decodeDomain("example.com") // "example.com"
 */
export function decodeDomain(domain: string): string {
  try {
    return punycode.toUnicode(domain);
  } catch {
    // Fallback to original if decoding fails
    return domain;
  }
}

/**
 * Check if domain contains punycode (starts with xn-- or has xn-- TLD)
 *
 * @param domain - Domain to check
 * @returns true if domain contains punycode
 *
 * @example
 * isPunycode("xn--c1ad6a.xn--p1ai") // true
 * isPunycode("example.com") // false
 */
export function isPunycode(domain: string): boolean {
  return domain.includes('xn--');
}

/**
 * Format domain for display: show Unicode + punycode if needed
 *
 * @param domain - Domain in punycode format
 * @param mode - Display mode: 'compact' (badge with tooltip) or 'full' (inline punycode)
 * @returns HTML string with formatted domain
 *
 * @example
 * formatDomainDisplay("xn--c1ad6a.xn--p1ai", "compact")
 * // '<span class="domain-readable">домен.рф</span> <span class="idn-badge" title="xn--c1ad6a.xn--p1ai">...</span>'
 *
 * formatDomainDisplay("xn--c1ad6a.xn--p1ai", "full")
 * // '<span class="domain-readable">домен.рф</span> <span class="domain-punycode">(xn--c1ad6a.xn--p1ai)</span>'
 *
 * formatDomainDisplay("example.com")
 * // '<span class="domain-readable">example.com</span>'
 */
export function formatDomainDisplay(domain: string, mode: 'compact' | 'full' = 'full'): string {
  if (!isPunycode(domain)) {
    return `<span class="domain-readable">${domain}</span>`;
  }

  const decoded = decodeDomain(domain);

  if (mode === 'compact') {
    return `
      <span class="domain-readable">${decoded}</span>
      <span class="idn-badge" title="${domain}">
        <span class="icon" data-icon="mono/idn"></span>
      </span>
    `.trim();
  }

  // Full mode: show punycode inline
  return `
    <span class="domain-readable">${decoded}</span>
    <span class="domain-punycode text-muted text-sm">(${domain})</span>
  `.trim();
}
