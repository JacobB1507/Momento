/**
 * Sentry-style error redaction.
 * Strips PII and secrets from error messages before logging.
 * Use everywhere instead of raw console.error(err).
 */

const REDACT_PATTERNS: Array<[RegExp, string]> = [
  // JWT tokens
  [/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, '[REDACTED_JWT]'],
  // Email addresses
  [/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]'],
  // UUIDs (often user/session IDs)
  [/[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}/gi, '[REDACTED_UUID]'],
  // Phone numbers (loose match)
  [/(\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g, '[REDACTED_PHONE]'],
  // Bearer tokens
  [/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [REDACTED]'],
  // Common credential patterns
  [/(password|passwd|secret|api[_\-]?key|token)["']?\s*[:=]\s*["']?[^\s"',}]+/gi, '$1=[REDACTED]'],
];

export function redact(input: unknown): string {
  let str: string;
  if (input instanceof Error) {
    str = input.name + ': ' + input.message;
  } else if (typeof input === 'string') {
    str = input;
  } else {
    try {
      str = JSON.stringify(input);
    } catch {
      str = String(input);
    }
  }
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    str = str.replace(pattern, replacement);
  }
  return str;
}

/**
 * Drop-in replacement for console.error. Use everywhere in the app.
 */
export function reportError(context: string, err: unknown): void {
  const safe = redact(err);
  if (__DEV__) {
    console.error('[' + context + ']', safe);
  } else {
    // TODO: ship to Sentry here when set up
    console.warn('[' + context + ']', safe);
  }
}

/**
 * Returns a user-safe error message. Hides internal details.
 * Use to display errors in UI alerts.
 */
export function userFacingError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error) {
    if (err.name === 'RateLimitError') return err.message;
    const msg = err.message.toLowerCase();
    if (msg.includes('invalid login')) return 'Incorrect email or password.';
    if (msg.includes('email not confirmed')) return 'Please verify your email before signing in.';
    if (msg.includes('user already registered')) return 'An account with this email already exists.';
    if (msg.includes('rate limit')) return 'Too many attempts. Please wait a few minutes.';
    if (msg.includes('check constraint')) return 'Input is invalid. Please check the field requirements.';
  }
  return fallback;
}
