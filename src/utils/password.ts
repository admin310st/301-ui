import { t } from '@i18n';

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return t('auth.password.minLength');
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  if (!hasLower || !hasUpper || !hasDigit) {
    return t('auth.password.requirements');
  }

  return null;
}
