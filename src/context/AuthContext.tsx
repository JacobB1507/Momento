import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { registerPushNotifications, unregisterPushNotifications } from '../lib/pushNotifications';

const projectRef = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace('https://', '').split('.')[0];
const AUTH_STORAGE_KEY = `sb-${projectRef}-auth-token`;

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  restoringSession: boolean;
  profile: Record<string, any> | null;
  profileReady: boolean;
  profileLoaded: boolean;
  refreshProfile: () => Promise<void>;
  passwordRecoveryRequested: boolean;
  phoneVerificationRequired: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  restoringSession: true,
  profile: null,
  profileReady: false,
  profileLoaded: false,
  refreshProfile: async () => {},
  passwordRecoveryRequested: false,
  phoneVerificationRequired: false,
});

// Returns true if the access token is at or past expiry (30s safety buffer).
function isAccessTokenExpired(session: any): boolean {
  if (!session?.expires_at) return false;
  // expires_at is seconds since epoch
  const nowSec = Math.floor(Date.now() / 1000);
  // Treat anything within 30s of expiry as expired to avoid races
  return nowSec >= (session.expires_at - 30);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoringSession, setRestoringSession] = useState(true);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [passwordRecoveryRequested, setPasswordRecoveryRequested] = useState(false);
  const [phoneVerificationRequired, setPhoneVerificationRequired] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Public API for screens (e.g. WelcomeBeta, ProfilePhotoSetup) to trigger a re-evaluation
  // of the onboarding gate after writing to the profiles table.
  // Uses session from state — always fresh when called from an event handler.
  const refreshProfile = async () => {
    const uid = session?.user?.id;
    if (!uid) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      // .eq() is defense-in-depth: RLS already enforces id = auth.uid(), but
      // explicit scoping ensures we never accidentally fetch another user's row.
      .select('id, username, display_name, avatar_url, welcome_seen, skipped_avatar_setup, bio, phone_verified_at, phone_verify_dismissed_until, contacts_prompt_shown_at, contacts_skipped_at, contacts_modal_shown_at')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('[AuthContext] refreshProfile failed:', error);
    } else {
      setProfile(data);
      setPhoneVerificationRequired(false); // BETA BYPASS — re-enable before public launch
    }
    setProfileReady(true);
    setProfileLoaded(true);
  };

  useEffect(() => {
    let resolved = false;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;

    const resolveRestore = () => {
      if (resolved) return;
      resolved = true;
      setRestoringSession(false);
      if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
    };

    // Inner fetch uses the userId directly from the auth callback — no stale closure risk.
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, welcome_seen, skipped_avatar_setup, bio, phone_verified_at, phone_verify_dismissed_until, contacts_prompt_shown_at, contacts_skipped_at, contacts_modal_shown_at')
        .eq('id', userId)
        .maybeSingle();
      if (!error) {
        setProfile(data);
        setPhoneVerificationRequired(false); // BETA BYPASS — re-enable before public launch
        if (data?.id) {
          registerPushNotifications(data.id).catch(err => console.warn('Push registration failed:', err));
        }
      }
      setProfileReady(true);
      setProfileLoaded(true);
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      if (session) {
        if (isAccessTokenExpired(session)) {
          try {
            const { data: refreshed, error } = await supabase.auth.refreshSession();
            if (error || !refreshed?.session) {
              // Refresh failed — treat as logged out, do not keep stale session.
              setSession(null);
              setProfile(null);
              setProfileReady(true);
              resolveRestore();
              return;
            }
            setSession(refreshed.session);
            resolveRestore();
            fetchProfile(refreshed.session.user.id);
            return;
          } catch {
            setSession(null);
            setProfile(null);
            setProfileReady(true);
            resolveRestore();
            return;
          }
        }
        // Token still valid — existing path.
        resolveRestore();
        fetchProfile(session.user.id);
        return;
      }

      // No live session — check for a stored token to decide whether to grant a grace period.
      // Existence check only; the token value is never read.
      let hasStoredToken = false;
      try {
        hasStoredToken = (await AsyncStorage.getItem(AUTH_STORAGE_KEY)) !== null;
      } catch { /* storage unreadable — treat as no stored session */ }

      if (!hasStoredToken) {
        setProfile(null);
        setProfileReady(true);
        resolveRestore();
        return;
      }

      // Stored token exists but no live session yet (likely cold-start with no network).
      // Wait up to 8 s for onAuthStateChange to deliver a refreshed session.
      restoreTimer = setTimeout(() => {
        setProfile(null);
        setProfileReady(true);
        resolveRestore();
      }, 8000);
    }).catch((err: any) => {
      const isStaleToken =
        err?.message?.includes('Refresh Token Not Found') ||
        err?.code === 'refresh_token_not_found';
      if (!isStaleToken) {
        console.error('[AuthContext] getSession error:', err);
      }
      setSession(null);
      setProfile(null);
      setProfileReady(true);
      resolveRestore();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryRequested(true);
        return;
      }
      setSession(newSession);
      setLoading(false); // idempotent — whichever path resolves first clears loading
      if (newSession) {
        lastUserIdRef.current = newSession.user.id;
        resolveRestore(); // valid session arrived — cancel grace period
        fetchProfile(newSession.user.id);
      } else if (_event === 'SIGNED_OUT') {
        const previousUserId = lastUserIdRef.current;
        if (previousUserId) {
          unregisterPushNotifications(previousUserId).catch(err => console.warn('Push unregister failed:', err));
          lastUserIdRef.current = null;
        }
        // Only clear profile on actual sign-out, not on transient null-session pulses
        setProfile(null);
        setProfileReady(true);
        setProfileLoaded(false);
        setPasswordRecoveryRequested(false);
        setPhoneVerificationRequired(false);
      }
    });

    return () => {
      resolved = true; // prevent state updates after unmount
      subscription.unsubscribe();
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, restoringSession, profile, profileReady, profileLoaded, refreshProfile, passwordRecoveryRequested, phoneVerificationRequired }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
