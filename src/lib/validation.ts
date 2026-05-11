const PASSWORD_RULE = '8+ characters, with an uppercase letter and a number';

export function validatePassword(password: string): string | null {
  if (
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) return PASSWORD_RULE;
  return null;
}
