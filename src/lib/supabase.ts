import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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
