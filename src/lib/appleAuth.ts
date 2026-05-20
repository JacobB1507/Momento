import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const rawNonce =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: any) {
    if (e?.code === 'ERR_CANCELED') return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: e?.message ?? 'Sign in failed' };
  }

  if (!credential.identityToken) {
    return { ok: false, reason: 'no_token' };
  }

  const { givenName, familyName } = credential.fullName ?? {};
  if (givenName || familyName) {
    await AsyncStorage.setItem(
      'pendingAppleName',
      JSON.stringify({ givenName: givenName ?? '', familyName: familyName ?? '' }),
    );
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function takePendingAppleName(): Promise<{ given: string; family: string } | null> {
  try {
    const raw = await AsyncStorage.getItem('pendingAppleName');
    if (!raw) return null;
    await AsyncStorage.removeItem('pendingAppleName');
    const parsed = JSON.parse(raw);
    return { given: parsed.givenName ?? '', family: parsed.familyName ?? '' };
  } catch {
    return null;
  }
}
