import { supabase } from './supabase';

export async function requestPasswordResetOtp(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('request_password_reset_otp', {
    p_email: email.trim(),
  });
  if (error) return { ok: false, error: 'network' };
  return data as { ok: boolean; error?: string };
}

export async function verifyPasswordResetOtp(
  email: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('verify_password_reset_otp', {
    p_email: email.trim(),
    p_code: code.trim(),
  });
  if (error) return { ok: false, error: 'network' };
  return data as { ok: boolean; error?: string };
}

export async function resetPasswordWithOtp(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('reset_password_with_otp', {
    p_email: email.trim(),
    p_code: code.trim(),
    p_new_password: newPassword,
  });
  if (error) return { ok: false, error: 'network' };
  return data as { ok: boolean; error?: string };
}
