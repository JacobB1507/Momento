export type AuthIdentifier =
  | { type: 'email'; email: string }
  | { type: 'phone'; phone: string }
  | { type: 'invalid'; reason: string };

export function parseAuthIdentifier(input: string): AuthIdentifier {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { type: 'invalid', reason: 'Enter your email or phone' };

  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { type: 'invalid', reason: 'Invalid email format' };
    }
    return { type: 'email', email };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return { type: 'phone', phone: '+1' + digitsOnly };
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return { type: 'phone', phone: '+' + digitsOnly };
  }

  return { type: 'invalid', reason: 'Enter a valid email or 10-digit phone number' };
}
