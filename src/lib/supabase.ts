import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const SUPABASE_URL = 'https://gprilxwqzyuxsqcsdtow.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcmlseHdxenl1eHNxY3NkdG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDMyNTYsImV4cCI6MjA5MzUxOTI1Nn0.lo209yHG50yUr71GSQJ55qmcv0P3Zgq6LGgwb0sKGug';

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
