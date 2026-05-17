// Password rule: 8+ characters, at least one uppercase, one lowercase, one digit.
export const PASSWORD_RULE = "8+ characters with an uppercase letter, a lowercase letter, and a number";

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  return null;
}

// Simple, conservative email format check. Not a full RFC validator — just catches
// the obvious failures (missing @, missing domain, spaces, etc.).
export function validateEmailFormat(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Please enter your email.";
  if (/\s/.test(trimmed)) return "Email cannot contain spaces.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Please enter a valid email address.";
  return null;
}
