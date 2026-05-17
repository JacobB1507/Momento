import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the access token refreshed whenever the app is foregrounded.
// Without this, currentSession can go stale in the background and storage
// uploads will fall back to the anon key, causing RLS failures.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// supabase-js's _handleTokenChanged only updates Realtime auth, not storage.
// Sync storage headers manually so every request uses the current session token.
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    supabase.storage.setHeader('Authorization', `Bearer ${session.access_token}`);
  } else {
    supabase.storage.setHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
  }
});
