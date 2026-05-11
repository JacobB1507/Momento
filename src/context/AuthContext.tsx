import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const projectRef = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace('https://', '').split('.')[0];
const AUTH_STORAGE_KEY = `sb-${projectRef}-auth-token`;

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  restoringSession: boolean;
  profile: Record<string, any> | null;
  profileReady: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  restoringSession: true,
  profile: null,
  profileReady: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoringSession, setRestoringSession] = useState(true);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [profileReady, setProfileReady] = useState(false);

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
      .select('id, username, display_name, avatar_url, welcome_seen, skipped_avatar_setup, bio')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('[AuthContext] refreshProfile failed:', error);
    } else {
      setProfile(data);
    }
    setProfileReady(true);
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
        .select('id, username, display_name, avatar_url, welcome_seen, skipped_avatar_setup, bio')
        .eq('id', userId)
        .maybeSingle();
      if (!error) setProfile(data);
      setProfileReady(true);
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      if (session) {
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
      // Wait up to 3 s for onAuthStateChange to deliver a refreshed session.
      restoreTimer = setTimeout(() => {
        setProfile(null);
        setProfileReady(true);
        resolveRestore();
      }, 3000);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false); // idempotent — whichever path resolves first clears loading
      if (newSession) {
        resolveRestore(); // valid session arrived — cancel grace period
        fetchProfile(newSession.user.id);
      } else if (_event === 'SIGNED_OUT') {
        // Only clear profile on actual sign-out, not on transient null-session pulses
        setProfile(null);
        setProfileReady(true);
      }
    });

    return () => {
      resolved = true; // prevent state updates after unmount
      subscription.unsubscribe();
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, restoringSession, profile, profileReady, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
