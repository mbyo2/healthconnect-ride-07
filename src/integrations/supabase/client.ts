import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// For local development, we'll use the production Supabase URL
// In production, these will be set via environment variables in Netlify
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use Supabase URL and key from environment variables only
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log the environment for debugging
console.log('Running in', isLocalhost ? 'local' : 'production', 'mode');

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Check if storage is available
const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

const storageAvailable = isStorageAvailable();

// Custom storage adapter to handle "insecure operation" errors in production
const customStorageAdapter = {
  getItem: (key: string): string | null => {
    if (!storageAvailable) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      // Silently fail - don't log in production to avoid console spam
      if (isLocalhost) console.warn('Storage access blocked:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Silently fail - don't log in production
      if (isLocalhost) console.warn('Storage write blocked:', error);
    }
  },
  removeItem: (key: string): void => {
    if (!storageAvailable) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Silently fail - don't log in production
      if (isLocalhost) console.warn('Storage removal blocked:', error);
    }
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

// Log the Supabase URL and key prefix for debugging
if (import.meta.env.DEV) {
  console.log('Supabase URL configured:', Boolean(SUPABASE_URL));
  console.log('Supabase Key configured:', Boolean(SUPABASE_ANON_KEY));
}