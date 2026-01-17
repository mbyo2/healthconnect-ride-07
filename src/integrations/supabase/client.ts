import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '@/utils/storage';

// For local development, we'll use the production Supabase URL
// In production, these will be set via environment variables in Netlify
const getIsLocalhost = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const hostname = window.location?.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};
const isLocalhost = getIsLocalhost();

// Use Supabase URL and key from environment variables only
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log the environment for debugging (development only)
if (import.meta.env.DEV) {
  console.log('Running in', isLocalhost ? 'local' : 'production', 'mode');
}

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Custom storage adapter to handle "insecure operation" errors in production
const customStorageAdapter = {
  getItem: (key: string): string | null => {
    return safeLocalGet(key);
  },
  setItem: (key: string, value: string): void => {
    safeLocalSet(key, value);
  },
  removeItem: (key: string): void => {
    safeLocalRemove(key);
  },
};

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: customStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: isLocalhost, // Enable debug logs in development
    },
    global: {
      headers: {
        'X-Client-Info': 'healthconnect-web/1.0.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
      },
    },
  }
);

// Log the Supabase URL and key prefix for debugging (development only)
if (import.meta.env.DEV) {
  console.log('Supabase URL configured:', Boolean(SUPABASE_URL));
  console.log('Supabase Key configured:', Boolean(SUPABASE_ANON_KEY));
}