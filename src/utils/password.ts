export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Пароль должен быть не короче 8 символов.';
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  if (!hasLower || !hasUpper || !hasDigit) {
    return 'Пароль должен содержать буквы в разных регистрах и хотя бы одну цифру.';
  }

  return null;
}
