import { md5 } from '@utils/md5';

/**
 * Generate Gravatar URL from email address
 * Uses MD5 hash of lowercase trimmed email
 */
export function getGravatarUrl(email: string, size = 120): string {
  const normalized = email.toLowerCase().trim();
  const hash = md5(normalized);
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=${size}`;
}
