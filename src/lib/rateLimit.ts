import { supabase } from './supabase';

export type RateLimitAction =
  | 'login_attempt'
  | 'signup_attempt'
  | 'password_reset'
  | 'friend_request'
  | 'message_send'
  | 'comment_send'
  | 'gallery_create'
  | 'photo_upload'
  | 'invite_send'
  | 'otp_send'
  | 'otp_send_hourly'
  | 'otp_verify';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

export const RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  login_attempt:    { maxAttempts: 5,   windowMinutes: 15 },
  signup_attempt:   { maxAttempts: 3,   windowMinutes: 60 },
  password_reset:   { maxAttempts: 3,   windowMinutes: 60 },
  friend_request:   { maxAttempts: 20,  windowMinutes: 60 },
  message_send:     { maxAttempts: 50,  windowMinutes: 1 },
  comment_send:     { maxAttempts: 20,  windowMinutes: 1 },
  gallery_create:   { maxAttempts: 15,  windowMinutes: 60 },
  photo_upload:     { maxAttempts: 400, windowMinutes: 60 },
  invite_send:      { maxAttempts: 10,  windowMinutes: 60 },
  otp_send:         { maxAttempts: 3,   windowMinutes: 15 },
  otp_send_hourly:  { maxAttempts: 5,   windowMinutes: 60 },
  otp_verify:       { maxAttempts: 5,   windowMinutes: 15 },
};

/**
 * Checks if the current user is allowed to perform the given action.
 * Returns true if allowed, false if rate limited.
 *
 * Client-side guard. The DB has stricter BEFORE INSERT triggers as a backstop.
 */
export async function checkRateLimit(action: RateLimitAction): Promise<boolean> {
  const config = RATE_LIMITS[action];
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_action: action,
    p_max_attempts: config.maxAttempts,
    p_window_minutes: config.windowMinutes,
  });

  if (error) {
    // Fail-open on transient DB errors so users aren't blocked.
    console.warn('[rateLimit] check failed for', action, error.message);
    return true;
  }

  return data === true;
}

export class RateLimitError extends Error {
  constructor(public action: RateLimitAction) {
    super('Too many ' + action.replace('_', ' ') + ' attempts. Please wait a few minutes.');
    this.name = 'RateLimitError';
  }
}

/**
 * Wrap any async action with a rate limit check.
 * Throws RateLimitError if blocked.
 */
export async function withRateLimit<T>(
  action: RateLimitAction,
  fn: () => Promise<T>
): Promise<T> {
  const allowed = await checkRateLimit(action);
  if (!allowed) throw new RateLimitError(action);
  return fn();
}

export async function checkPhoneRateLimit(
  phone: string,
  action: 'otp_send' | 'otp_send_hourly',
  maxAttempts: number,
  windowMinutes: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_phone_rate_limit', {
      p_phone: phone,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
    });
    if (error) return true;  // fail-open on RPC error, same pattern as checkRateLimit
    return data === true;
  } catch {
    return true;
  }
}

export async function checkOtpVerifyRateLimit(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_otp_verify_rate_limit', {
      p_max_attempts: RATE_LIMITS.otp_verify.maxAttempts,
      p_window_minutes: RATE_LIMITS.otp_verify.windowMinutes,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}

export async function guardOtpSend(phoneE164: string): Promise<
  { ok: true } | { ok: false; reason: 'user_burst' | 'user_hourly' | 'phone_hourly' }
> {
  const [userBurst, userHourly, phoneHourly] = await Promise.all([
    checkRateLimit('otp_send'),
    checkRateLimit('otp_send_hourly'),
    checkPhoneRateLimit(phoneE164, 'otp_send_hourly', 5, 60),
  ]);
  if (!userBurst) return { ok: false, reason: 'user_burst' };
  if (!userHourly) return { ok: false, reason: 'user_hourly' };
  if (!phoneHourly) return { ok: false, reason: 'phone_hourly' };
  return { ok: true };
}
