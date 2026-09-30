import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const renderingOnServer = Platform.OS === 'web' && typeof window === 'undefined';
const storage = renderingOnServer
  ? {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }
  : AsyncStorage;

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,   // publishable (anon) key only
  { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

if (!renderingOnServer) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
